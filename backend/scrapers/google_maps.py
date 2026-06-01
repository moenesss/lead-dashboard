"""
scrapers/google_maps.py
------------------------
STRATEGY CHANGE: No more clicking on listing cards.

Old approach (broken):
  - Open Maps search → click each card → Google detects automation → browser killed

New approach:
  1. Open Maps search result page
  2. Scroll and collect all /maps/place/ hrefs (no clicks at all)
  3. Visit each place URL directly in batches of 8
  4. Extract name, phone, address, website, rating
  5. Fresh browser per batch — if one batch gets killed, next batch starts clean
"""

import asyncio
import re
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from playwright.async_api import async_playwright
from database.db import get_connection

SEARCH_QUERIES = [
    "agence marketing Tunis",
    "agence communication Tunis",
    "boite de production Tunis",
    "agence digitale Tunis",
    "agence publicité Tunis",
    "production audiovisuelle Tunis",
    "agence événementielle Tunis",
    "agence créative Tunis",
]

ZONE_KEYWORDS = {
    "Berges du Lac": ["lac", "berges du lac", "les berges", "lac 1", "lac 2"],
    "CUN":           ["centre urbain nord", "cun"],
    "Ennasr":        ["ennasr", "el menzah", "menzah"],
    "Centre Ville":  ["centre ville", "tunis centre", "medina", "jean jaurès", "jean jaures"],
    "La Marsa":      ["la marsa", "marsa"],
    "Ariana":        ["ariana"],
}

BROWSER_ARGS = [
    "--no-sandbox",
    "--disable-blink-features=AutomationControlled",
    "--disable-infobars",
    "--disable-dev-shm-usage",
]

INIT_SCRIPT = """
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3] });
    window.chrome = { runtime: {} };
"""


def clean_text(s):
    if not s:
        return ""
    s = re.sub(r'[\ue000-\uf8ff]', '', s)
    s = re.sub(r'[\r\n\t]+', ' ', s)
    s = re.sub(r' {2,}', ' ', s)
    return s.strip()


def detect_zone(address):
    if not address:
        return "Other"
    addr = address.lower()
    for zone, keywords in ZONE_KEYWORDS.items():
        if any(k in addr for k in keywords):
            return zone
    return "Other"


def detect_category(name):
    n = (name or "").lower()
    if any(k in n for k in ["production", "audiovisuel", "video", "film"]):
        return "Production House"
    if any(k in n for k in ["event", "evenement"]):
        return "Event Agency"
    if any(k in n for k in ["digital", "digitale", "web", "tech"]):
        return "Digital Agency"
    if any(k in n for k in ["communication", "publicite", "pub"]):
        return "Communication Agency"
    return "Marketing Agency"


async def make_browser(p):
    browser = await p.chromium.launch(headless=False, slow_mo=50, args=BROWSER_ARGS)
    context = await browser.new_context(
        locale="fr-FR",
        viewport={"width": 1280, "height": 800},
        user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        extra_http_headers={"Accept-Language": "fr-FR,fr;q=0.9,en;q=0.7"},
    )
    await context.add_init_script(INIT_SCRIPT)
    return browser, context


# ─────────────────────────────────────────
# STEP 1: collect place URLs (no clicks)
# ─────────────────────────────────────────

async def collect_place_urls(query, max_results=20):
    search_url = f"https://www.google.com/maps/search/{query.replace(' ', '+')}"
    urls = []
    print(f"  🔍 Collecting URLs for: {query}")

    try:
        async with async_playwright() as p:
            browser, context = await make_browser(p)
            page = await context.new_page()
            await page.goto(search_url, wait_until="domcontentloaded", timeout=45000)
            await asyncio.sleep(4)

            # Scroll to load more results — no clicking
            for _ in range(10):
                await page.evaluate("""
                    const feed = document.querySelector('[role="feed"]');
                    if (feed) feed.scrollTop += 700;
                    else window.scrollBy(0, 700);
                """)
                await asyncio.sleep(1)

            # Extract all place hrefs using JavaScript — zero interaction
            raw = await page.evaluate("""
                () => {
                    const seen = new Set();
                    const out = [];
                    document.querySelectorAll('a[href*="/maps/place/"]').forEach(a => {
                        const href = a.href.split('?')[0];
                        if (href && href.includes('/maps/place/') && !seen.has(href)) {
                            seen.add(href);
                            out.push(href);
                        }
                    });
                    return out;
                }
            """)
            await browser.close()

            urls = [u for u in raw if len(u) > 40][:max_results]

    except Exception as e:
        print(f"  ❌ URL collection error: {e}")

    print(f"  📋 Got {len(urls)} place URLs")
    return urls


# ─────────────────────────────────────────
# STEP 2: visit each place URL directly
# ─────────────────────────────────────────

async def scrape_place(url, page):
    try:
        await page.goto(url, wait_until="domcontentloaded", timeout=25000)
        await asyncio.sleep(2)
        r = {}

        # Name
        for sel in ['h1.DUwDvf', 'h1[class*="fontHeadlineLarge"]', 'h1']:
            try:
                t = clean_text(await page.locator(sel).first.inner_text(timeout=3000))
                if t:
                    r["name"] = t
                    break
            except Exception:
                continue
        if not r.get("name"):
            return None

        # Address
        try:
            r["address"] = clean_text(await page.locator('[data-item-id="address"]').first.inner_text(timeout=3000))
        except Exception:
            r["address"] = ""

        # Phone
        try:
            r["phone"] = clean_text(await page.locator('[data-item-id^="phone:tel"]').first.inner_text(timeout=3000))
        except Exception:
            r["phone"] = ""

        # Website
        try:
            href = await page.locator('a[data-item-id="authority"]').first.get_attribute("href", timeout=2000) or ""
            website = href.split("?")[0].strip()
            if any(x in website for x in ["facebook.com", "instagram.com", "maps.google"]):
                website = ""
            r["website"] = website
        except Exception:
            r["website"] = ""

        # Rating
        try:
            rt = clean_text(await page.locator('div.F7nice span[aria-hidden="true"]').first.inner_text(timeout=2000)).replace(",", ".")
            r["google_rating"] = float(rt)
        except Exception:
            r["google_rating"] = None

        r["google_maps_url"] = url
        r["zone"]            = detect_zone(r.get("address", ""))
        r["category"]        = detect_category(r.get("name", ""))
        r["source"]          = "google_maps"
        return r

    except Exception as e:
        if "closed" in str(e).lower():
            raise
        return None


async def scrape_one_query(query, max_results=20):
    print(f"\n📍 Query: {query}")
    place_urls = await collect_place_urls(query, max_results)
    if not place_urls:
        return []

    results = []
    batch_size = 8

    for i in range(0, len(place_urls), batch_size):
        batch = place_urls[i:i + batch_size]
        print(f"  📦 Batch {i // batch_size + 1}/{-(-len(place_urls)//batch_size)}: {len(batch)} places")
        try:
            async with async_playwright() as p:
                browser, context = await make_browser(p)
                page = await context.new_page()
                for url in batch:
                    try:
                        data = await scrape_place(url, page)
                        if data:
                            results.append(data)
                            print(f"  ✅ {data['name']} | {data['zone']} | {data.get('phone') or '—'} | {data.get('website') or 'no website'}")
                        await asyncio.sleep(1.5)
                    except Exception as e:
                        if "closed" in str(e).lower():
                            print(f"  ⚠️ Browser killed mid-batch — saved {len(results)} total so far")
                            break
                        continue
                try:
                    await browser.close()
                except Exception:
                    pass
        except Exception as e:
            print(f"  ❌ Batch error: {e}")
        await asyncio.sleep(3)

    print(f"  📊 {len(results)} results for: {query}")
    return results


# ─────────────────────────────────────────
# SAVE TO DB
# ─────────────────────────────────────────

def save_to_db(results, query):
    if not results:
        return {"found": 0, "new": 0, "updated": 0}
    conn = get_connection()
    new_count = updated_count = 0
    log_id = conn.execute(
        "INSERT INTO scraper_logs (scraper_name, status, notes) VALUES ('google_maps', 'running', ?)",
        (f"Query: {query}",)
    ).lastrowid
    conn.commit()

    for r in results:
        try:
            existing = conn.execute("SELECT id FROM agencies WHERE name = ?", (r["name"],)).fetchone()
            if existing:
                conn.execute("""
                             UPDATE agencies SET
                                                 address=COALESCE(?,address), zone=COALESCE(?,zone),
                                                 website=COALESCE(?,website), google_rating=COALESCE(?,google_rating),
                                                 google_maps_url=COALESCE(?,google_maps_url), date_updated=datetime('now')
                             WHERE id=?
                             """, (r.get("address") or None, r.get("zone") or None,
                                   r.get("website") or None, r.get("google_rating"),
                                   r.get("google_maps_url"), existing["id"]))
                if r.get("phone"):
                    conn.execute(
                        "UPDATE contacts SET phone=? WHERE agency_id=? AND (phone IS NULL OR phone='')",
                        (r["phone"], existing["id"])
                    )
                updated_count += 1
            else:
                aid = conn.execute("""
                                   INSERT INTO agencies (name,category,zone,address,website,google_rating,google_maps_url,status,source)
                                   VALUES (?,?,?,?,?,?,?,'prospect','google_maps')
                                   """, (r["name"], r.get("category"), r.get("zone"), r.get("address"),
                                         r.get("website"), r.get("google_rating"), r.get("google_maps_url"))).lastrowid
                conn.execute(
                    "INSERT INTO contacts (agency_id, phone, source) VALUES (?,?,'google_maps')",
                    (aid, r.get("phone") or None)
                )
                new_count += 1
            conn.commit()
        except Exception as e:
            print(f"  ⚠️ DB error for {r.get('name')}: {e}")

    conn.execute(
        "UPDATE scraper_logs SET status='success',finished_at=datetime('now'),records_found=?,records_new=?,records_updated=? WHERE id=?",
        (len(results), new_count, updated_count, log_id)
    )
    conn.commit()
    conn.close()
    return {"found": len(results), "new": new_count, "updated": updated_count}


# ─────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────

async def run_all_queries(max_per_query=15):
    print("\n🗺️  Google Maps Scraper Starting…")
    print("=" * 50)
    total_new = total_updated = 0
    for query in SEARCH_QUERIES:
        try:
            results = await scrape_one_query(query, max_results=max_per_query)
            stats   = save_to_db(results, query)
            total_new     += stats["new"]
            total_updated += stats["updated"]
            print(f"  💾 Saved: {stats['new']} new, {stats['updated']} updated")
            await asyncio.sleep(5)
        except Exception as e:
            print(f"  ❌ Query '{query}' failed: {e}")
            continue
    print("\n" + "=" * 50)
    print(f"✅ Done! Total new: {total_new} | Updated: {total_updated}")
    return {"total_new": total_new, "total_updated": total_updated}


async def run_google_maps_scraper():
    await run_all_queries()


if __name__ == "__main__":
    asyncio.run(run_all_queries())
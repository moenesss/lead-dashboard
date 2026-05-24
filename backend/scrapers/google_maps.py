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
    "Berges du Lac": ["lac", "berges du lac", "les berges", "lac malären", "lac 1", "lac 2"],
    "CUN": ["centre urbain nord", "CUN"],
    "Ennasr": ["ennasr", "el menzah", "menzah"],
    "Centre Ville": ["centre ville", "tunis centre", "medina", "jean jaurès", "jean jaures"],
    "La Marsa": ["la marsa", "marsa"],
    "Ariana": ["ariana"],
}

def clean_text(s: str) -> str:
    """Strip Google Maps UI icons and collapse whitespace into a single clean line."""
    if not s:
        return ""
    # Remove all Unicode private-use area characters (Google Maps icons: 📍\ue0c8, ☎\ue0b0, etc.)
    s = re.sub(r'[\ue000-\uf8ff]', '', s)
    # Collapse newlines and tabs into a single space
    s = re.sub(r'[\r\n\t]+', ' ', s)
    # Collapse multiple spaces
    s = re.sub(r' {2,}', ' ', s)
    return s.strip()

def detect_zone(address: str) -> str:
    if not address:
        return "Other"
    address_lower = address.lower()
    for zone, keywords in ZONE_KEYWORDS.items():
        if any(k.lower() in address_lower for k in keywords):
            return zone
    return "Other"

def detect_category(name: str) -> str:
    name_lower = (name or "").lower()
    if any(k in name_lower for k in ["production", "audiovisuel", "vidéo", "video", "film"]):
        return "Production House"
    if any(k in name_lower for k in ["event", "événement", "evenement"]):
        return "Event Agency"
    if any(k in name_lower for k in ["digital", "digitale", "web", "tech"]):
        return "Digital Agency"
    if any(k in name_lower for k in ["communication", "publicité", "pub"]):
        return "Communication Agency"
    return "Marketing Agency"


async def scrape_query(page, query: str, max_results: int = 20):
    results = []
    search_url = f"https://www.google.com/maps/search/{query.replace(' ', '+')}"
    print(f"  🔍 Loading: {search_url}")

    try:
        await page.goto(search_url, wait_until="domcontentloaded", timeout=60000)
    except Exception as e:
        print(f"  ⚠️ Navigation warning (continuing): {e}")

    await asyncio.sleep(6)

    # Scroll to load more results
    try:
        feed = page.locator('[role="feed"]')
        for _ in range(6):
            await feed.evaluate("el => el.scrollTop += 800")
            await asyncio.sleep(1.5)
    except:
        pass

    items = await page.locator('[role="feed"] > div > div[jsaction]').all()
    print(f"  📦 Found {len(items)} listings")

    for item in items[:max_results]:
        try:
            await item.click()
            await asyncio.sleep(3)

            result = {}

            # Name
            for selector in ['h1.DUwDvf', 'h1[class*="fontHeadlineLarge"]', 'h1']:
                try:
                    el = page.locator(selector).first
                    text = clean_text(await el.inner_text(timeout=3000))
                    if text:
                        result["name"] = text
                        break
                except:
                    continue

            if not result.get("name"):
                continue

            # Address — clean_text strips icons and collapses newlines
            try:
                el = page.locator('[data-item-id="address"]').first
                result["address"] = clean_text(await el.inner_text(timeout=3000))
            except:
                result["address"] = ""

            # Phone — clean_text strips the phone icon character
            try:
                el = page.locator('[data-item-id^="phone:tel"]').first
                result["phone"] = clean_text(await el.inner_text(timeout=3000))
            except:
                result["phone"] = ""

            # Website
            try:
                el = page.locator('a[data-item-id="authority"]').first
                result["website"] = (await el.get_attribute("href", timeout=2000) or "").strip()
                if result["website"] and "?" in result["website"]:
                    result["website"] = result["website"].split("?")[0]
            except:
                result["website"] = ""

            # Rating
            try:
                el = page.locator('div.F7nice span[aria-hidden="true"]').first
                rating_text = clean_text(await el.inner_text(timeout=2000)).replace(",", ".")
                result["google_rating"] = float(rating_text)
            except:
                result["google_rating"] = None

            result["zone"] = detect_zone(result.get("address", ""))
            result["category"] = detect_category(result.get("name", ""))
            result["source"] = "google_maps"

            results.append(result)
            print(f"  ✅ {result['name']} | {result['zone']} | {result.get('phone') or '—'} | {result.get('website') or 'no website'}")

        except Exception as e:
            print(f"  ⚠️ Skipped: {e}")
            continue

    return results


def save_to_db(results: list, query: str) -> dict:
    conn = get_connection()
    new_count = 0
    updated_count = 0

    log_id = conn.execute("""
                          INSERT INTO scraper_logs (scraper_name, status, notes)
                          VALUES ('google_maps', 'running', ?)
                          """, (f"Query: {query}",)).lastrowid
    conn.commit()

    for r in results:
        try:
            existing = conn.execute(
                "SELECT id FROM agencies WHERE name = ?", (r["name"],)
            ).fetchone()

            if existing:
                conn.execute("""
                             UPDATE agencies SET
                                                 address      = COALESCE(?, address),
                                                 zone         = COALESCE(?, zone),
                                                 website      = COALESCE(?, website),
                                                 google_rating = COALESCE(?, google_rating),
                                                 date_updated = datetime('now')
                             WHERE id = ?
                             """, (
                                 r.get("address") or None,
                                 r.get("zone") or None,
                                 r.get("website") or None,
                                 r.get("google_rating"),
                                 existing["id"]
                             ))
                # Also update phone in contacts if we got one
                if r.get("phone"):
                    conn.execute("""
                                 UPDATE contacts SET phone = ? WHERE agency_id = ? AND (phone IS NULL OR phone = '')
                                 """, (r["phone"], existing["id"]))
                updated_count += 1
            else:
                agency_id = conn.execute("""
                                         INSERT INTO agencies
                                             (name, category, zone, address, website, google_rating, status, source)
                                         VALUES (?, ?, ?, ?, ?, ?, 'prospect', 'google_maps')
                                         """, (
                                             r["name"],
                                             r.get("category"),
                                             r.get("zone"),
                                             r.get("address"),
                                             r.get("website"),
                                             r.get("google_rating")
                                         )).lastrowid

                # Always create a contacts row so enrichment can fill email/socials later
                conn.execute("""
                             INSERT INTO contacts (agency_id, phone, source)
                             VALUES (?, ?, 'google_maps')
                             """, (agency_id, r.get("phone") or None))

                new_count += 1

            conn.commit()
        except Exception as e:
            print(f"  ⚠️ DB error for {r.get('name')}: {e}")

    conn.execute("""
                 UPDATE scraper_logs SET
                                         status = 'success', finished_at = datetime('now'),
                                         records_found = ?, records_new = ?, records_updated = ?
                 WHERE id = ?
                 """, (len(results), new_count, updated_count, log_id))
    conn.commit()
    conn.close()
    return {"found": len(results), "new": new_count, "updated": updated_count}


async def run_all_queries(max_per_query: int = 15):
    print("\n🗺️  Google Maps Scraper Starting...")
    print("=" * 50)
    total_new = 0
    total_updated = 0

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False, slow_mo=100)
        context = await browser.new_context(
            locale="fr-FR",
            viewport={"width": 1280, "height": 800},
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        page = await context.new_page()

        for query in SEARCH_QUERIES:
            print(f"\n📍 Query: {query}")
            try:
                results = await scrape_query(page, query, max_results=max_per_query)
                stats = save_to_db(results, query)
                total_new += stats["new"]
                total_updated += stats["updated"]
                print(f"  💾 Saved: {stats['new']} new, {stats['updated']} updated")
                await asyncio.sleep(4)
            except Exception as e:
                print(f"  ❌ Error: {e}")

        await browser.close()

    print("\n" + "=" * 50)
    print(f"✅ Done! Total new: {total_new} | Updated: {total_updated}")
    return {"total_new": total_new, "total_updated": total_updated}


async def run_google_maps_scraper():
    await run_all_queries()


if __name__ == "__main__":
    asyncio.run(run_all_queries())
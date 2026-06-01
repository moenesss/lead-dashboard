"""
scrapers/client_prospector.py
------------------------------
Scrapes premium direct-client businesses from Google Maps (Tunis).
After Google Maps pass → visits each business website to extract:
  - Email address
  - Instagram, Facebook, LinkedIn, TikTok URLs
Results saved to client_prospects table.
"""

import asyncio
import sys
import os
import re
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from playwright.async_api import async_playwright
from database.db import get_connection

# ─────────────────────────────────────────
# REGEX PATTERNS FOR WEBSITE ENRICHMENT
# ─────────────────────────────────────────
EMAIL_PATTERN = re.compile(
    r'[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}'
)
SOCIAL_PATTERNS = {
    "instagram_url": re.compile(r'https?://(?:www\.)?instagram\.com/[a-zA-Z0-9_.]+/?'),
    "facebook_url":  re.compile(r'https?://(?:www\.)?facebook\.com/[a-zA-Z0-9_.]+/?'),
    "linkedin_url":  re.compile(r'https?://(?:www\.)?linkedin\.com/(?:company|in)/[a-zA-Z0-9_\-]+/?'),
    "tiktok_url":    re.compile(r'https?://(?:www\.)?tiktok\.com/@[a-zA-Z0-9_.]+/?'),
}
BLACKLISTED_EMAILS = [
    "example.com", "test.com", "domain.com", "email.com",
    "yourdomain", "yoursite", "sentry", "wix.com",
    "wordpress.com", "cloudflare", "google.com", "schema.org",
    "w3.org", "placeholder", "noreply", "no-reply",
]

def clean_email(email: str):
    email = email.lower().strip()
    if any(b in email for b in BLACKLISTED_EMAILS):
        return None
    if len(email) > 80 or len(email) < 6:
        return None
    return email


# ─────────────────────────────────────────
# QUALITY FILTER
# ─────────────────────────────────────────
PREMIUM_ZONES = [
    "lac", "berges du lac", "les berges", "la marsa", "marsa",
    "gammarth", "sidi bou said", "carthage", "ennasr", "menzah",
    "centre urbain nord", "cun", "ain zaghouan", "soukra",
    "hammamet nord", "yasmine hammamet", "port el kantaoui",
]
CHEAP_KEYWORDS = [
    "fast food", "fastfood", "sandwich", "chawarma", "chaouarma",
    "fricassé", "lablebi", "kafteji", "briik", "brik",
    "snack", "casse-croûte", "casse croûte", "kiosque",
    "populaire", "économique", "pas cher", "bon marché",
    "friterie", "rôtisserie populaire", "gargote",
    "coiffure hommes", "barbier", "bab souika", "bab el khadra",
    "medina tunis", "la goulette populaire",
]
MIN_RATING = 3.8

def detect_zone(address: str) -> str:
    if not address:
        return "Tunis"
    addr_lower = address.lower()
    for zone in PREMIUM_ZONES:
        if zone in addr_lower:
            return zone.title()
    return "Tunis"

def is_quality_business(name: str, address: str, rating) -> tuple:
    name_lower = name.lower()
    addr_lower = (address or "").lower()
    for kw in CHEAP_KEYWORDS:
        if kw in name_lower:
            return False, f"cheap keyword: {kw}"
    if rating is not None and rating < MIN_RATING:
        return False, f"rating too low: {rating}"
    return True, "ok"


# ─────────────────────────────────────────
# DB TABLE
# ─────────────────────────────────────────
def ensure_table():
    conn = get_connection()
    conn.execute("""
                 CREATE TABLE IF NOT EXISTS client_prospects (
                                                                 id              INTEGER PRIMARY KEY AUTOINCREMENT,
                                                                 name            TEXT NOT NULL,
                                                                 category_id     TEXT,
                                                                 zone            TEXT,
                                                                 address         TEXT,
                                                                 phone           TEXT,
                                                                 email           TEXT,
                                                                 website         TEXT,
                                                                 google_maps_url TEXT,
                                                                 google_rating   REAL,
                                                                 instagram_url   TEXT,
                                                                 facebook_url    TEXT,
                                                                 linkedin_url    TEXT,
                                                                 tiktok_url      TEXT,
                                                                 status          TEXT DEFAULT 'prospect',
                                                                 source_query    TEXT,
                                                                 enriched        INTEGER DEFAULT 0,
                                                                 notes           TEXT,
                                                                 created_at      TEXT DEFAULT (datetime('now')),
                                                                 date_updated    TEXT DEFAULT (datetime('now'))
                 )
                 """)
    # Migration safety — add new columns if table already exists
    new_cols = [
        ("email",        "TEXT"),
        ("linkedin_url", "TEXT"),
        ("tiktok_url",   "TEXT"),
        ("enriched",     "INTEGER DEFAULT 0"),
    ]
    for col, typedef in new_cols:
        try:
            conn.execute(f"ALTER TABLE client_prospects ADD COLUMN {col} {typedef}")
        except Exception:
            pass
    conn.commit()
    conn.close()


# ─────────────────────────────────────────
# CATEGORY QUERIES
# ─────────────────────────────────────────
CATEGORY_QUERIES = {
    "restaurants": [
        "restaurant gastronomique Tunis",
        "restaurant haut de gamme Lac Tunis",
        "restaurant La Marsa Tunis",
        "restaurant Gammarth Tunis",
        "brasserie Tunis",
        "restaurant Sidi Bou Said",
    ],
    "cafes": [
        "café haut de gamme Tunis",
        "coffee shop La Marsa",
        "salon de thé Tunis Lac",
        "café Gammarth",
    ],
    "hotels": [
        "hôtel 5 étoiles Tunis",
        "hôtel luxe La Marsa",
        "hôtel boutique Tunis",
        "resort Hammamet",
        "hôtel Gammarth",
    ],
    "event_venues": [
        "salle des fêtes Tunis luxe",
        "espace événementiel Tunis",
        "salle de mariage Tunis",
        "venue événement La Marsa",
    ],
    "fitness": [
        "salle de sport Tunis",
        "gym La Marsa",
        "fitness center Lac Tunis",
        "club de sport Tunis",
    ],
    "beauty": [
        "spa luxe Tunis",
        "salon de beauté haut de gamme Tunis",
        "institut beauté La Marsa",
        "spa La Marsa",
    ],
    "retail": [
        "boutique mode Tunis",
        "showroom luxe Tunis",
        "boutique La Marsa",
        "magasin haut de gamme Tunis",
    ],
    "wedding": [
        "wedding planner Tunis",
        "organisateur mariage luxe Tunis",
        "décoration mariage Tunis",
        "traiteur mariage Tunis",
    ],
    "coworking": [
        "coworking Lac Tunis",
        "espace de travail premium Tunis",
        "coworking La Marsa",
        "business center Tunis",
    ],
    "clinics": [
        "clinique privée Tunis",
        "centre médical Lac Tunis",
        "clinique dentaire haut de gamme Tunis",
        "centre esthétique médical Tunis",
    ],
    "startups": [
        "startup tech Tunis",
        "agence digitale Lac Tunis",
        "startup Lac Tunis",
        "tech company Tunis",
    ],
    "automotive": [
        "concession voiture luxe Tunis",
        "showroom automobile Tunis",
        "agence location voiture luxe Tunis",
    ],
    "architecture": [
        "cabinet architecture Tunis",
        "architecte intérieur Tunis",
        "agence architecture Tunis",
        "designer intérieur Tunis",
    ],
    "sports_clubs": [
        "club de golf Tunis",
        "club de tennis Tunis",
        "club nautique Tunis",
        "club padel Tunis",
    ],
    "cultural_venues": [
        "galerie d'art Tunis",
        "musée Tunis",
        "théâtre privé Tunis",
        "centre culturel Tunis",
    ],
    "patisseries": [
        "pâtisserie haut de gamme Tunis",
        "pâtisserie française Tunis",
        "pâtisserie La Marsa",
        "boulangerie pâtisserie Tunis",
        "salon de thé pâtisserie Tunis",
        "pâtisserie Gammarth",
        "pâtisserie Sidi Bou Said",
        "cake design Tunis",
    ],
    "jewelry": [
        "bijouterie luxe Tunis",
        "joaillerie Tunis",
        "bijouterie or diamant Tunis",
        "bijouterie La Marsa",
        "bijouterie Lac Tunis",
        "bijouterie Gammarth",
        "bijouterie mariage Tunis",
        "horlogerie bijouterie Tunis",
    ],
}


# ─────────────────────────────────────────
# WEBSITE ENRICHMENT (EMAIL + SOCIALS)
# ─────────────────────────────────────────
def extract_from_html(html: str) -> dict:
    """Extract email and social links from raw HTML."""
    data = {
        "email": None,
        "instagram_url": None,
        "facebook_url": None,
        "linkedin_url": None,
        "tiktok_url": None,
    }

    # Email — pick first clean one
    for raw_email in EMAIL_PATTERN.findall(html):
        cleaned = clean_email(raw_email)
        if cleaned:
            data["email"] = cleaned
            break

    # Social media URLs
    for key, pattern in SOCIAL_PATTERNS.items():
        matches = pattern.findall(html)
        for url in matches:
            url = url.rstrip("/")
            skip = ["instagram.com/p/", "facebook.com/sharer", "linkedin.com/shareArticle",
                    "instagram.com/explore", "facebook.com/plugins", "tiktok.com/tag"]
            if not any(s in url for s in skip):
                data[key] = url
                break

    return data


async def enrich_prospect_website(page, website: str) -> dict:
    """Visit business website, try main page then /contact, extract all contact info."""
    if not website:
        return {}
    if not website.startswith("http"):
        website = "https://" + website

    result = {}
    try:
        await page.goto(website, wait_until="domcontentloaded", timeout=18000)
        await asyncio.sleep(1.5)
        html = await page.content()
        data = extract_from_html(html)

        # If no email found, try /contact page
        if not data["email"]:
            for path in ["/contact", "/contact-us", "/contactez-nous", "/nous-contacter", "/a-propos"]:
                try:
                    await page.goto(website.rstrip("/") + path, wait_until="domcontentloaded", timeout=12000)
                    await asyncio.sleep(1)
                    contact_html = await page.content()
                    contact_data = extract_from_html(contact_html)
                    if contact_data["email"]:
                        data["email"] = contact_data["email"]
                    # Merge any social links not found on main page
                    for key in SOCIAL_PATTERNS.keys():
                        if not data[key] and contact_data[key]:
                            data[key] = contact_data[key]
                    if data["email"]:
                        break
                except Exception:
                    continue

        result = data
    except Exception as e:
        print(f"    ⚠️ Website visit failed ({website}): {type(e).__name__}")

    return result


# ─────────────────────────────────────────
# GOOGLE MAPS SCRAPE
# ─────────────────────────────────────────
async def scrape_query(page, query: str, max_results: int = 30) -> list:
    results = []
    skipped_quality = 0
    search_url = f"https://www.google.com/maps/search/{query.replace(' ', '+')}"

    print(f"  🗺 Scraping: {query}")
    try:
        await page.goto(search_url, wait_until="domcontentloaded", timeout=30000)
        await asyncio.sleep(3)
    except Exception as e:
        print(f"  ❌ Could not load map: {e}")
        return results

    # Scroll the results panel
    for _ in range(6):
        try:
            panel = page.locator('div[role="feed"]')
            await panel.evaluate("el => el.scrollBy(0, 800)")
            await asyncio.sleep(1.2)
        except Exception:
            break

    # Collect listing links
    links = await page.locator('a[href*="/maps/place/"]').all()
    urls = []
    for link in links:
        href = await link.get_attribute("href")
        if href and "/maps/place/" in href and href not in urls:
            urls.append(href)
        if len(urls) >= max_results:
            break

    print(f"  📍 Found {len(urls)} listings")

    for url in urls:
        try:
            await page.goto(url, wait_until="domcontentloaded", timeout=20000)
            await asyncio.sleep(2)

            result = {"name": "", "address": "", "phone": "", "website": ""}

            # Name
            try:
                result["name"] = (await page.locator('h1').first.inner_text(timeout=3000)).strip()
            except Exception:
                continue
            if not result["name"]:
                continue

            # Phone
            try:
                phone_el = page.locator('[data-item-id*="phone"]')
                if await phone_el.count() > 0:
                    result["phone"] = (await phone_el.first.get_attribute("data-item-id", timeout=2000) or "").replace("phone:", "").strip()
                    if not result["phone"]:
                        result["phone"] = (await phone_el.first.inner_text(timeout=2000)).strip()
            except Exception:
                pass

            # Address
            try:
                addr_el = page.locator('[data-item-id="address"]')
                if await addr_el.count() > 0:
                    result["address"] = (await addr_el.first.inner_text(timeout=2000)).strip()
            except Exception:
                pass

            # Website
            try:
                web_el = page.locator('a[data-item-id="authority"]')
                if await web_el.count() > 0:
                    result["website"] = (await web_el.first.get_attribute("href", timeout=2000) or "").split("?")[0].strip()
            except Exception:
                pass

            # Rating
            try:
                rating_text = (await page.locator('div.F7nice span[aria-hidden="true"]').first.inner_text(timeout=2000)).strip().replace(",", ".")
                result["google_rating"] = float(rating_text)
            except Exception:
                result["google_rating"] = None

            # Quality filter
            keep, reason = is_quality_business(
                result["name"], result.get("address", ""), result.get("google_rating")
            )
            if not keep:
                skipped_quality += 1
                print(f"  🚫 Skipped (quality): {result['name']} — {reason}")
                continue

            # Social links from Google Maps page itself
            instagram_url = ""
            facebook_url = ""
            try:
                links_on_page = await page.locator('a[href*="instagram.com"], a[href*="facebook.com"]').all()
                for lnk in links_on_page:
                    href = await lnk.get_attribute("href") or ""
                    if "instagram.com" in href and not instagram_url:
                        instagram_url = href.rstrip("/")
                    if "facebook.com" in href and not facebook_url:
                        facebook_url = href.rstrip("/")
            except Exception:
                pass

            result["instagram_url"] = instagram_url
            result["facebook_url"] = facebook_url
            result["linkedin_url"] = ""
            result["tiktok_url"] = ""
            result["email"] = ""
            result["google_maps_url"] = page.url
            result["zone"] = detect_zone(result.get("address", ""))
            result["source_query"] = query

            results.append(result)
            phone_display = result.get("phone") or "—"
            rating_display = result.get("google_rating") or "—"
            print(f"  ✅ {result['name']} | {result['zone']} | 📞{phone_display} | ⭐{rating_display}")

        except Exception as e:
            if "Timeout" not in str(e):
                print(f"  ⚠️ Skipped: {e}")
            continue

    print(f"  📊 Quality filter removed {skipped_quality} low-end businesses")
    return results


# ─────────────────────────────────────────
# WEBSITE ENRICHMENT PASS
# ─────────────────────────────────────────
async def enrich_all_prospects(page) -> dict:
    """
    Visit the website of every un-enriched prospect in the DB
    and fill in email + social media links.
    """
    ensure_table()
    conn = get_connection()
    rows = conn.execute("""
                        SELECT id, name, website
                        FROM client_prospects
                        WHERE (enriched = 0 OR enriched IS NULL)
                          AND website IS NOT NULL AND website != ''
                        ORDER BY created_at DESC
                        """).fetchall()
    conn.close()

    if not rows:
        print("  ℹ️  No prospects need enrichment")
        return {"enriched": 0}

    print(f"\n🔬 Enriching {len(rows)} prospects from their websites…")
    enriched_count = 0

    for row in rows:
        prospect_id = row["id"]
        name = row["name"]
        website = row["website"]

        print(f"  🌐 [{prospect_id}] {name} — {website}")
        enrichment = await enrich_prospect_website(page, website)

        if enrichment:
            conn = get_connection()
            conn.execute("""
                         UPDATE client_prospects SET
                                                     email         = COALESCE(NULLIF(?, ''), email),
                                                     instagram_url = COALESCE(NULLIF(?, ''), instagram_url),
                                                     facebook_url  = COALESCE(NULLIF(?, ''), facebook_url),
                                                     linkedin_url  = COALESCE(NULLIF(?, ''), linkedin_url),
                                                     tiktok_url    = COALESCE(NULLIF(?, ''), tiktok_url),
                                                     enriched      = 1,
                                                     date_updated  = datetime('now')
                         WHERE id = ?
                         """, (
                             enrichment.get("email") or "",
                             enrichment.get("instagram_url") or "",
                             enrichment.get("facebook_url") or "",
                             enrichment.get("linkedin_url") or "",
                             enrichment.get("tiktok_url") or "",
                             prospect_id,
                         ))
            conn.commit()
            conn.close()
            enriched_count += 1

            email_display = enrichment.get("email") or "—"
            ig_display = "✓" if enrichment.get("instagram_url") else "—"
            fb_display = "✓" if enrichment.get("facebook_url") else "—"
            li_display = "✓" if enrichment.get("linkedin_url") else "—"
            print(f"    📧 {email_display} | IG:{ig_display} FB:{fb_display} LI:{li_display}")
        else:
            # Mark as enriched anyway so we don't retry forever
            conn = get_connection()
            conn.execute("UPDATE client_prospects SET enriched=1 WHERE id=?", [prospect_id])
            conn.commit()
            conn.close()

        await asyncio.sleep(1.5)

    print(f"  ✅ Enrichment done: {enriched_count}/{len(rows)} prospects updated")
    return {"enriched": enriched_count}


# ─────────────────────────────────────────
# SAVE TO DB
# ─────────────────────────────────────────
def save_prospects(results: list, category_id: str) -> dict:
    ensure_table()
    conn = get_connection()
    new_count = 0
    updated_count = 0

    for r in results:
        try:
            existing = conn.execute(
                "SELECT id FROM client_prospects WHERE name = ?", (r["name"],)
            ).fetchone()

            if existing:
                conn.execute("""
                             UPDATE client_prospects SET
                                                         address         = COALESCE(NULLIF(?, ''), address),
                                                         zone            = COALESCE(NULLIF(?, ''), zone),
                                                         phone           = COALESCE(NULLIF(?, ''), phone),
                                                         website         = COALESCE(NULLIF(?, ''), website),
                                                         google_maps_url = COALESCE(NULLIF(?, ''), google_maps_url),
                                                         google_rating   = COALESCE(?, google_rating),
                                                         instagram_url   = COALESCE(NULLIF(?, ''), instagram_url),
                                                         facebook_url    = COALESCE(NULLIF(?, ''), facebook_url),
                                                         enriched        = 0,
                                                         date_updated    = datetime('now')
                             WHERE id = ?
                             """, (
                                 r.get("address"), r.get("zone"), r.get("phone"),
                                 r.get("website"), r.get("google_maps_url"), r.get("google_rating"),
                                 r.get("instagram_url"), r.get("facebook_url"),
                                 existing["id"]
                             ))
                updated_count += 1
            else:
                conn.execute("""
                             INSERT INTO client_prospects
                             (name, category_id, zone, address, phone, website,
                              google_maps_url, google_rating, instagram_url, facebook_url,
                              source_query, status, enriched)
                             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'prospect', 0)
                             """, (
                                 r["name"], category_id,
                                 r.get("zone"), r.get("address"), r.get("phone"),
                                 r.get("website"), r.get("google_maps_url"), r.get("google_rating"),
                                 r.get("instagram_url"), r.get("facebook_url"),
                                 r.get("source_query"),
                             ))
                new_count += 1

            conn.commit()
        except Exception as e:
            print(f"  ⚠️ DB error for {r.get('name')}: {e}")

    conn.close()
    print(f"  💾 Saved: {new_count} new, {updated_count} updated")
    return {"new": new_count, "updated": updated_count, "total": len(results)}


# ─────────────────────────────────────────
# MAIN ENTRY POINTS
# ─────────────────────────────────────────
async def scrape_category(category_id: str, max_results: int = 30) -> dict:
    """
    Full pipeline for one category:
    1. Scrape Google Maps
    2. Save to DB
    3. Enrich websites (email + socials) in the same browser session
    """
    queries = CATEGORY_QUERIES.get(category_id)
    if not queries:
        return {"new": 0, "updated": 0, "enriched": 0, "error": f"Unknown category: {category_id}"}

    print(f"\n🎯 Category: {category_id} — {len(queries)} queries")
    total_new = 0
    total_updated = 0

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=False,
            slow_mo=60,
            args=["--no-sandbox", "--disable-blink-features=AutomationControlled"]
        )
        context = await browser.new_context(
            locale="fr-FR",
            viewport={"width": 1280, "height": 800},
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        page = await context.new_page()

        # Step 1 — Google Maps scraping
        for query in queries:
            try:
                results = await scrape_query(page, query, max_results=max_results)
                stats = save_prospects(results, category_id)
                total_new += stats["new"]
                total_updated += stats["updated"]
                await asyncio.sleep(3)
            except Exception as e:
                print(f"  ❌ Query failed: {e}")

        # Step 2 — Website enrichment (email + socials)
        enrich_stats = await enrich_all_prospects(page)

        await browser.close()

    print(f"✅ {category_id} done: {total_new} new, {total_updated} updated, {enrich_stats.get('enriched', 0)} enriched")
    return {
        "new": total_new,
        "updated": total_updated,
        "enriched": enrich_stats.get("enriched", 0),
    }


async def scrape_custom_query(query: str, zone: str = "Tunis", max_results: int = 30) -> dict:
    """Custom user query with enrichment."""
    full_query = f"{query} {zone}" if zone.lower() not in query.lower() else query
    category_id = query.lower().replace(" ", "_")[:30]
    print(f"\n🔍 Custom: {full_query}")

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False, slow_mo=60)
        context = await browser.new_context(
            locale="fr-FR",
            viewport={"width": 1280, "height": 800},
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        page = await context.new_page()
        results = await scrape_query(page, full_query, max_results=max_results)
        save_stats = save_prospects(results, category_id)
        enrich_stats = await enrich_all_prospects(page)
        await browser.close()

    return {**save_stats, "enriched": enrich_stats.get("enriched", 0)}


async def enrich_only() -> dict:
    """Standalone enrichment pass — for already-scraped prospects missing email/socials."""
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False, slow_mo=50)
        context = await browser.new_context(
            locale="fr-FR",
            viewport={"width": 1280, "height": 800},
        )
        page = await context.new_page()
        stats = await enrich_all_prospects(page)
        await browser.close()
    return stats


if __name__ == "__main__":
    cat = sys.argv[1] if len(sys.argv) > 1 else "restaurants"
    if cat == "enrich":
        result = asyncio.run(enrich_only())
    else:
        result = asyncio.run(scrape_category(cat, max_results=20))
    print(f"\n✅ Result: {result}")
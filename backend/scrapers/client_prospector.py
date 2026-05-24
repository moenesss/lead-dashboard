"""
scrapers/client_prospector.py
------------------------------
Google Maps scraper for direct C2C clients.
- Quality filter: skips cheap/low-end businesses
- Extended scraping: more queries per category, more listings
- Saves: name, phone, website, address, zone, rating, instagram, facebook
"""

import asyncio
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from playwright.async_api import async_playwright
from database.db import get_connection

# ─────────────────────────────────────────
# CATEGORY → QUERIES MAP (expanded)
# ─────────────────────────────────────────

CATEGORY_QUERIES = {
    "restaurants": [
        "restaurant gastronomique Tunis",
        "restaurant Les Berges du Lac Tunis",
        "restaurant La Marsa Tunis",
        "restaurant Gammarth Tunis",
        "restaurant Sidi Bou Said Tunis",
        "restaurant haut de gamme Tunis",
        "restaurant Ennasr Tunis",
        "brasserie Tunis",
        "restaurant Carthage Tunis",
        "restaurant rooftop Tunis",
    ],
    "cafes": [
        "café lounge Tunis",
        "coffee shop La Marsa",
        "café rooftop Tunis",
        "café Lac Tunis",
        "café Gammarth",
        "café Sidi Bou Said",
        "café haut de gamme Tunis",
        "café concept Tunis",
    ],
    "hotels": [
        "hôtel 5 étoiles Tunis",
        "hôtel boutique Tunis",
        "hôtel 4 étoiles Tunis",
        "resort Hammamet",
        "hôtel Gammarth",
        "hôtel La Marsa",
        "hôtel Carthage Tunis",
        "hôtel Sousse",
        "resort Sousse",
        "hôtel Monastir",
    ],
    "real_estate": [
        "agence immobilière Lac Tunis",
        "promoteur immobilier Tunis",
        "agence immobilière La Marsa",
        "agence immobilière Ennasr Tunis",
        "agence immobilière Gammarth",
        "immobilier luxe Tunis",
        "promoteur immobilier Sousse",
    ],
    "event_venues": [
        "salle des fêtes haut de gamme Tunis",
        "salle événementielle Lac Tunis",
        "salle de mariage Tunis",
        "espace réceptions Tunis",
        "salle de conférence Tunis",
        "venue événement Tunis",
        "château mariage Tunis",
    ],
    "universities": [
        "université privée Tunis",
        "école supérieure Tunis",
        "institut supérieur Tunis",
        "grande école Tunis",
        "école de commerce Tunis",
        "école ingénieur Tunis",
        "école design Tunis",
    ],
    "location_agencies": [
        "agence événementielle Tunis",
        "location salle haut de gamme Tunis",
        "agence organisation événements Tunis",
        "wedding planner Tunis",
        "organisateur événements corporatifs Tunis",
    ],
    "fitness": [
        "salle de sport haut de gamme Tunis",
        "gym premium Tunis",
        "fitness center Lac Tunis",
        "CrossFit Tunis",
        "studio yoga Tunis",
        "club de sport La Marsa",
        "salle musculation Gammarth",
    ],
    "beauty": [
        "spa luxe Tunis",
        "spa hôtel Tunis",
        "salon de beauté haut de gamme Tunis",
        "institut beauté Lac Tunis",
        "centre spa hammam Tunis",
        "salon coiffure luxe Tunis",
        "beauty center La Marsa",
    ],
    "retail": [
        "showroom luxe Tunis",
        "boutique mode haut de gamme Tunis",
        "concept store Tunis",
        "showroom voiture Tunis",
        "boutique design Tunis",
        "galerie d'art Tunis",
        "jewellery store Tunis",
    ],
    "wedding": [
        "wedding planner Tunis",
        "organisateur mariage luxe Tunis",
        "décoration mariage Tunis",
        "traiteur mariage Tunis",
        "fleuriste mariage Tunis",
        "robe mariée Tunis",
    ],
    "coworking": [
        "coworking Lac Tunis",
        "espace de travail premium Tunis",
        "coworking La Marsa",
        "business center Tunis",
        "espace bureau Tunis",
    ],
    "clinics": [
        "clinique privée Tunis",
        "centre médical Lac Tunis",
        "clinique dentaire haut de gamme Tunis",
        "centre esthétique médical Tunis",
        "clinique ophtalmologie Tunis",
        "clinique La Marsa",
    ],
    "patisseries": [
        "pâtisserie haut de gamme Tunis",
        "pâtisserie française Tunis",
        "pâtisserie La Marsa",
        "boulangerie pâtisserie Tunis",
        "pâtisserie Lac Tunis",
        "salon de thé pâtisserie Tunis",
        "pâtisserie Gammarth",
    ],
    "startups": [
        "startup tech Tunis",
        "startup fintech Tunis",
        "startup innovation Tunis",
        "incubateur startup Tunis",
        "tech company Tunis",
        "agence digitale Lac Tunis",
        "startup Lac Tunis",
    ],
    "automotive": [
        "concession voiture luxe Tunis",
        "showroom automobile Tunis",
        "agence location voiture luxe Tunis",
        "garage premium Tunis",
        "auto moto luxe Tunis",
    ],
    "education_kids": [
        "école internationale Tunis",
        "école privée bilingue Tunis",
        "école Montessori Tunis",
        "crèche haut de gamme Tunis",
        "centre éducatif Tunis",
    ],
    "architecture": [
        "cabinet architecture Tunis",
        "architecte intérieur Tunis",
        "agence architecture Tunis",
        "designer intérieur Tunis",
        "décorateur intérieur Tunis",
    ],
    "sports_clubs": [
        "club de golf Tunis",
        "club de tennis Tunis",
        "club nautique Tunis",
        "club équitation Tunis",
        "club padel Tunis",
        "club sportif La Marsa",
    ],
    "cultural_venues": [
        "galerie d'art Tunis",
        "musée Tunis",
        "théâtre privé Tunis",
        "salle de spectacle Tunis",
        "centre culturel Tunis",
    ],
}

# ─────────────────────────────────────────
# QUALITY FILTER
# ─────────────────────────────────────────

# Premium zones — businesses here are more likely to afford services
PREMIUM_ZONES = [
    "lac", "berges du lac", "les berges", "la marsa", "marsa",
    "gammarth", "sidi bou said", "carthage", "ennasr", "menzah",
    "centre urbain nord", "cun", "ain zaghouan", "soukra",
    "hammamet nord", "yasmine hammamet", "port el kantaoui",
]

# Keywords that strongly suggest cheap/low-end
CHEAP_KEYWORDS = [
    "fast food", "fastfood", "sandwich", "chawarma", "chaouarma",
    "fricassé", "lablebi", "kafteji", "briik", "brik",
    "snack", "casse-croûte", "casse croûte", "kiosque",
    "populaire", "économique", "pas cher", "bon marché",
    "friterie", "rôtisserie populaire", "gargote",
    "coiffure hommes", "barbier", "bab souika", "bab el khadra",
    "medina tunis", "la goulette populaire",
]

# Minimum rating to consider (0 = no filter)
MIN_RATING = 3.8

def is_quality_business(name: str, address: str, rating: float) -> tuple[bool, str]:
    """
    Returns (should_keep, reason).
    Filters out cheap/low-end businesses.
    """
    name_lower = (name or "").lower()
    addr_lower = (address or "").lower()

    # Filter by cheap keywords in name
    for kw in CHEAP_KEYWORDS:
        if kw in name_lower:
            return False, f"cheap keyword: {kw}"

    # Filter by rating (only if rating exists)
    if rating and rating < MIN_RATING:
        return False, f"low rating: {rating}"

    # If no rating AND not in premium zone — skip
    if not rating:
        in_premium = any(z in addr_lower for z in PREMIUM_ZONES)
        if not in_premium:
            return False, "no rating + not premium zone"

    return True, "ok"


# ─────────────────────────────────────────
# ZONE DETECTION
# ─────────────────────────────────────────

ZONE_KEYWORDS = {
    "Lac": ["lac", "berges du lac", "les berges"],
    "CUN": ["centre urbain nord", "cun"],
    "Ennasr": ["ennasr", "el menzah", "menzah"],
    "Centre Ville": ["centre ville", "tunis centre", "medina", "jean jaurès"],
    "La Marsa": ["la marsa", "marsa"],
    "Ariana": ["ariana"],
    "Gammarth": ["gammarth"],
    "Sidi Bou Said": ["sidi bou said", "sidi bousaid"],
    "Carthage": ["carthage"],
    "Hammamet": ["hammamet"],
    "Sousse": ["sousse"],
    "Monastir": ["monastir"],
    "Sfax": ["sfax"],
    "Soukra": ["soukra"],
}

def detect_zone(address: str) -> str:
    if not address:
        return "Tunis"
    addr = address.lower()
    for zone, keywords in ZONE_KEYWORDS.items():
        if any(k in addr for k in keywords):
            return zone
    return "Tunis"


# ─────────────────────────────────────────
# ENSURE TABLE
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
                                                                 website         TEXT,
                                                                 google_maps_url TEXT,
                                                                 google_rating   REAL,
                                                                 instagram_url   TEXT,
                                                                 facebook_url    TEXT,
                                                                 status          TEXT DEFAULT 'prospect',
                                                                 source_query    TEXT,
                                                                 notes           TEXT,
                                                                 created_at      TEXT DEFAULT (datetime('now')),
                                                                 date_updated    TEXT DEFAULT (datetime('now'))
                 )
                 """)
    # Add columns if missing (migration safety)
    for col, typedef in [("instagram_url", "TEXT"), ("facebook_url", "TEXT")]:
        try:
            conn.execute(f"ALTER TABLE client_prospects ADD COLUMN {col} {typedef}")
        except Exception:
            pass
    conn.commit()
    conn.close()


# ─────────────────────────────────────────
# SCRAPE ONE QUERY
# ─────────────────────────────────────────

async def scrape_query(page, query: str, max_results: int = 30) -> list:
    results = []
    search_url = f"https://www.google.com/maps/search/{query.replace(' ', '+')}"
    print(f"  🔍 {query}")

    try:
        await page.goto(search_url, wait_until="domcontentloaded", timeout=60000)
    except Exception as e:
        print(f"  ⚠️ Navigation warning: {e}")

    await asyncio.sleep(6)

    # Scroll feed to load more results
    try:
        feed = page.locator('[role="feed"]')
        for _ in range(12):  # More scrolls = more results
            await feed.evaluate("el => el.scrollTop += 800")
            await asyncio.sleep(1.2)
    except Exception:
        pass

    items = await page.locator('[role="feed"] > div > div[jsaction]').all()
    print(f"  📦 {len(items)} listings found")

    skipped_quality = 0

    for item in items[:max_results]:
        try:
            await item.click()
            await asyncio.sleep(3)

            result = {}

            # Name
            for sel in ['h1.DUwDvf', 'h1[class*="fontHeadlineLarge"]', 'h1']:
                try:
                    text = (await page.locator(sel).first.inner_text(timeout=3000)).strip()
                    if text:
                        result["name"] = text
                        break
                except Exception:
                    continue

            if not result.get("name"):
                continue

            # Address
            try:
                result["address"] = (await page.locator('[data-item-id="address"]').first.inner_text(timeout=3000)).strip()
            except Exception:
                result["address"] = ""

            # Phone
            try:
                result["phone"] = (await page.locator('[data-item-id^="phone:tel"]').first.inner_text(timeout=3000)).strip()
            except Exception:
                result["phone"] = ""

            # Website
            try:
                href = await page.locator('a[data-item-id="authority"]').first.get_attribute("href", timeout=2000) or ""
                result["website"] = href.split("?")[0].strip()
            except Exception:
                result["website"] = ""

            # Rating
            try:
                rating_text = (await page.locator('div.F7nice span[aria-hidden="true"]').first.inner_text(timeout=2000)).strip().replace(",", ".")
                result["google_rating"] = float(rating_text)
            except Exception:
                result["google_rating"] = None

            # ── Quality filter ──────────────────────
            keep, reason = is_quality_business(
                result["name"],
                result.get("address", ""),
                result.get("google_rating")
            )
            if not keep:
                skipped_quality += 1
                print(f"  🚫 Skipped (quality): {result['name']} — {reason}")
                continue

            # Social links
            instagram_url = ""
            facebook_url = ""
            try:
                links = await page.locator('a[href*="instagram.com"], a[href*="facebook.com"]').all()
                for link in links:
                    href = await link.get_attribute("href") or ""
                    if "instagram.com" in href and not instagram_url:
                        instagram_url = href
                    if "facebook.com" in href and not facebook_url:
                        facebook_url = href
            except Exception:
                pass

            result["instagram_url"] = instagram_url
            result["facebook_url"] = facebook_url
            result["google_maps_url"] = page.url
            result["zone"] = detect_zone(result.get("address", ""))
            result["source_query"] = query

            results.append(result)
            print(f"  ✅ {result['name']} | {result['zone']} | 📞{result.get('phone') or '—'} | ⭐{result.get('google_rating') or '—'}")

        except Exception as e:
            if "Timeout" not in str(e):
                print(f"  ⚠️ Skipped: {e}")
            continue

    print(f"  📊 Quality filter removed {skipped_quality} low-end businesses")
    return results


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
                              source_query, status)
                             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'prospect')
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
    """Scrape all queries for a category. Opens its own browser."""
    queries = CATEGORY_QUERIES.get(category_id)
    if not queries:
        return {"new": 0, "updated": 0, "error": f"Unknown category: {category_id}"}

    print(f"\n🎯 Category: {category_id} — {len(queries)} queries, up to {max_results} results each")
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

        for query in queries:  # All queries, no limit
            try:
                results = await scrape_query(page, query, max_results=max_results)
                stats = save_prospects(results, category_id)
                total_new += stats["new"]
                total_updated += stats["updated"]
                await asyncio.sleep(3)
            except Exception as e:
                print(f"  ❌ Query failed: {e}")

        await browser.close()

    print(f"✅ {category_id} done: {total_new} new, {total_updated} updated")
    return {"new": total_new, "updated": total_updated}


async def scrape_custom_query(query: str, zone: str = "Tunis", max_results: int = 30) -> dict:
    """Custom user query."""
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
        await browser.close()

    return save_prospects(results, category_id)


if __name__ == "__main__":
    cat = sys.argv[1] if len(sys.argv) > 1 else "restaurants"
    print(f"\n🎯 Testing: {cat}")
    result = asyncio.run(scrape_category(cat, max_results=20))
    print(f"\n✅ Result: {result}")
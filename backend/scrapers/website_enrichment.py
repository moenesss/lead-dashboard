import asyncio
import sys
import os
import re
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from playwright.async_api import async_playwright
from database.db import get_connection

# ─────────────────────────────────────────
# Regex patterns
# ─────────────────────────────────────────
EMAIL_PATTERN = re.compile(
    r'[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}'
)
PHONE_PATTERN = re.compile(
    r'(?:\+216|00216)?[\s\-]?[2-9]\d[\s\-]?\d{3}[\s\-]?\d{3}'
)
SOCIAL_PATTERNS = {
    "instagram_url": re.compile(r'https?://(?:www\.)?instagram\.com/[a-zA-Z0-9_.]+/?'),
    "facebook_url":  re.compile(r'https?://(?:www\.)?facebook\.com/[a-zA-Z0-9_.]+/?'),
    "linkedin_url":  re.compile(r'https?://(?:www\.)?linkedin\.com/(?:company|in)/[a-zA-Z0-9_\-]+/?'),
    "tiktok_url":    re.compile(r'https?://(?:www\.)?tiktok\.com/@[a-zA-Z0-9_.]+/?'),
    "youtube_url":   re.compile(r'https?://(?:www\.)?youtube\.com/(?:channel|@|c)/[a-zA-Z0-9_\-]+/?'),
}

BLACKLISTED_EMAILS = [
    "example.com", "test.com", "domain.com", "email.com",
    "yourdomain", "yoursite", "sentry", "wix.com",
    "wordpress.com", "cloudflare", "google.com"
]

def clean_email(email: str) -> str | None:
    email = email.lower().strip()
    if any(b in email for b in BLACKLISTED_EMAILS):
        return None
    if len(email) > 80:
        return None
    return email

def clean_phone(phone: str) -> str | None:
    phone = re.sub(r'[\s\-]', '', phone).strip()
    if len(phone) < 8:
        return None
    return phone

def extract_from_html(html: str) -> dict:
    """Extract all contact info from raw HTML."""
    data = {
        "emails": [],
        "phones": [],
        "instagram_url": None,
        "facebook_url": None,
        "linkedin_url": None,
        "tiktok_url": None,
        "youtube_url": None,
    }

    # Emails
    raw_emails = EMAIL_PATTERN.findall(html)
    for e in raw_emails:
        cleaned = clean_email(e)
        if cleaned and cleaned not in data["emails"]:
            data["emails"].append(cleaned)

    # Phones
    raw_phones = PHONE_PATTERN.findall(html)
    for p in raw_phones:
        cleaned = clean_phone(p)
        if cleaned and cleaned not in data["phones"]:
            data["phones"].append(cleaned)

    # Social media
    for key, pattern in SOCIAL_PATTERNS.items():
        matches = pattern.findall(html)
        if matches:
            # Take the first valid match, clean trailing slash
            url = matches[0].rstrip("/")
            # Skip generic/placeholder URLs
            if not any(skip in url for skip in ["instagram.com/p/", "facebook.com/sharer", "linkedin.com/shareArticle"]):
                data[key] = url

    return data


async def enrich_agency(page, agency: dict) -> dict | None:
    """Visit an agency's website and extract contact info."""
    website = agency.get("website", "")
    if not website:
        return None

    # Make sure URL has protocol
    if not website.startswith("http"):
        website = "https://" + website

    print(f"  🌐 Visiting: {website}")

    try:
        await page.goto(website, wait_until="domcontentloaded", timeout=20000)
        await asyncio.sleep(2)

        # Get main page HTML
        html = await page.content()
        data = extract_from_html(html)

        # Also try the contact page if main page has no email
        if not data["emails"]:
            for contact_path in ["/contact", "/contact-us", "/contactez-nous", "/nous-contacter"]:
                try:
                    contact_url = website.rstrip("/") + contact_path
                    await page.goto(contact_url, wait_until="domcontentloaded", timeout=15000)
                    await asyncio.sleep(1.5)
                    contact_html = await page.content()
                    contact_data = extract_from_html(contact_html)
                    if contact_data["emails"]:
                        data["emails"].extend(contact_data["emails"])
                        break
                    # Merge social if not found on main page
                    for key in SOCIAL_PATTERNS.keys():
                        if not data[key] and contact_data[key]:
                            data[key] = contact_data[key]
                except:
                    continue

        return {
            "agency_id": agency["id"],
            "agency_name": agency["name"],
            "email_general": data["emails"][0] if data["emails"] else None,
            "email_secondary": data["emails"][1] if len(data["emails"]) > 1 else None,
            "phone": data["phones"][0] if data["phones"] else None,
            "instagram_url": data["instagram_url"],
            "facebook_url": data["facebook_url"],
            "linkedin_url": data["linkedin_url"],
            "tiktok_url": data["tiktok_url"],
            "youtube_url": data["youtube_url"],
        }

    except Exception as e:
        print(f"  ⚠️ Failed {website}: {type(e).__name__}")
        return None


def save_enrichment(enriched: dict):
    """Save enriched contact data to the database."""
    conn = get_connection()
    agency_id = enriched["agency_id"]

    # Check if contact record exists
    existing_contact = conn.execute(
        "SELECT id FROM contacts WHERE agency_id = ?", (agency_id,)
    ).fetchone()

    if existing_contact:
        # Update existing contact
        conn.execute("""
                     UPDATE contacts SET
                                         email_general       = COALESCE(email_general, ?),
                                         instagram_url       = COALESCE(instagram_url, ?),
                                         facebook_url        = COALESCE(facebook_url, ?),
                                         linkedin_url        = COALESCE(linkedin_url, ?),
                                         tiktok_url          = COALESCE(tiktok_url, ?),
                                         youtube_url         = COALESCE(youtube_url, ?),
                                         phone               = COALESCE(phone, ?),
                                         date_updated        = datetime('now')
                     WHERE agency_id = ?
                     """, (
                         enriched.get("email_general"),
                         enriched.get("instagram_url"),
                         enriched.get("facebook_url"),
                         enriched.get("linkedin_url"),
                         enriched.get("tiktok_url"),
                         enriched.get("youtube_url"),
                         enriched.get("phone"),
                         agency_id
                     ))
    else:
        # Insert new contact
        conn.execute("""
                     INSERT INTO contacts (
                         agency_id, email_general, instagram_url, facebook_url,
                         linkedin_url, tiktok_url, youtube_url, phone, source
                     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'website_enrichment')
                     """, (
                         agency_id,
                         enriched.get("email_general"),
                         enriched.get("instagram_url"),
                         enriched.get("facebook_url"),
                         enriched.get("linkedin_url"),
                         enriched.get("tiktok_url"),
                         enriched.get("youtube_url"),
                         enriched.get("phone"),
                     ))

    conn.commit()
    conn.close()


def get_agencies_to_enrich() -> list:
    """Get all agencies that have a website but need enrichment."""
    conn = get_connection()
    rows = conn.execute("""
                        SELECT a.id, a.name, a.website
                        FROM agencies a
                                 LEFT JOIN contacts c ON c.agency_id = a.id
                        WHERE a.website IS NOT NULL
                          AND a.website != ''
                          AND (c.email_general IS NULL OR c.instagram_url IS NULL)
                        ORDER BY a.id
                        """).fetchall()
    conn.close()
    return [dict(r) for r in rows]


async def run_enrichment():
    agencies = get_agencies_to_enrich()
    print(f"\n🔬 Website Enrichment Starting...")
    print(f"📋 Agencies to enrich: {len(agencies)}")
    print("=" * 50)

    if not agencies:
        print("✅ All agencies already enriched!")
        return

    enriched_count = 0
    failed_count = 0

    # Log start
    conn = get_connection()
    log_id = conn.execute("""
                          INSERT INTO scraper_logs (scraper_name, status, notes)
                          VALUES ('website_enrichment', 'running', ?)
                          """, (f"Enriching {len(agencies)} agencies",)).lastrowid
    conn.commit()
    conn.close()

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)  # headless for enrichment
        context = await browser.new_context(
            viewport={"width": 1280, "height": 800},
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        )
        page = await context.new_page()

        for i, agency in enumerate(agencies, 1):
            print(f"\n[{i}/{len(agencies)}] {agency['name']}")
            result = await enrich_agency(page, agency)

            if result:
                save_enrichment(result)
                found_items = [k for k, v in result.items()
                               if v and k not in ("agency_id", "agency_name")]
                print(f"  ✅ Found: {', '.join(found_items)}")
                enriched_count += 1
            else:
                print(f"  ❌ No data found")
                failed_count += 1

            # Small delay between requests
            await asyncio.sleep(1.5)

        await browser.close()

    # Update log
    conn = get_connection()
    conn.execute("""
                 UPDATE scraper_logs SET
                                         status = 'success', finished_at = datetime('now'),
                                         records_found = ?, records_new = ?
                 WHERE id = ?
                 """, (len(agencies), enriched_count, log_id))
    conn.commit()
    conn.close()

    print("\n" + "=" * 50)
    print(f"✅ Done! Enriched: {enriched_count} | Failed: {failed_count}")


if __name__ == "__main__":
    asyncio.run(run_enrichment())
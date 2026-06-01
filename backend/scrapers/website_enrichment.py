"""
scrapers/website_enrichment.py
--------------------------------
Visits each agency's website and extracts:
  - Email address
  - Phone number
  - Instagram, Facebook, LinkedIn, TikTok, YouTube URLs

Fixes vs old version:
  - get_agencies_to_enrich() now finds ANY agency with a website
    that is missing email OR any social link (not requiring both missing)
  - More contact page paths tried (/equipe, /about, /a-propos, etc.)
  - Broader social regex (catches /pages/ style Facebook URLs)
  - Saves phone to contacts table as well
  - No function name collision with the route layer
"""

import asyncio
import re
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from playwright.async_api import async_playwright
from database.db import get_connection


# ─────────────────────────────────────────
# REGEX PATTERNS
# ─────────────────────────────────────────

EMAIL_PATTERN = re.compile(
    r'[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}'
)
PHONE_PATTERN = re.compile(
    r'(?:\+216|00216)?[\s\-]?[2-9]\d[\s\-]?\d{3}[\s\-]?\d{3}'
)
SOCIAL_PATTERNS = {
    "instagram_url": re.compile(
        r'https?://(?:www\.)?instagram\.com/(?!p/|explore/|reel/|stories/)([a-zA-Z0-9_.]+)/?'
    ),
    "facebook_url": re.compile(
        r'https?://(?:www\.)?facebook\.com/(?!sharer|share|plugins|login|dialog|photo|video|watch|groups|events)([a-zA-Z0-9_.%\-/]+?)(?:\?|$|/(?:about|posts|photos))'
    ),
    "linkedin_url": re.compile(
        r'https?://(?:www\.)?linkedin\.com/(?:company|in)/([a-zA-Z0-9_\-]+)/?'
    ),
    "tiktok_url": re.compile(
        r'https?://(?:www\.)?tiktok\.com/@([a-zA-Z0-9_.]+)/?'
    ),
    "youtube_url": re.compile(
        r'https?://(?:www\.)?youtube\.com/(?:channel/|@|c/)([a-zA-Z0-9_\-]+)/?'
    ),
}

BLACKLISTED_EMAILS = [
    "example.com", "test.com", "domain.com", "email.com",
    "yourdomain", "yoursite", "sentry.io", "wix.com",
    "wordpress.com", "cloudflare.com", "google.com",
    "schema.org", "w3.org", "placeholder", "noreply",
    "no-reply", "support@", "abuse@", "webmaster@",
]

CONTACT_PATHS = [
    "/contact",
    "/contact-us",
    "/contactez-nous",
    "/nous-contacter",
    "/a-propos",
    "/about",
    "/about-us",
    "/equipe",
    "/team",
    "/qui-sommes-nous",
]


# ─────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────

def clean_email(email: str):
    email = email.lower().strip()
    if any(b in email for b in BLACKLISTED_EMAILS):
        return None
    if len(email) > 80 or len(email) < 6:
        return None
    if not re.match(r'^[^@]+@[^@]+\.[^@]+$', email):
        return None
    return email


def clean_phone(phone: str):
    phone = re.sub(r'[\s\-]', '', phone).strip()
    if len(phone) < 8:
        return None
    return phone


def extract_from_html(html: str) -> dict:
    """Extract all contact info from raw HTML."""
    data = {
        "emails":        [],
        "phones":        [],
        "instagram_url": None,
        "facebook_url":  None,
        "linkedin_url":  None,
        "tiktok_url":    None,
        "youtube_url":   None,
    }

    # Emails
    for e in EMAIL_PATTERN.findall(html):
        cleaned = clean_email(e)
        if cleaned and cleaned not in data["emails"]:
            data["emails"].append(cleaned)

    # Phones
    for p in PHONE_PATTERN.findall(html):
        cleaned = clean_phone(p)
        if cleaned and cleaned not in data["phones"]:
            data["phones"].append(cleaned)

    # Social media — take first valid match per platform
    for key, pattern in SOCIAL_PATTERNS.items():
        matches = pattern.findall(html)
        if matches:
            # Reconstruct full URL from the capture group
            base_map = {
                "instagram_url": "https://www.instagram.com/",
                "facebook_url":  "https://www.facebook.com/",
                "linkedin_url":  "https://www.linkedin.com/company/",
                "tiktok_url":    "https://www.tiktok.com/@",
                "youtube_url":   "https://www.youtube.com/@",
            }
            # First find the full URL match instead of group
            full_matches = re.findall(pattern.pattern, html)
            if full_matches:
                url = full_matches[0]
                if isinstance(url, tuple):
                    url = base_map[key] + url[0]
                url = url.rstrip("/")
                # Skip obvious generic/share URLs
                bad = ["sharer", "shareArticle", "login", "dialog", "/p/", "explore"]
                if not any(b in url for b in bad):
                    data[key] = url

    return data


# ─────────────────────────────────────────
# ENRICH ONE AGENCY
# ─────────────────────────────────────────

async def enrich_agency(page, agency: dict) -> dict | None:
    """Visit an agency's website + contact page and extract all contact info."""
    website = (agency.get("website") or "").strip()
    if not website:
        return None
    if not website.startswith("http"):
        website = "https://" + website

    print(f"  🌐 [{agency['id']}] {agency['name']} — {website}")

    try:
        await page.goto(website, wait_until="domcontentloaded", timeout=25000)
        await asyncio.sleep(2)
        html = await page.content()
        data = extract_from_html(html)
    except Exception as e:
        print(f"    ⚠️ Main page failed: {type(e).__name__}")
        return None

    # Try contact + about pages if still missing email or socials
    missing_email   = not data["emails"]
    missing_socials = not any(data[k] for k in ["instagram_url", "facebook_url", "linkedin_url"])

    if missing_email or missing_socials:
        for path in CONTACT_PATHS:
            try:
                url = website.rstrip("/") + path
                await page.goto(url, wait_until="domcontentloaded", timeout=15000)
                await asyncio.sleep(1.2)
                extra_html = await page.content()
                extra = extract_from_html(extra_html)

                if missing_email and extra["emails"]:
                    data["emails"].extend(e for e in extra["emails"] if e not in data["emails"])
                    missing_email = False

                for k in ["instagram_url", "facebook_url", "linkedin_url", "tiktok_url", "youtube_url"]:
                    if not data[k] and extra[k]:
                        data[k] = extra[k]

                # Stop early if we have everything
                if not missing_email and all(data[k] for k in ["instagram_url", "facebook_url"]):
                    break

            except Exception:
                continue

    result = {
        "agency_id":        agency["id"],
        "agency_name":      agency["name"],
        "email_general":    data["emails"][0] if data["emails"] else None,
        "email_secondary":  data["emails"][1] if len(data["emails"]) > 1 else None,
        "phone":            data["phones"][0] if data["phones"] else None,
        "instagram_url":    data["instagram_url"],
        "facebook_url":     data["facebook_url"],
        "linkedin_url":     data["linkedin_url"],
        "tiktok_url":       data["tiktok_url"],
        "youtube_url":      data["youtube_url"],
    }

    found = [k for k, v in result.items() if v and k not in ("agency_id", "agency_name")]
    print(f"    ✅ Found: {', '.join(found) if found else 'nothing'}")
    return result


# ─────────────────────────────────────────
# SAVE ENRICHMENT TO DB
# ─────────────────────────────────────────

def save_enrichment(enriched: dict):
    conn = get_connection()
    agency_id = enriched["agency_id"]

    existing = conn.execute(
        "SELECT id FROM contacts WHERE agency_id = ?", (agency_id,)
    ).fetchone()

    if existing:
        # Always overwrite with new data (use new value OR keep existing if new is NULL)
        conn.execute("""
                     UPDATE contacts SET
                                         email_general  = COALESCE(?, email_general),
                                         instagram_url  = COALESCE(?, instagram_url),
                                         facebook_url   = COALESCE(?, facebook_url),
                                         linkedin_url   = COALESCE(?, linkedin_url),
                                         tiktok_url     = COALESCE(?, tiktok_url),
                                         youtube_url    = COALESCE(?, youtube_url),
                                         phone          = COALESCE(?, phone),
                                         date_updated   = datetime('now')
                     WHERE agency_id = ?
                     """, (
                         enriched.get("email_general"),
                         enriched.get("instagram_url"),
                         enriched.get("facebook_url"),
                         enriched.get("linkedin_url"),
                         enriched.get("tiktok_url"),
                         enriched.get("youtube_url"),
                         enriched.get("phone"),
                         agency_id,
                     ))
    else:
        # Create new contacts row
        conn.execute("""
                     INSERT INTO contacts
                     (agency_id, email_general, instagram_url, facebook_url,
                      linkedin_url, tiktok_url, youtube_url, phone, source)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'website_enrichment')
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


# ─────────────────────────────────────────
# GET AGENCIES THAT NEED ENRICHMENT
# ─────────────────────────────────────────

def get_agencies_to_enrich() -> list:
    """
    Return agencies that have a website but are missing email OR
    any social media link. Previously this required BOTH to be
    missing — now it re-enriches if ANY field is empty.
    """
    conn = get_connection()
    rows = conn.execute("""
                        SELECT DISTINCT a.id, a.name, a.website
                        FROM agencies a
                                 LEFT JOIN contacts c ON c.agency_id = a.id
                        WHERE
                            a.website IS NOT NULL AND a.website != ''
                          AND (
                            c.id IS NULL
                                OR c.email_general    IS NULL OR c.email_general    = ''
                                OR c.instagram_url    IS NULL OR c.instagram_url    = ''
                                OR c.facebook_url     IS NULL OR c.facebook_url     = ''
                            )
                        ORDER BY a.id
                        """).fetchall()
    conn.close()
    return [dict(r) for r in rows]


# ─────────────────────────────────────────
# MAIN ENTRY POINT
# ─────────────────────────────────────────

async def run_enrichment():
    """
    Full enrichment pass — visits every agency website that is
    missing email or social links and fills them in.
    """
    agencies = get_agencies_to_enrich()
    print(f"\n🔬 Website Enrichment Starting…")
    print(f"   Agencies to enrich: {len(agencies)}")
    print("=" * 50)

    if not agencies:
        print("✅ All agencies already have contact data")
        return {"enriched": 0}

    enriched_count = 0
    failed_count   = 0

    # Log start
    conn = get_connection()
    log_id = conn.execute("""
                          INSERT INTO scraper_logs (scraper_name, status, notes)
                          VALUES ('website_enrichment', 'running', ?)
                          """, (f"Enriching {len(agencies)} agencies",)).lastrowid
    conn.commit()
    conn.close()

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=False,   # visible so you can see what's happening
            slow_mo=80,
            args=["--no-sandbox", "--disable-blink-features=AutomationControlled"],
        )
        context = await browser.new_context(
            locale="fr-FR",
            viewport={"width": 1280, "height": 800},
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        )
        page = await context.new_page()

        for i, agency in enumerate(agencies, 1):
            print(f"\n[{i}/{len(agencies)}]")
            result = await enrich_agency(page, agency)
            if result:
                save_enrichment(result)
                enriched_count += 1
            else:
                failed_count += 1
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

    print(f"\n{'='*50}")
    print(f"✅ Enrichment done — {enriched_count} enriched, {failed_count} failed")
    return {"enriched": enriched_count, "failed": failed_count}


if __name__ == "__main__":
    asyncio.run(run_enrichment())
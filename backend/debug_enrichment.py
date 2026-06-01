"""
debug_enrichment.py
--------------------
Run this from the backend/ folder to diagnose enrichment issues:
  python debug_enrichment.py

It will:
1. Show all agencies + their contact rows
2. Try to enrich the first 3 agencies manually
3. Print exactly what HTML it finds and what it extracts
"""

import asyncio
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database.db import get_connection


def show_db_state():
    conn = get_connection()
    print("\n" + "="*60)
    print("DATABASE STATE")
    print("="*60)

    agencies = conn.execute("SELECT id, name, website FROM agencies LIMIT 20").fetchall()
    print(f"\n📊 Agencies in DB: {conn.execute('SELECT COUNT(*) FROM agencies').fetchone()[0]}")
    print(f"📊 Contacts rows: {conn.execute('SELECT COUNT(*) FROM contacts').fetchone()[0]}")
    print(f"📊 Contacts with email: {conn.execute('SELECT COUNT(*) FROM contacts WHERE email_general IS NOT NULL AND email_general != \"\"').fetchone()[0]}")
    print(f"📊 Contacts with instagram: {conn.execute('SELECT COUNT(*) FROM contacts WHERE instagram_url IS NOT NULL AND instagram_url != \"\"').fetchone()[0]}")

    print(f"\n{'ID':<5} {'Name':<40} {'Website':<40} {'Email':<30} {'Instagram'}")
    print("-"*140)
    rows = conn.execute("""
        SELECT a.id, a.name, a.website,
               c.email_general, c.instagram_url, c.phone
        FROM agencies a
        LEFT JOIN contacts c ON c.agency_id = a.id
        LIMIT 20
    """).fetchall()
    for r in rows:
        print(f"{r['id']:<5} {(r['name'] or '')[:39]:<40} {(r['website'] or '')[:39]:<40} {(r['email_general'] or '—'):<30} {r['instagram_url'] or '—'}")

    conn.close()
    return [dict(r) for r in agencies]


async def test_enrich_one(agency_id: int, website: str, name: str):
    """Test enrichment on a single agency and print everything found."""
    from playwright.async_api import async_playwright
    import re

    EMAIL_PATTERN = re.compile(r'[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}')
    SOCIAL = {
        "instagram": re.compile(r'instagram\.com/([a-zA-Z0-9_.]{2,30})'),
        "facebook":  re.compile(r'facebook\.com/([a-zA-Z0-9_.%\-]{2,60})'),
        "linkedin":  re.compile(r'linkedin\.com/company/([a-zA-Z0-9_\-]{2,60})'),
    }
    BAD_EMAILS = ["example", "test", "domain", "sentry", "wix", "wordpress",
                  "cloudflare", "google", "schema", "w3.org", "noreply", "no-reply"]

    if not website:
        print(f"  ⚠️  No website for {name}")
        return

    if not website.startswith("http"):
        website = "https://" + website

    print(f"\n{'='*60}")
    print(f"Testing: {name}")
    print(f"URL: {website}")
    print("="*60)

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False, slow_mo=50)
        context = await browser.new_context(
            locale="fr-FR",
            viewport={"width": 1280, "height": 800},
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        )
        page = await context.new_page()

        pages_to_try = [website, website.rstrip("/") + "/contact", website.rstrip("/") + "/a-propos"]

        for url in pages_to_try:
            try:
                print(f"\n  → Visiting: {url}")
                await page.goto(url, wait_until="domcontentloaded", timeout=20000)
                await asyncio.sleep(2)
                html = await page.content()
                print(f"  → HTML length: {len(html)} chars")

                # Emails
                emails_raw = EMAIL_PATTERN.findall(html)
                emails_clean = [e for e in emails_raw
                                if not any(b in e.lower() for b in BAD_EMAILS)
                                and 6 < len(e) < 80]
                print(f"  📧 Emails found: {emails_clean[:5] or 'none'}")

                # Socials
                for platform, pat in SOCIAL.items():
                    matches = pat.findall(html)
                    valid = [m for m in matches if len(m) > 2 and "sharer" not in m and "p/" not in m]
                    if valid:
                        print(f"  📱 {platform}: {valid[0]}")
                    else:
                        print(f"  📱 {platform}: not found")

                # Check for mailto links directly
                import re as _re
                mailto_links = _re.findall(r'mailto:([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})', html)
                if mailto_links:
                    print(f"  ✉️  mailto links: {mailto_links[:3]}")

                if emails_clean:
                    break  # Found email, no need to try more pages

            except Exception as e:
                print(f"  ❌ Failed: {type(e).__name__}: {e}")

        await browser.close()


async def main():
    agencies = show_db_state()

    # Pick first 3 agencies that have a website
    conn = get_connection()
    to_test = conn.execute("""
        SELECT a.id, a.name, a.website
        FROM agencies a
        WHERE a.website IS NOT NULL AND a.website != ''
        LIMIT 3
    """).fetchall()
    conn.close()

    if not to_test:
        print("\n⚠️  No agencies with websites found in DB!")
        print("   Run the Google Maps scraper first.")
        return

    print(f"\n🔬 Testing enrichment on {len(to_test)} agencies...")

    for row in to_test:
        await test_enrich_one(row["id"], row["website"], row["name"])


if __name__ == "__main__":
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
    asyncio.run(main())

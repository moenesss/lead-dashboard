"""
scrapers/decision_makers.py
-----------------------------
For each agency in the DB that doesn't have a decision maker yet,
this scraper tries to find the real contact person (CEO, Directeur,
Fondateur, etc.) by:

1. Scraping the agency's own website (About / Equipe / Contact pages)
2. Searching LinkedIn for "[agency name] Tunis" and extracting people
3. Searching Google for "[agency name] directeur tunisie"

Results are saved to the `decision_makers` table.
If the table doesn't exist yet, it is created automatically.
"""

import asyncio
import sys
import os
import re
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from playwright.async_api import async_playwright
from database.db import get_connection
from datetime import datetime

LINKEDIN_EMAIL    = "bouslimi.moenes@gmail.com"
LINKEDIN_PASSWORD = "123456moenes"

# Job titles that indicate a decision maker
DECISION_MAKER_TITLES = [
    "directeur", "directrice", "director",
    "fondateur", "fondatrice", "founder", "co-founder", "cofondateur",
    "gérant", "gérante", "manager", "managing",
    "président", "présidente", "president",
    "ceo", "coo", "cmo", "dg", "dga",
    "associé", "associée", "partner",
    "responsable", "head of", "chef de",
    "creative director", "art director",
    "producer", "producteur", "production manager",
]

def is_decision_maker(title_text):
    t = title_text.lower()
    return any(k in t for k in DECISION_MAKER_TITLES)

def clean_name(name):
    # Remove extra whitespace, emoji, weird chars
    name = re.sub(r'[^\w\s\-\.\'\u00C0-\u017E]', '', name)
    name = ' '.join(name.split())
    return name.strip()

def extract_email(text):
    match = re.search(r'[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}', text)
    if match:
        email = match.group().lower()
        if not any(b in email for b in ["example.com", "test.com", "facebook.com", "linkedin.com"]):
            return email
    return ""

def extract_phone(text):
    match = re.search(r'(?:\+216|00216)?[\s\-]?[2-9]\d[\s\-]?\d{3}[\s\-]?\d{3}', text)
    if match:
        return re.sub(r'[\s\-]', '', match.group()).strip()
    return ""


# ─────────────────────────────────────────
# ENSURE TABLE EXISTS
# ─────────────────────────────────────────

def ensure_table():
    conn = get_connection()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS decision_makers (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            agency_id    INTEGER NOT NULL,
            name         TEXT,
            title        TEXT,
            email        TEXT,
            phone        TEXT,
            linkedin_url TEXT,
            source       TEXT,
            notes        TEXT,
            created_at   DATETIME DEFAULT (datetime('now')),
            FOREIGN KEY (agency_id) REFERENCES agencies(id)
        )
    """)
    conn.commit()
    conn.close()


# ─────────────────────────────────────────
# SAVE TO DB
# ─────────────────────────────────────────

def save_decision_maker(agency_id, name, title, email="", phone="", linkedin_url="", source="", notes=""):
    if not name or len(name) < 3:
        return False
    conn = get_connection()
    try:
        # Check if already exists for this agency
        existing = conn.execute(
            "SELECT id FROM decision_makers WHERE agency_id = ? AND name LIKE ?",
            (agency_id, f"%{name[:20]}%")
        ).fetchone()
        if existing:
            conn.close()
            return False

        conn.execute("""
            INSERT INTO decision_makers
                (agency_id, name, title, email, phone, linkedin_url, source, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (agency_id, name[:100], title[:100] if title else "",
              email[:100], phone[:20], linkedin_url[:200], source, notes[:300]))
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        print(f"    ⚠️ DB error: {e}")
        conn.close()
        return False


# ─────────────────────────────────────────
# STRATEGY 1: SCRAPE AGENCY WEBSITE
# ─────────────────────────────────────────

async def scrape_agency_website(page, agency):
    found = []
    website = agency.get("website", "") or ""
    if not website:
        return found

    if not website.startswith("http"):
        website = "https://" + website

    # Pages to check on the website
    paths_to_try = ["", "/about", "/a-propos", "/equipe", "/team",
                    "/contact", "/nous", "/qui-sommes-nous", "/agence"]

    for path in paths_to_try:
        url = website.rstrip("/") + path
        try:
            await page.goto(url, wait_until="domcontentloaded", timeout=15000)
            await asyncio.sleep(2)

            page_text = await page.inner_text("body")

            # Look for name patterns near title keywords
            # Pattern: Title followed by a name, or name followed by title
            patterns = [
                # "Directeur Général : Mohamed Ben Ali"
                r'(?:' + '|'.join(DECISION_MAKER_TITLES) + r')[^\n:]{0,20}[:\-–]\s*([A-ZÀ-Ü][a-zà-ü]+(?:\s+[A-ZÀ-Ü][a-zà-ü]+){1,3})',
                # "Mohamed Ben Ali - Fondateur"
                r'([A-ZÀ-Ü][a-zà-ü]+(?:\s+[A-ZÀ-Ü][a-zà-ü]+){1,3})\s*[\-–|,]\s*(?:' + '|'.join(DECISION_MAKER_TITLES) + r')',
            ]

            for pattern in patterns:
                matches = re.finditer(pattern, page_text, re.IGNORECASE)
                for match in matches:
                    name = clean_name(match.group(1))
                    if len(name) < 5 or len(name) > 50:
                        continue
                    # Find the title near this match
                    context = page_text[max(0, match.start()-80):match.end()+80]
                    title_found = ""
                    for t in DECISION_MAKER_TITLES:
                        if t in context.lower():
                            title_found = t.title()
                            break
                    email = extract_email(context)
                    phone = extract_phone(context)
                    found.append({
                        "name": name,
                        "title": title_found,
                        "email": email,
                        "phone": phone,
                        "source": f"website:{url}",
                    })
                    print(f"    👤 {name} — {title_found} (website)")

            # Also look for structured cards (team sections)
            # Try to find elements with names + titles
            for selector in [
                "[class*='team'] [class*='name']",
                "[class*='equipe'] h3",
                "[class*='member'] h3",
                "[class*='member'] h4",
                "[class*='team'] h3",
                "[class*='team'] h4",
                ".team-member",
                "[class*='staff']",
            ]:
                try:
                    elements = await page.locator(selector).all()
                    for el in elements[:10]:
                        try:
                            text = (await el.inner_text(timeout=1000)).strip()
                            name = clean_name(text)
                            if 3 < len(name) < 50 and name[0].isupper():
                                # Try to get the sibling/nearby title
                                parent_text = ""
                                try:
                                    parent = el.locator("..")
                                    parent_text = (await parent.inner_text(timeout=1000)).strip()
                                except:
                                    pass
                                title_found = ""
                                for t in DECISION_MAKER_TITLES:
                                    if t in (parent_text + " " + text).lower():
                                        title_found = t.title()
                                        break
                                if title_found:
                                    email = extract_email(parent_text)
                                    found.append({
                                        "name": name,
                                        "title": title_found,
                                        "email": email,
                                        "phone": "",
                                        "source": f"website:{url}",
                                    })
                                    print(f"    👤 {name} — {title_found} (team section)")
                        except:
                            continue
                except:
                    continue

            if found:
                break  # Stop checking other pages if we found something

        except Exception:
            continue

    return found


# ─────────────────────────────────────────
# STRATEGY 2: LINKEDIN PEOPLE SEARCH
# ─────────────────────────────────────────

async def search_linkedin_people(page, agency_name, max_results=5):
    found = []
    query = f"{agency_name} Tunis"
    search_url = f"https://www.linkedin.com/search/results/people/?keywords={query.replace(' ', '%20')}&origin=SWITCH_SEARCH_VERTICAL"
    print(f"    🔍 LinkedIn people: {agency_name}")

    try:
        await page.goto(search_url, wait_until="domcontentloaded", timeout=30000)
        await asyncio.sleep(4)

        # Try selectors for people results
        cards = []
        for sel in [
            "li.reusable-search__result-container",
            ".reusable-search__result-container",
            "[data-view-name='search-entity-result-universal-template']",
            "main ul li",
        ]:
            found_cards = await page.locator(sel).all()
            if len(found_cards) >= 1:
                cards = found_cards
                break

        if not cards:
            # Fallback: find profile links
            links = await page.locator("a[href*='linkedin.com/in/']").all()
            for link in links[:max_results]:
                try:
                    href = await link.get_attribute("href", timeout=1000)
                    text = (await link.inner_text(timeout=1000)).strip()
                    if text and len(text) > 3 and href:
                        found.append({
                            "name": clean_name(text),
                            "title": "",
                            "email": "",
                            "phone": "",
                            "linkedin_url": href.split("?")[0],
                            "source": "linkedin_search",
                        })
                        print(f"    👤 {text} (linkedin fallback)")
                except:
                    continue
            return found

        for card in cards[:max_results]:
            try:
                card_text = await card.inner_text()
                if not card_text or len(card_text) < 5:
                    continue

                lines = [l.strip() for l in card_text.split('\n') if l.strip() and len(l.strip()) > 2]
                if not lines:
                    continue

                name = clean_name(lines[0])
                if len(name) < 4 or len(name) > 60:
                    continue

                # Title is usually the second line
                title = ""
                for line in lines[1:4]:
                    if is_decision_maker(line):
                        title = line[:100]
                        break

                if not title:
                    # Check if any line in the card mentions the agency
                    agency_mentioned = any(
                        agency_name.lower()[:10] in line.lower()
                        for line in lines
                    )
                    if not agency_mentioned:
                        continue  # Skip if person doesn't seem related to agency

                # Get LinkedIn URL
                linkedin_url = ""
                try:
                    links = await card.locator("a[href*='/in/']").all()
                    for link in links:
                        href = await link.get_attribute("href", timeout=1000)
                        if href and "/in/" in href:
                            linkedin_url = href.split("?")[0]
                            if not linkedin_url.startswith("http"):
                                linkedin_url = "https://www.linkedin.com" + linkedin_url
                            break
                except:
                    pass

                found.append({
                    "name": name,
                    "title": title,
                    "email": "",
                    "phone": "",
                    "linkedin_url": linkedin_url,
                    "source": "linkedin_search",
                })
                print(f"    👤 {name} — {title or 'no title'} (linkedin)")

            except:
                continue

    except Exception as e:
        print(f"    ⚠️ LinkedIn people error: {e}")

    return found


# ─────────────────────────────────────────
# STRATEGY 3: GOOGLE SEARCH
# ─────────────────────────────────────────

async def search_google(page, agency_name):
    found = []
    query = f'"{agency_name}" directeur OR fondateur OR gérant tunisie'
    url = f"https://www.google.com/search?q={query.replace(' ', '+').replace('\"', '%22')}"
    print(f"    🔍 Google: {agency_name}")

    try:
        await page.goto(url, wait_until="domcontentloaded", timeout=20000)
        await asyncio.sleep(3)

        # Get all text from search results
        results_text = ""
        for sel in ["#search", "#rso", "main"]:
            try:
                el = page.locator(sel).first
                results_text = await el.inner_text(timeout=3000)
                if results_text:
                    break
            except:
                continue

        if not results_text:
            return found

        # Look for name + title patterns in Google snippets
        patterns = [
            r'([A-ZÀ-Ü][a-zà-ü]+(?:\s+[A-ZÀ-Ü][a-zà-ü]+){1,3})\s*[,\-–]\s*(?:' + '|'.join(DECISION_MAKER_TITLES[:10]) + r')',
            r'(?:' + '|'.join(DECISION_MAKER_TITLES[:10]) + r')\s*[:\-–,]\s*([A-ZÀ-Ü][a-zà-ü]+(?:\s+[A-ZÀ-Ü][a-zà-ü]+){1,3})',
        ]

        seen_names = set()
        for pattern in patterns:
            matches = re.finditer(pattern, results_text, re.IGNORECASE)
            for match in matches:
                name = clean_name(match.group(1))
                if len(name) < 5 or len(name) > 50 or name in seen_names:
                    continue
                seen_names.add(name)
                context = results_text[max(0, match.start()-60):match.end()+60]
                title_found = ""
                for t in DECISION_MAKER_TITLES:
                    if t in context.lower():
                        title_found = t.title()
                        break
                found.append({
                    "name": name,
                    "title": title_found,
                    "email": extract_email(context),
                    "phone": extract_phone(context),
                    "linkedin_url": "",
                    "source": "google_search",
                })
                print(f"    👤 {name} — {title_found} (google)")
                if len(found) >= 3:
                    break
            if found:
                break

    except Exception as e:
        print(f"    ⚠️ Google search error: {e}")

    return found


# ─────────────────────────────────────────
# LOGIN TO LINKEDIN
# ─────────────────────────────────────────

async def login_linkedin(page):
    print("  🔐 Logging in to LinkedIn...")
    await page.goto("https://www.linkedin.com/login", wait_until="domcontentloaded", timeout=60000)
    await asyncio.sleep(4)
    try:
        await page.fill('#username', LINKEDIN_EMAIL)
        await asyncio.sleep(1)
        await page.fill('#password', LINKEDIN_PASSWORD)
        await asyncio.sleep(1)
        await page.click('button[type="submit"]')
        await asyncio.sleep(6)
        if "checkpoint" in page.url or "challenge" in page.url:
            print("  ⚠️ Security check — complete it manually, waiting 45s...")
            await asyncio.sleep(45)
        print("  ✅ LinkedIn ready")
        return True
    except Exception as e:
        print(f"  ❌ LinkedIn login error: {e}")
        return False


# ─────────────────────────────────────────
# MAIN RUNNER
# ─────────────────────────────────────────

async def run_decision_makers_scraper(limit=None):
    print("\n🎯 Decision Makers Scraper Starting...")
    print("=" * 55)

    ensure_table()

    # Load agencies that don't have a decision maker yet
    conn = get_connection()
    query = """
        SELECT a.id, a.name, a.website, a.source,
               c.linkedin_url
        FROM agencies a
        LEFT JOIN contacts c ON c.agency_id = a.id
        WHERE a.id NOT IN (
            SELECT DISTINCT agency_id FROM decision_makers
        )
        AND a.name IS NOT NULL
        ORDER BY a.id ASC
    """
    if limit:
        query += f" LIMIT {limit}"
    agencies = [dict(r) for r in conn.execute(query).fetchall()]
    conn.close()

    print(f"  📋 {len(agencies)} agencies without decision makers")

    if not agencies:
        print("  ✅ All agencies already have decision makers!")
        return

    # Log scraper start
    conn = get_connection()
    log_id = conn.execute(
        "INSERT INTO scraper_logs (scraper_name, status, notes) VALUES ('decision_makers', 'running', ?)",
        (f"Searching {len(agencies)} agencies",)
    ).lastrowid
    conn.commit()
    conn.close()

    total_found = 0

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False, slow_mo=60)
        context = await browser.new_context(
            viewport={"width": 1280, "height": 800},
            locale="fr-FR",
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        page = await context.new_page()

        # Login to LinkedIn first
        li_logged_in = await login_linkedin(page)

        print("\n" + "─" * 55)

        for i, agency in enumerate(agencies):
            agency_id = agency["id"]
            agency_name = agency["name"]
            website = agency.get("website", "") or ""
            li_url = agency.get("linkedin_url", "") or ""

            print(f"\n[{i+1}/{len(agencies)}] 🏢 {agency_name}")

            all_found = []

            # Strategy 1: Website
            if website:
                try:
                    website_results = await scrape_agency_website(page, agency)
                    all_found.extend(website_results)
                except Exception as e:
                    print(f"    ⚠️ Website scrape error: {e}")
                await asyncio.sleep(1)

            # Strategy 2: LinkedIn people search
            if li_logged_in:
                try:
                    li_results = await search_linkedin_people(page, agency_name, max_results=3)
                    all_found.extend(li_results)
                except Exception as e:
                    print(f"    ⚠️ LinkedIn error: {e}")
                await asyncio.sleep(3)

            # Strategy 3: Google (only if nothing found yet)
            if not all_found:
                try:
                    google_results = await search_google(page, agency_name)
                    all_found.extend(google_results)
                except Exception as e:
                    print(f"    ⚠️ Google error: {e}")
                await asyncio.sleep(2)

            # Save results
            saved = 0
            for person in all_found:
                ok = save_decision_maker(
                    agency_id=agency_id,
                    name=person.get("name", ""),
                    title=person.get("title", ""),
                    email=person.get("email", ""),
                    phone=person.get("phone", ""),
                    linkedin_url=person.get("linkedin_url", ""),
                    source=person.get("source", ""),
                )
                if ok:
                    saved += 1
                    total_found += 1

            if saved:
                print(f"    💾 {saved} decision maker(s) saved")
            else:
                print(f"    — Nothing found for this agency")

            # Be polite between agencies
            await asyncio.sleep(2)

        await browser.close()

    # Update log
    conn = get_connection()
    conn.execute(
        "UPDATE scraper_logs SET status='success', finished_at=datetime('now'), records_found=?, records_new=? WHERE id=?",
        (total_found, total_found, log_id)
    )
    conn.commit()
    conn.close()

    print("\n" + "=" * 55)
    print(f"✅ Done! Decision makers found: {total_found} across {len(agencies)} agencies")
    print("=" * 55)


if __name__ == "__main__":
    # Pass a limit to test on fewer agencies first, e.g. limit=10
    asyncio.run(run_decision_makers_scraper(limit=None))

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

AGENCY_SEARCHES = [
    "agence marketing Tunis",
    "agence communication Tunis",
    "production audiovisuelle Tunis",
    "agence digitale Tunis",
    "agence evenementielle Tunis",
]

JOB_SEARCHES = [
    "vidéaste Tunis",
    "photographe Tunis",
    "graphiste Tunis",
    "motion designer Tunis",
    "cameraman Tunis",
]


# ─────────────────────────────────────────
# LOGIN
# ─────────────────────────────────────────

async def login_linkedin(page):
    print("  🔐 Logging in to LinkedIn...")
    await page.goto("https://www.linkedin.com/login", wait_until="domcontentloaded", timeout=60000)
    await asyncio.sleep(5)
    try:
        await page.locator('#username').wait_for(timeout=15000)
        await page.fill('#username', LINKEDIN_EMAIL)
        await asyncio.sleep(1)
        await page.fill('#password', LINKEDIN_PASSWORD)
        await asyncio.sleep(1)
        await page.click('button[type="submit"]')
        await asyncio.sleep(6)

        if "feed" in page.url or "mynetwork" in page.url or "jobs" in page.url:
            print("  ✅ LinkedIn login successful")
            return True
        elif "checkpoint" in page.url or "challenge" in page.url:
            print("  ⚠️ Security check — complete it manually in the browser window, waiting 45s...")
            await asyncio.sleep(45)
            return True
        else:
            print(f"  ⚠️ Current URL: {page.url} — continuing anyway")
            await asyncio.sleep(5)
            return True
    except Exception as e:
        print(f"  ❌ Login error: {e}")
        return False


# ─────────────────────────────────────────
# COMPANY SEARCH — FIXED
# ─────────────────────────────────────────

async def scrape_company_search(page, query, max_results=10):
    results = []

    # LinkedIn company search URL
    search_url = f"https://www.linkedin.com/search/results/companies/?keywords={query.replace(' ', '%20')}&origin=SWITCH_SEARCH_VERTICAL"
    print(f"\n  🔍 Companies: {query}")

    try:
        await page.goto(search_url, wait_until="domcontentloaded", timeout=30000)
        await asyncio.sleep(6)

        # Scroll a bit to trigger lazy load
        for _ in range(3):
            await page.evaluate("window.scrollBy(0, 500)")
            await asyncio.sleep(1.5)

        # ── Selector strategy: broad → specific ──
        # LinkedIn changes selectors often — we try many options
        cards = []
        selectors_to_try = [
            # 2024/2025 LinkedIn selectors
            "li.reusable-search__result-container",
            ".reusable-search__result-container",
            "[data-view-name='search-entity-result-universal-template']",
            "ul.reusable-search__entity-result-list li",
            ".search-results-container ul li",
            ".scaffold-layout__list-container li",
            "[class*='search-result']",
            "[class*='entity-result']",
            "main ul li",
        ]

        for sel in selectors_to_try:
            found = await page.locator(sel).all()
            if len(found) >= 1:
                cards = found
                print(f"  📦 {len(cards)} cards with selector: {sel}")
                break

        if not cards:
            print("  ⚠️ No cards found — dumping page links as fallback")
            # Fallback: find all company links directly
            company_links = await page.locator("a[href*='linkedin.com/company/']").all()
            print(f"  📦 {len(company_links)} company links found")

            seen = set()
            for link in company_links[:max_results]:
                try:
                    href = await link.get_attribute("href", timeout=1000)
                    name = (await link.inner_text(timeout=1000)).strip()
                    if not href or not name or len(name) < 2:
                        continue
                    clean_url = href.split("?")[0].rstrip("/")
                    if clean_url in seen:
                        continue
                    seen.add(clean_url)
                    results.append({
                        "name": name[:80],
                        "linkedin_url": clean_url,
                        "description": "",
                        "linkedin_followers": None,
                        "source": "linkedin",
                    })
                    print(f"  ✅ {name[:60]}")
                except:
                    continue
            return results

        # ── Parse each card ──
        seen = set()
        for card in cards[:max_results]:
            try:
                card_text = await card.inner_text()
                if not card_text or len(card_text) < 3:
                    continue

                name = ""
                linkedin_url = ""

                # Try to find company link first
                links = await card.locator("a[href*='linkedin.com/company/'], a[href*='/company/']").all()
                for link in links:
                    try:
                        href = await link.get_attribute("href", timeout=1000)
                        text = (await link.inner_text(timeout=1000)).strip()
                        if href and text and len(text) > 1:
                            name = text[:80]
                            linkedin_url = href.split("?")[0].rstrip("/")
                            if not linkedin_url.startswith("http"):
                                linkedin_url = "https://www.linkedin.com" + linkedin_url
                            break
                    except:
                        continue

                # If no company link found, try span/div with the name
                if not name:
                    for sel in [
                        "[class*='entity-result__title-text'] a",
                        "[class*='app-aware-link']",
                        "span[aria-hidden='true']",
                        ".entity-result__title-text",
                        "span.t-16",
                        "a span",
                    ]:
                        try:
                            el = card.locator(sel).first
                            t = (await el.inner_text(timeout=1000)).strip()
                            if t and len(t) > 2 and len(t) < 100:
                                name = t
                                break
                        except:
                            continue

                # Last resort: first non-empty line
                if not name:
                    lines = [l.strip() for l in card_text.split('\n') if l.strip() and len(l.strip()) > 2]
                    name = lines[0][:80] if lines else ""

                if not name:
                    continue

                # Skip duplicate URLs
                key = linkedin_url or name
                if key in seen:
                    continue
                seen.add(key)

                # Extract follower count
                followers = None
                match = re.search(r'([\d,\.]+)\s*[Kk]?\s*(?:followers|abonnés|suiveurs)', card_text, re.IGNORECASE)
                if match:
                    num_str = match.group(1).replace(",", "").replace(".", "")
                    try:
                        num = int(num_str)
                        if 'k' in match.group(0).lower() or 'K' in match.group(0):
                            num *= 1000
                        followers = num
                    except:
                        pass

                # Extract description / industry
                description = ""
                for sel in ["[class*='subline']", "[class*='entity-result__summary']", ".entity-result__summary"]:
                    try:
                        el = card.locator(sel).first
                        t = (await el.inner_text(timeout=1000)).strip()
                        if t:
                            description = t[:200]
                            break
                    except:
                        continue

                results.append({
                    "name": name,
                    "linkedin_url": linkedin_url,
                    "description": description or card_text[:200],
                    "linkedin_followers": followers,
                    "source": "linkedin",
                })
                print(f"  ✅ {name}" + (f" ({followers} followers)" if followers else ""))

            except:
                continue

    except Exception as e:
        print(f"  ❌ Error scraping companies for '{query}': {e}")

    print(f"  📊 Found {len(results)} companies for: {query}")
    return results


# ─────────────────────────────────────────
# JOB SEARCH
# ─────────────────────────────────────────

async def scrape_job_search(page, query, max_results=15):
    results = []
    search_url = f"https://www.linkedin.com/jobs/search/?keywords={query.replace(' ', '%20')}&location=Tunisie&f_TPR=r604800"
    print(f"\n  🔍 Jobs: {query}")

    try:
        await page.goto(search_url, wait_until="domcontentloaded", timeout=30000)
        await asyncio.sleep(5)

        # Scroll to load more
        for _ in range(3):
            await page.evaluate("window.scrollBy(0, 700)")
            await asyncio.sleep(1.5)

        cards = []
        for sel in [
            ".jobs-search__results-list li",
            ".scaffold-layout__list-container li",
            "[data-job-id]",
            ".job-card-container",
            "ul.jobs-search__results-list > li",
            ".jobs-search-results__list li",
            "main li",
        ]:
            found = await page.locator(sel).all()
            if len(found) > 1:
                cards = found
                print(f"  📦 {len(cards)} jobs with selector: {sel}")
                break

        if not cards:
            print("  ⚠️ No job cards found")
            return results

        seen_urls = set()
        for card in cards[:max_results]:
            try:
                card_text = await card.inner_text()
                if not card_text or len(card_text) < 10:
                    continue

                lines = [l.strip() for l in card_text.split('\n') if l.strip() and len(l.strip()) > 5]
                title = lines[0][:120] if lines else ""
                company = lines[1][:80] if len(lines) > 1 else ""

                if not title:
                    continue

                # Get job URL
                job_url = ""
                try:
                    links = await card.locator("a").all()
                    for link in links:
                        href = await link.get_attribute("href", timeout=1000)
                        if href and ("jobs/view" in href or "jobs/collections" in href):
                            job_url = href.split("?")[0]
                            if not job_url.startswith("http"):
                                job_url = "https://www.linkedin.com" + job_url
                            break
                except:
                    pass

                if not job_url:
                    job_url = f"linkedin_job_{hash(title + company)}"

                if job_url in seen_urls:
                    continue
                seen_urls.add(job_url)

                results.append({
                    "title": title,
                    "description": f"{company}\n{card_text[:400]}" if company else card_text[:400],
                    "platform": "linkedin",
                    "url": job_url,
                    "category": "mixed",
                    "type": "full-time",
                    "client_name": company,
                    "budget_min": None,
                    "budget_max": None,
                    "budget_currency": "TND",
                    "posted_date": datetime.now().strftime("%Y-%m-%d"),
                    "status": "new",
                })
                print(f"  ✅ {title[:60]}" + (f" @ {company[:30]}" if company else ""))

            except:
                continue

    except Exception as e:
        print(f"  ❌ Error scraping jobs for '{query}': {e}")

    return results


# ─────────────────────────────────────────
# DATABASE
# ─────────────────────────────────────────

def save_linkedin_companies(results):
    conn = get_connection()
    new_count = 0
    updated_count = 0

    for r in results:
        try:
            existing = conn.execute(
                "SELECT id FROM agencies WHERE name LIKE ?",
                (f"%{r['name'][:15]}%",)
            ).fetchone()

            if existing:
                agency_id = existing["id"]
                contact = conn.execute(
                    "SELECT id FROM contacts WHERE agency_id = ?", (agency_id,)
                ).fetchone()
                if contact:
                    conn.execute(
                        "UPDATE contacts SET linkedin_url = COALESCE(linkedin_url, ?) WHERE agency_id = ?",
                        (r.get("linkedin_url"), agency_id)
                    )
                else:
                    conn.execute(
                        "INSERT INTO contacts (agency_id, linkedin_url, source) VALUES (?, ?, 'linkedin')",
                        (agency_id, r.get("linkedin_url"))
                    )
                updated_count += 1
            else:
                agency_id = conn.execute(
                    "INSERT INTO agencies (name, description, status, source) VALUES (?, ?, 'active', 'linkedin')",
                    (r["name"], r.get("description", ""))
                ).lastrowid
                if r.get("linkedin_url"):
                    conn.execute(
                        "INSERT INTO contacts (agency_id, linkedin_url, source) VALUES (?, ?, 'linkedin')",
                        (agency_id, r["linkedin_url"])
                    )
                new_count += 1

            conn.commit()
        except Exception as e:
            print(f"  ⚠️ DB error: {e}")

    conn.close()
    return {"new": new_count, "updated": updated_count}


def save_linkedin_jobs(results):
    conn = get_connection()
    new_count = 0

    for r in results:
        try:
            existing = conn.execute(
                "SELECT id FROM opportunities WHERE url = ?", (r["url"],)
            ).fetchone()
            if not existing:
                existing = conn.execute(
                    "SELECT id FROM opportunities WHERE title = ? AND platform = 'linkedin'",
                    (r["title"],)
                ).fetchone()

            if existing:
                continue

            conn.execute("""
                         INSERT INTO opportunities (title, description, platform, url, category,
                                                    type, client_name, budget_min, budget_max,
                                                    budget_currency, posted_date, status)
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new')
                         """, (r["title"], r.get("description"), r["platform"], r.get("url"),
                               r.get("category"), r.get("type"), r.get("client_name"),
                               r.get("budget_min"), r.get("budget_max"),
                               r.get("budget_currency", "TND"), r.get("posted_date")))
            new_count += 1
            conn.commit()
        except Exception as e:
            print(f"  ⚠️ DB error: {e}")

    conn.close()
    return {"new": new_count}


# ─────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────

async def run_linkedin_scraper():
    print("\n💼 LinkedIn Scraper Starting...")
    print("=" * 50)

    conn = get_connection()
    log_id = conn.execute(
        "INSERT INTO scraper_logs (scraper_name, status, notes) VALUES ('linkedin', 'running', 'Scraping companies and jobs')"
    ).lastrowid
    conn.commit()
    conn.close()

    total_companies = 0
    total_jobs = 0

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False, slow_mo=100)
        context = await browser.new_context(
            viewport={"width": 1280, "height": 800},
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        page = await context.new_page()

        logged_in = await login_linkedin(page)
        if not logged_in:
            print("❌ Could not log in to LinkedIn")
            await browser.close()
            return

        await asyncio.sleep(3)

        # ── Companies ──
        print("\n" + "─" * 50)
        print("📋 STEP 1: Searching companies on LinkedIn...")
        print("─" * 50)
        for query in AGENCY_SEARCHES:
            companies = await scrape_company_search(page, query, max_results=8)
            stats = save_linkedin_companies(companies)
            total_companies += stats["new"] + stats["updated"]
            print(f"  💾 {stats['new']} new agencies | {stats['updated']} updated")
            await asyncio.sleep(4)

        # ── Jobs ──
        print("\n" + "─" * 50)
        print("📋 STEP 2: Searching jobs on LinkedIn...")
        print("─" * 50)
        for query in JOB_SEARCHES:
            jobs = await scrape_job_search(page, query, max_results=10)
            stats = save_linkedin_jobs(jobs)
            total_jobs += stats["new"]
            print(f"  💾 {stats['new']} new jobs saved")
            await asyncio.sleep(4)

        await browser.close()

    conn = get_connection()
    conn.execute(
        "UPDATE scraper_logs SET status='success', finished_at=datetime('now'), records_found=?, records_new=? WHERE id=?",
        (total_companies + total_jobs, total_jobs, log_id)
    )
    conn.commit()
    conn.close()

    print("\n" + "=" * 50)
    print(f"✅ Done!")
    print(f"   🏢 Companies found : {total_companies}")
    print(f"   🎯 Jobs found      : {total_jobs}")
    print("=" * 50)


if __name__ == "__main__":
    asyncio.run(run_linkedin_scraper())
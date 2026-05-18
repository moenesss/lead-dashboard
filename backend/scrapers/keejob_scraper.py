"""
scrapers/keejob_scraper.py
---------------------------
Scrapes Keejob.com for video, photo, design and creative jobs in Tunisia.
Keejob is one of the main Tunisian job boards alongside TanitJobs.
"""

import asyncio
import sys
import os
import re
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from playwright.async_api import async_playwright
from database.db import get_connection
from datetime import datetime

SEARCH_TERMS = [
    "vidéaste",
    "photographe",
    "graphiste",
    "motion designer",
    "cameraman",
    "monteur vidéo",
    "directeur artistique",
    "community manager",
    "content creator",
    "production",
]

RELEVANT_KEYWORDS = [
    "vidéo", "video", "vidéaste", "tournage", "clip", "montage", "reels",
    "photo", "photographe", "shooting", "packshot",
    "graphiste", "designer", "logo", "motion", "animation",
    "contenu", "content", "social media", "community",
    "audiovisuel", "production", "réalisation", "créatif",
    "cameraman", "cadreur", "after effect", "premiere",
]

CATEGORY_MAP = {
    "video": ["vidéo", "video", "vidéaste", "tournage", "clip", "montage", "reels", "cameraman", "cadreur"],
    "photo": ["photo", "photographe", "shooting", "packshot"],
    "design": ["graphiste", "designer", "logo", "motion", "animation", "after effect", "directeur artistique"],
    "mixed": ["contenu", "content", "social media", "community", "audiovisuel", "production", "créatif"],
}

def classify_category(text):
    text_lower = text.lower()
    for category, keywords in CATEGORY_MAP.items():
        if any(k in text_lower for k in keywords):
            return category
    return "mixed"

def is_relevant(text):
    return any(k in text.lower() for k in RELEVANT_KEYWORDS)

def extract_company(card_text):
    """Try to extract company name from card text."""
    lines = [l.strip() for l in card_text.split('\n') if l.strip() and len(l.strip()) > 2]
    # Company is usually on line 2 or 3, after the job title
    for line in lines[1:4]:
        if len(line) > 3 and len(line) < 60:
            # Skip lines that look like locations or dates
            if not any(skip in line.lower() for skip in ["tunis", "sfax", "sousse", "il y a", "aujourd", "cdi", "cdd", "temps"]):
                return line
    return ""


async def scrape_keejob(page):
    results = []
    seen_urls = set()

    for term in SEARCH_TERMS:
        # Keejob search URL format
        url = f"https://www.keejob.com/offres-emploi/?keywords={term.replace(' ', '+')}&location=Tunis"
        print(f"\n  📄 Keejob searching: {term}")

        try:
            await page.goto(url, wait_until="domcontentloaded", timeout=30000)
            await asyncio.sleep(4)

            # Scroll to trigger lazy loading
            for _ in range(3):
                await page.evaluate("window.scrollBy(0, 600)")
                await asyncio.sleep(1)

            # Keejob selectors — try in order
            cards = []
            selectors_to_try = [
                ".offer",
                ".job-offer",
                ".offer-item",
                "[class*='offer-item']",
                "[class*='job-item']",
                ".list-offers li",
                ".offers li",
                "article",
                ".container .row li",
                "ul.offers-list li",
                "main li",
            ]

            for selector in selectors_to_try:
                found = await page.locator(selector).all()
                if len(found) > 0:
                    cards = found
                    print(f"  📦 {len(cards)} results with: {selector}")
                    break

            if not cards:
                # Fallback: extract job links directly
                print("  ⚠️ No cards — trying link fallback")
                links = await page.locator("a[href*='/offres-emploi/'], a[href*='/offre/']").all()
                print(f"  📦 {len(links)} job links found")

                for link in links[:15]:
                    try:
                        text = (await link.inner_text(timeout=1000)).strip()
                        href = await link.get_attribute("href", timeout=1000)
                        if not text or len(text) < 5 or not href:
                            continue
                        if not is_relevant(text):
                            continue
                        job_url = href if href.startswith("http") else "https://www.keejob.com" + href
                        if job_url in seen_urls:
                            continue
                        seen_urls.add(job_url)
                        results.append({
                            "title": text[:120],
                            "description": "",
                            "platform": "keejob",
                            "url": job_url,
                            "category": classify_category(text),
                            "type": "full-time",
                            "client_name": "",
                            "budget_min": None,
                            "budget_max": None,
                            "budget_currency": "TND",
                            "posted_date": datetime.now().strftime("%Y-%m-%d"),
                            "status": "new",
                        })
                        print(f"  ✅ {text[:70]}")
                    except:
                        continue
                continue

            # Parse cards normally
            for card in cards[:20]:
                try:
                    card_text = await card.inner_text()
                    if not card_text or len(card_text) < 10:
                        continue

                    # Extract title
                    title = ""
                    for sel in [
                        "h2 a", "h3 a", "h2", "h3",
                        ".offer-title", ".job-title",
                        "[class*='title'] a", "[class*='title']",
                        "a[href*='offre']", "a",
                    ]:
                        try:
                            el = card.locator(sel).first
                            t = (await el.inner_text(timeout=1000)).strip()
                            if t and 5 < len(t) < 200:
                                title = t
                                break
                        except:
                            continue

                    if not title:
                        lines = [l.strip() for l in card_text.split('\n') if l.strip() and len(l.strip()) > 5]
                        title = lines[0][:120] if lines else ""

                    if not title:
                        continue

                    if not is_relevant(title + " " + card_text):
                        continue

                    # Extract company
                    company = ""
                    for sel in [".company", ".enterprise", "[class*='company']", "[class*='entreprise']"]:
                        try:
                            el = card.locator(sel).first
                            t = (await el.inner_text(timeout=1000)).strip()
                            if t and 2 < len(t) < 60:
                                company = t
                                break
                        except:
                            continue
                    if not company:
                        company = extract_company(card_text)

                    # Extract URL
                    job_url = ""
                    try:
                        links = await card.locator("a").all()
                        for link in links:
                            href = await link.get_attribute("href", timeout=1000)
                            if href and ("offre" in href or "emploi" in href or "job" in href):
                                job_url = href if href.startswith("http") else "https://www.keejob.com" + href
                                break
                        if not job_url:
                            href = await card.locator("a").first.get_attribute("href", timeout=1000)
                            if href:
                                job_url = href if href.startswith("http") else "https://www.keejob.com" + href
                    except:
                        pass

                    if not job_url:
                        job_url = f"keejob_{hash(title + company)}"

                    if job_url in seen_urls:
                        continue
                    seen_urls.add(job_url)

                    # Extract contract type
                    contract_type = "full-time"
                    if any(k in card_text.lower() for k in ["cdd", "freelance", "mission", "stage"]):
                        contract_type = "freelance"

                    results.append({
                        "title": title,
                        "description": f"{company}\n{card_text[:500]}" if company else card_text[:500],
                        "platform": "keejob",
                        "url": job_url,
                        "category": classify_category(title + " " + card_text),
                        "type": contract_type,
                        "client_name": company,
                        "budget_min": None,
                        "budget_max": None,
                        "budget_currency": "TND",
                        "posted_date": datetime.now().strftime("%Y-%m-%d"),
                        "status": "new",
                    })
                    print(f"  ✅ {title[:60]}" + (f" @ {company[:25]}" if company else ""))

                except:
                    continue

        except Exception as e:
            print(f"  ❌ Error on term '{term}': {e}")

        await asyncio.sleep(2)

    return results


# ─────────────────────────────────────────
# DATABASE
# ─────────────────────────────────────────

def save_opportunities(results):
    conn = get_connection()
    new_count = 0
    skipped = 0

    for r in results:
        try:
            existing = None
            if r.get("url") and not r["url"].startswith("keejob_"):
                existing = conn.execute(
                    "SELECT id FROM opportunities WHERE url = ?", (r["url"],)
                ).fetchone()
            if not existing:
                existing = conn.execute(
                    "SELECT id FROM opportunities WHERE title = ? AND platform = 'keejob'",
                    (r["title"],)
                ).fetchone()

            if existing:
                skipped += 1
                continue

            conn.execute("""
                INSERT INTO opportunities (
                    title, description, platform, url, category, type,
                    client_name, budget_min, budget_max, budget_currency,
                    posted_date, status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new')
            """, (
                r["title"], r.get("description"), r["platform"], r.get("url"),
                r.get("category"), r.get("type"), r.get("client_name"),
                r.get("budget_min"), r.get("budget_max"),
                r.get("budget_currency", "TND"), r.get("posted_date")
            ))
            new_count += 1
            conn.commit()
        except Exception as e:
            print(f"  ⚠️ DB error: {e}")

    conn.close()
    return {"found": len(results), "new": new_count, "skipped": skipped}


# ─────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────

async def run_keejob_scraper():
    print("\n🟡 Keejob Scraper Starting...")
    print("=" * 50)

    conn = get_connection()
    log_id = conn.execute(
        "INSERT INTO scraper_logs (scraper_name, status, notes) VALUES ('keejob', 'running', 'Scraping keejob.com')"
    ).lastrowid
    conn.commit()
    conn.close()

    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=False, slow_mo=50)
            context = await browser.new_context(
                locale="fr-FR",
                viewport={"width": 1280, "height": 800},
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            )
            page = await context.new_page()

            results = await scrape_keejob(page)
            await browser.close()

        stats = save_opportunities(results)

        conn = get_connection()
        conn.execute(
            "UPDATE scraper_logs SET status='success', finished_at=datetime('now'), records_found=?, records_new=? WHERE id=?",
            (stats["found"], stats["new"], log_id)
        )
        conn.commit()
        conn.close()

        print("\n" + "=" * 50)
        print(f"✅ Done!")
        print(f"   🎯 Found  : {stats['found']}")
        print(f"   💾 New    : {stats['new']}")
        print(f"   ⏭️  Skipped: {stats['skipped']}")
        print("=" * 50)

        return stats

    except Exception as e:
        print(f"\n❌ Fatal error: {e}")
        conn = get_connection()
        conn.execute(
            "UPDATE scraper_logs SET status='error', finished_at=datetime('now'), notes=? WHERE id=?",
            (str(e), log_id)
        )
        conn.commit()
        conn.close()
        return {"found": 0, "new": 0, "skipped": 0}


if __name__ == "__main__":
    asyncio.run(run_keejob_scraper())

import asyncio
import sys
import os
import re
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from playwright.async_api import async_playwright
from database.db import get_connection
from datetime import datetime

FREELANCES_EMAIL    = "bouslimi.moenes@gmail.com"
FREELANCES_PASSWORD = "123456moenes"

RELEVANT_KEYWORDS = [
    "vidéo", "video", "vidéaste", "videaste", "tournage", "clip",
    "reportage", "montage", "motion", "after effect", "cinéma",
    "court métrage", "reels", "youtube",
    "photo", "photographe", "photographie", "shooting", "séance photo", "packshot",
    "graphiste", "graphic design", "designer", "identité visuelle",
    "logo", "charte graphique", "flyer", "affiche", "brochure",
    "motion design", "animation",
    "créatif", "contenu", "content", "social media", "community manager",
    "audiovisuel", "production", "réalisation",
]

CATEGORY_MAP = {
    "video": ["vidéo", "video", "vidéaste", "tournage", "clip", "reportage",
              "montage", "motion", "after effect", "reels", "youtube", "cinéma"],
    "photo": ["photo", "photographe", "photographie", "shooting", "packshot"],
    "design": ["graphiste", "graphic design", "designer", "logo", "charte",
               "flyer", "affiche", "brochure", "motion design", "animation"],
    "mixed": ["contenu", "content", "social media", "community manager",
              "audiovisuel", "production", "créatif"],
}

def classify_category(text):
    text_lower = text.lower()
    for category, keywords in CATEGORY_MAP.items():
        if any(k in text_lower for k in keywords):
            return category
    return "mixed"

def is_relevant(title, description=""):
    text = (title + " " + description).lower()
    return any(k in text for k in RELEVANT_KEYWORDS)

def extract_budget(text):
    text = text.replace(" ", "").replace("\xa0", "").replace(",", "")
    patterns = [
        r'(\d+)[-](\d+)(?:tnd|dt|dinar)',
        r'Montant(\d+)',
        r'(\d+)(?:tnd|dt|dinar)',
        r'(\d{3,5})',
    ]
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            groups = match.groups()
            if len(groups) == 2 and groups[1]:
                return float(groups[0]), float(groups[1])
            elif groups[0]:
                val = float(groups[0])
                return val, val
    return None, None


# ─────────────────────────────────────────
# FREELANCES.TN
# ─────────────────────────────────────────

async def login_freelances(page):
    print("  🔐 Logging in to freelances.tn...")
    await page.goto("https://www.freelances.tn/connexion", wait_until="domcontentloaded", timeout=30000)
    await asyncio.sleep(2)
    try:
        await page.locator('input[type="email"], input[name="email"], #email').first.fill(FREELANCES_EMAIL)
        await asyncio.sleep(0.5)
        await page.locator('input[type="password"], input[name="password"], #password').first.fill(FREELANCES_PASSWORD)
        await asyncio.sleep(0.5)
        await page.locator('button[type="submit"], input[type="submit"]').first.click()
        await asyncio.sleep(3)
        print("  ✅ Login submitted")
        return True
    except Exception as e:
        print(f"  ⚠️ Login error: {e}")
        return False


async def scrape_freelances_tn(page):
    results = []
    seen_urls = set()

    urls = [
        "https://www.freelances.tn/recherche-projet-freelance/",
        "https://www.freelances.tn/recherche-projet-freelance/?categorie=design-graphique",
        "https://www.freelances.tn/recherche-projet-freelance/?categorie=video-photo-audio",
    ]

    for url in urls:
        print(f"  📄 Scraping: {url}")
        try:
            await page.goto(url, wait_until="domcontentloaded", timeout=30000)
            await asyncio.sleep(4)

            for _ in range(4):
                await page.evaluate("window.scrollBy(0, 800)")
                await asyncio.sleep(1)

            cards = []
            for selector in [".card", "article", "[class*='project']", "[class*='projet']", ".col-12 .card"]:
                found = await page.locator(selector).all()
                if len(found) > 1:
                    cards = found
                    print(f"  📦 {len(cards)} cards ({selector})")
                    break

            for card in cards:
                try:
                    card_text = await card.inner_text()
                    if not card_text or len(card_text) < 20:
                        continue

                    title = ""
                    for sel in ["h2 a", "h3 a", "h4 a", ".card-title a", "h2", "h3", ".card-title", "a"]:
                        try:
                            el = card.locator(sel).first
                            t = (await el.inner_text(timeout=1000)).strip()
                            if t and len(t) > 8:
                                title = t
                                break
                        except:
                            continue

                    if not title or not is_relevant(title, card_text):
                        continue

                    project_url = ""
                    try:
                        href = await card.locator("a").first.get_attribute("href", timeout=1000)
                        if href:
                            project_url = href if href.startswith("http") else "https://www.freelances.tn" + href
                    except:
                        pass

                    if project_url in seen_urls:
                        continue
                    seen_urls.add(project_url)

                    budget_min, budget_max = extract_budget(card_text)

                    results.append({
                        "title": title,
                        "description": card_text[:600],
                        "platform": "freelances.tn",
                        "url": project_url,
                        "category": classify_category(title + " " + card_text),
                        "type": "freelance",
                        "client_name": "",
                        "budget_min": budget_min,
                        "budget_max": budget_max,
                        "budget_currency": "TND",
                        "posted_date": datetime.now().strftime("%Y-%m-%d"),
                        "status": "new",
                    })
                    print(f"  ✅ {title[:70]}")

                except:
                    continue

        except Exception as e:
            print(f"  ❌ {e}")

    return results


# ─────────────────────────────────────────
# TANITJOBS — FIXED SELECTORS
# ─────────────────────────────────────────

async def scrape_tanitjobs(page):
    results = []
    seen_urls = set()
    search_terms = ["vidéaste", "photographe", "graphiste", "motion designer", "cameraman", "video", "photo"]

    for term in search_terms:
        # TanitJobs real search URL format
        url = f"https://www.tanitjobs.com/offres-emploi/?q={term.replace(' ', '+')}&localisation=Tunis"
        print(f"\n  📄 TanitJobs searching: {term}")

        try:
            await page.goto(url, wait_until="domcontentloaded", timeout=30000)
            await asyncio.sleep(4)

            # Scroll to trigger lazy loading
            for _ in range(3):
                await page.evaluate("window.scrollBy(0, 600)")
                await asyncio.sleep(1)

            # TanitJobs 2024/2025 actual selectors
            cards = []
            selectors_to_try = [
                ".offer-item",
                ".job-offer",
                "[class*='offer']",
                ".list-offers li",
                ".offers-list li",
                ".result-item",
                "[class*='result']",
                "article.offer",
                ".container .row .col-md-9 .card",
                ".jobs-list .job",
                "ul.list-unstyled li",
                "main .container li",
            ]

            for selector in selectors_to_try:
                found = await page.locator(selector).all()
                if len(found) > 0:
                    cards = found
                    print(f"  📦 {len(cards)} results with selector: {selector}")
                    break

            if not cards:
                # Last resort: dump all links from main content
                print("  ⚠️ No cards found — trying link extraction fallback")
                links = await page.locator("main a[href*='offre'], a[href*='/offre/'], a[href*='emploi']").all()
                print(f"  📦 {len(links)} job links found via fallback")

                for link in links[:15]:
                    try:
                        text = (await link.inner_text(timeout=1000)).strip()
                        href = await link.get_attribute("href", timeout=1000)
                        if not text or len(text) < 5 or not href:
                            continue
                        job_url = href if href.startswith("http") else "https://www.tanitjobs.com" + href
                        if job_url in seen_urls:
                            continue
                        seen_urls.add(job_url)
                        results.append({
                            "title": text[:120],
                            "description": "",
                            "platform": "tanitjobs",
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

            for card in cards[:15]:
                try:
                    card_text = await card.inner_text()
                    if not card_text or len(card_text) < 10:
                        continue

                    # Extract title — try specific selectors first
                    title = ""
                    for sel in [
                        "h2 a", "h3 a", "h2", "h3",
                        ".offer-title", ".job-title", ".title",
                        "[class*='title'] a", "[class*='title']",
                        "a[href*='offre']", "a[href*='emploi']", "a"
                    ]:
                        try:
                            el = card.locator(sel).first
                            t = (await el.inner_text(timeout=1000)).strip()
                            if t and len(t) > 5 and len(t) < 200:
                                title = t
                                break
                        except:
                            continue

                    if not title:
                        lines = [l.strip() for l in card_text.split('\n') if l.strip() and len(l.strip()) > 5]
                        title = lines[0][:120] if lines else ""

                    if not title:
                        continue

                    # Extract company name
                    company = ""
                    for sel in [".company", ".enterprise", ".employer", "[class*='company']", "[class*='entreprise']"]:
                        try:
                            el = card.locator(sel).first
                            t = (await el.inner_text(timeout=1000)).strip()
                            if t and len(t) > 2:
                                company = t
                                break
                        except:
                            continue

                    # Extract URL
                    job_url = ""
                    try:
                        links = await card.locator("a").all()
                        for link in links:
                            href = await link.get_attribute("href", timeout=1000)
                            if href and ("offre" in href or "emploi" in href or "job" in href):
                                job_url = href if href.startswith("http") else "https://www.tanitjobs.com" + href
                                break
                        if not job_url:
                            href = await card.locator("a").first.get_attribute("href", timeout=1000)
                            if href:
                                job_url = href if href.startswith("http") else "https://www.tanitjobs.com" + href
                    except:
                        pass

                    if not job_url:
                        job_url = f"tanitjobs_{hash(title)}"

                    if job_url in seen_urls:
                        continue
                    seen_urls.add(job_url)

                    results.append({
                        "title": title,
                        "description": f"{company}\n{card_text[:500]}" if company else card_text[:500],
                        "platform": "tanitjobs",
                        "url": job_url,
                        "category": classify_category(title + " " + card_text),
                        "type": "full-time",
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

def save_opportunities(results, platform):
    conn = get_connection()
    new_count = 0
    skipped = 0

    log_id = conn.execute(
        "INSERT INTO scraper_logs (scraper_name, status, notes) VALUES (?, 'running', ?)",
        (f"{platform}_scraper", f"Scraping {platform}")
    ).lastrowid
    conn.commit()

    for r in results:
        try:
            existing = None
            if r.get("url") and not r["url"].startswith("tanitjobs_"):
                existing = conn.execute("SELECT id FROM opportunities WHERE url = ?", (r["url"],)).fetchone()
            if not existing:
                existing = conn.execute(
                    "SELECT id FROM opportunities WHERE title = ? AND platform = ?",
                    (r["title"], r["platform"])
                ).fetchone()

            if existing:
                skipped += 1
                continue

            conn.execute("""
                         INSERT INTO opportunities (title, description, platform, url, category, type,
                                                    client_name, budget_min, budget_max, budget_currency, posted_date, status)
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new')
                         """, (r["title"], r.get("description"), r["platform"], r.get("url"),
                               r.get("category"), r.get("type"), r.get("client_name"),
                               r.get("budget_min"), r.get("budget_max"),
                               r.get("budget_currency", "TND"), r.get("posted_date")))
            new_count += 1
            conn.commit()
        except Exception as e:
            print(f"  ⚠️ DB error: {e}")

    conn.execute("""
                 UPDATE scraper_logs SET status='success', finished_at=datetime('now'),
                                         records_found=?, records_new=? WHERE id=?
                 """, (len(results), new_count, log_id))
    conn.commit()
    conn.close()
    return {"found": len(results), "new": new_count, "skipped": skipped}


# ─────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────

async def run_all():
    print("\n🎯 Opportunities Scraper Starting...")
    print("=" * 50)

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False, slow_mo=50)
        context = await browser.new_context(
            locale="fr-FR",
            viewport={"width": 1280, "height": 800},
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        page = await context.new_page()

        # ── Freelances.tn ──
        print("\n📋 Platform: freelances.tn")
        await login_freelances(page)
        freelance_results = await scrape_freelances_tn(page)
        stats = save_opportunities(freelance_results, "freelances.tn")
        print(f"  💾 freelances.tn: {stats['new']} new, {stats['skipped']} skipped")

        await asyncio.sleep(2)

        # ── TanitJobs ──
        print("\n📋 Platform: tanitjobs")
        tanitjobs_results = await scrape_tanitjobs(page)
        stats = save_opportunities(tanitjobs_results, "tanitjobs")
        print(f"  💾 tanitjobs: {stats['new']} new, {stats['skipped']} skipped")

        await browser.close()

    total = len(freelance_results) + len(tanitjobs_results)
    print("\n" + "=" * 50)
    print(f"✅ Done! Total found: {total}")


if __name__ == "__main__":
    asyncio.run(run_all())
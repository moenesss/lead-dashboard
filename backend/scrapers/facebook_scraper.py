import asyncio
import sys
import os
import re
import shutil
import tempfile

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from playwright.async_api import async_playwright
from database.db import get_connection
from datetime import datetime

# ─────────────────────────────────────────
# CHROME PROFILE PATH (source — your real profile)
# ─────────────────────────────────────────
CHROME_PROFILE_SRC = r"C:\Users\GIGABYTE\AppData\Local\Google\Chrome\User Data\Default"

# ─────────────────────────────────────────
# Facebook Groups to monitor
# ─────────────────────────────────────────
FACEBOOK_GROUPS = [
    "https://www.facebook.com/share/g/1GVE7Q9whb/",
    "https://www.facebook.com/groups/besttunisiaads/",
    "https://www.facebook.com/groups/5909039722469494/",
]

AGENCY_SEARCH_TERMS = [
    "agence marketing tunisie",
    "boite production tunisie",
    "agence communication tunis",
    "agence digitale tunis",
]

OPPORTUNITY_KEYWORDS = [
    "vidéaste", "videaste", "video", "vidéo",
    "photographe", "photo", "shooting",
    "graphiste", "designer", "graphic",
    "motion design", "animation",
    "monteur", "montage", "editing",
    "cameraman", "cadreur",
    "community manager", "social media",
    "contenu", "content creator",
    "production", "réalisation",
    "cherche", "recherche", "besoin", "looking for",
    "urgent", "disponible", "freelance",
]


# ─────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────

def is_opportunity(text):
    return any(k in text.lower() for k in OPPORTUNITY_KEYWORDS)


def classify_category(text):
    text_lower = text.lower()
    if any(k in text_lower for k in ["vidéo", "video", "tournage", "montage", "clip", "reels"]):
        return "video"
    if any(k in text_lower for k in ["photo", "photographe", "shooting"]):
        return "photo"
    if any(k in text_lower for k in ["graphiste", "designer", "logo", "flyer"]):
        return "design"
    return "mixed"


def extract_phone(text):
    match = re.search(r'(?:\+216|00216)?[\s\-]?[2-9]\d[\s\-]?\d{3}[\s\-]?\d{3}', text)
    if match:
        return re.sub(r'[\s\-]', '', match.group()).strip()
    return ""


def extract_email(text):
    match = re.search(r'[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}', text)
    if match:
        email = match.group().lower()
        if not any(b in email for b in ["example.com", "test.com", "facebook.com"]):
            return email
    return ""


def copy_chrome_profile():
    """
    Copy the Chrome Default profile to a temp directory.
    This avoids the 'profile locked' error when Chrome is running.
    Returns the temp directory path.
    """
    print("  📋 Copying Chrome profile to temp directory (avoids lock)...")
    temp_dir = tempfile.mkdtemp(prefix="fb_scraper_")
    dst_profile = os.path.join(temp_dir, "Default")

    try:
        shutil.copytree(
            CHROME_PROFILE_SRC,
            dst_profile,
            ignore=shutil.ignore_patterns(
                "*.log", "*.ldb", "LOCK", "*.tmp",
                "Cache", "Code Cache", "GPUCache",
                "ShaderCache", "DawnCache", "Crashpad"
            )
        )
        print(f"  ✅ Profile copied to: {temp_dir}")
    except Exception as e:
        print(f"  ⚠️ Profile copy warning (non-fatal): {e}")

    return temp_dir


# ─────────────────────────────────────────
# SCRAPING FUNCTIONS
# ─────────────────────────────────────────

async def scrape_facebook_group(page, group_url, max_posts=25):
    results = []
    print(f"\n  📄 Scraping group: {group_url}")

    try:
        await page.goto(group_url, wait_until="domcontentloaded", timeout=30000)
        await asyncio.sleep(5)

        if "login" in page.url:
            print("  ⚠️ Redirected to login — skipping this group")
            return results

        # Scroll to load more posts
        for i in range(6):
            await page.evaluate("window.scrollBy(0, 1000)")
            await asyncio.sleep(2)
            print(f"  ⏳ Scrolling... ({i+1}/6)")

        # Try multiple post selectors
        posts = []
        for selector in [
            "[role='feed'] [role='article']",
            "[data-pagelet='GroupFeed'] [role='article']",
            "[role='article']",
        ]:
            found = await page.locator(selector).all()
            if len(found) > 1:
                posts = found
                print(f"  📦 Found {len(posts)} posts with selector: {selector}")
                break

        if not posts:
            print("  ⚠️ No posts found — group may be private or layout changed")
            return results

        for post in posts[:max_posts]:
            try:
                post_text = await post.inner_text()
                if not post_text or len(post_text) < 20:
                    continue

                if not is_opportunity(post_text):
                    continue

                # Try to get post URL
                post_url = ""
                try:
                    links = await post.locator(
                        "a[href*='/posts/'], a[href*='story_fbid'], a[href*='permalink']"
                    ).all()
                    for link in links:
                        href = await link.get_attribute("href", timeout=1000)
                        if href and ("posts" in href or "story_fbid" in href or "permalink" in href):
                            post_url = href.split("?")[0]
                            break
                    if not post_url:
                        all_links = await post.locator("a[href*='facebook.com']").all()
                        for link in all_links:
                            href = await link.get_attribute("href", timeout=1000)
                            if href and "groups" in href and len(href) > 40:
                                post_url = href.split("?")[0]
                                break
                except Exception:
                    pass

                if not post_url:
                    post_url = f"fb_post_{hash(post_text[:100])}"

                title = post_text.split('\n')[0].strip()[:150]
                if not title:
                    continue

                results.append({
                    "title": title,
                    "description": post_text[:600],
                    "platform": "facebook",
                    "url": post_url,
                    "category": classify_category(post_text),
                    "type": "freelance",
                    "client_name": extract_phone(post_text) or extract_email(post_text) or "",
                    "budget_min": None,
                    "budget_max": None,
                    "budget_currency": "TND",
                    "posted_date": datetime.now().strftime("%Y-%m-%d"),
                    "status": "new",
                })
                print(f"  ✅ Opportunity: {title[:70]}")

            except Exception:
                continue

    except Exception as e:
        print(f"  ❌ Error scraping group: {e}")

    print(f"  📊 Total opportunities found in this group: {len(results)}")
    return results


async def search_facebook_pages(page, query, max_results=10):
    results = []
    search_url = f"https://www.facebook.com/search/pages/?q={query.replace(' ', '%20')}"
    print(f"\n  🔍 Searching pages for: {query}")

    try:
        await page.goto(search_url, wait_until="domcontentloaded", timeout=30000)
        await asyncio.sleep(4)

        for _ in range(3):
            await page.evaluate("window.scrollBy(0, 800)")
            await asyncio.sleep(1.5)

        all_links = await page.locator("a[href*='facebook.com/']").all()
        seen = set()

        for link in all_links[:80]:
            try:
                href = await link.get_attribute("href", timeout=1000)
                text = (await link.inner_text(timeout=1000)).strip()

                if not href or not text:
                    continue

                if any(skip in href for skip in [
                    "/groups/", "/events/", "/marketplace/",
                    "l.facebook.com", "/login", "/policies",
                    "/help", "/about", "/ads"
                ]):
                    continue

                clean_url = href.split("?")[0].rstrip("/")

                if clean_url in seen:
                    continue

                if len(text) < 3 or len(text) > 80:
                    continue

                if any(skip in text.lower() for skip in [
                    "voir plus", "j'aime", "suivre", "partager",
                    "facebook", "messenger", "connexion", "créer"
                ]):
                    continue

                seen.add(clean_url)
                results.append({
                    "name": text,
                    "facebook_url": clean_url,
                    "description": "",
                    "source": "facebook",
                })
                print(f"  ✅ Page found: {text}")

                if len(results) >= max_results:
                    break

            except Exception:
                continue

        print(f"  📦 {len(results)} pages found for query: {query}")

    except Exception as e:
        print(f"  ❌ Error searching pages: {e}")

    return results


# ─────────────────────────────────────────
# DATABASE SAVE FUNCTIONS
# ─────────────────────────────────────────

def save_opportunities(results):
    conn = get_connection()
    new_count = 0
    skipped = 0

    for r in results:
        try:
            existing = conn.execute(
                "SELECT id FROM opportunities WHERE url = ?", (r["url"],)
            ).fetchone()
            if not existing:
                existing = conn.execute(
                    "SELECT id FROM opportunities WHERE title = ? AND platform = 'facebook'",
                    (r["title"],)
                ).fetchone()

            if existing:
                skipped += 1
                continue

            conn.execute("""
                         INSERT INTO opportunities (
                             title, description, platform, url, category,
                             type, client_name, budget_min, budget_max,
                             budget_currency, posted_date, status
                         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new')
                         """, (
                             r["title"], r.get("description"), r["platform"],
                             r.get("url"), r.get("category"), r.get("type"),
                             r.get("client_name"), r.get("budget_min"),
                             r.get("budget_max"), r.get("budget_currency", "TND"),
                             r.get("posted_date")
                         ))
            new_count += 1
            conn.commit()

        except Exception as e:
            print(f"  ⚠️ DB error saving opportunity: {e}")

    conn.close()
    return {"new": new_count, "skipped": skipped}


def save_facebook_pages(results):
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
                        "UPDATE contacts SET facebook_url = COALESCE(facebook_url, ?) WHERE agency_id = ?",
                        (r.get("facebook_url"), agency_id)
                    )
                else:
                    conn.execute(
                        "INSERT INTO contacts (agency_id, facebook_url, source) VALUES (?, ?, 'facebook')",
                        (agency_id, r.get("facebook_url"))
                    )
                updated_count += 1
            else:
                agency_id = conn.execute(
                    "INSERT INTO agencies (name, description, status, source) VALUES (?, ?, 'active', 'facebook')",
                    (r["name"], r.get("description", ""))
                ).lastrowid
                if r.get("facebook_url"):
                    conn.execute(
                        "INSERT INTO contacts (agency_id, facebook_url, source) VALUES (?, ?, 'facebook')",
                        (agency_id, r["facebook_url"])
                    )
                new_count += 1

            conn.commit()

        except Exception as e:
            print(f"  ⚠️ DB error saving page: {e}")

    conn.close()
    return {"new": new_count, "updated": updated_count}


# ─────────────────────────────────────────
# MAIN RUNNER
# ─────────────────────────────────────────

async def run_facebook_scraper():
    print("\n📘 Facebook Scraper Starting...")
    print("=" * 50)

    # Log start in DB
    conn = get_connection()
    log_id = conn.execute(
        "INSERT INTO scraper_logs (scraper_name, status, notes) VALUES ('facebook', 'running', 'Scraping groups and pages')"
    ).lastrowid
    conn.commit()
    conn.close()

    total_opps = 0
    total_agencies = 0

    # Copy Chrome profile to temp dir (fixes the LOCK error)
    temp_dir = copy_chrome_profile()

    try:
        async with async_playwright() as p:
            print("\n  🚀 Launching Chrome with copied profile...")
            context = await p.chromium.launch_persistent_context(
                user_data_dir=temp_dir,
                channel="chrome",
                headless=False,
                slow_mo=80,
                viewport={"width": 1280, "height": 800},
                args=["--profile-directory=Default"]
            )
            page = await context.new_page()

            # Check if logged in
            print("  🌐 Opening Facebook...")
            await page.goto("https://www.facebook.com", wait_until="domcontentloaded", timeout=30000)
            await asyncio.sleep(4)

            if "login" in page.url:
                print("\n  ⚠️  Not logged in to Facebook!")
                print("  👉 Please log in manually in the browser window that just opened.")
                input("  ✅ Press Enter here after you've logged in...\n")
            else:
                print("  ✅ Already logged in to Facebook!")

            # ── Scrape groups for opportunities ──
            print("\n" + "─" * 50)
            print("📋 STEP 1: Scraping Facebook groups for opportunities...")
            print("─" * 50)
            for group_url in FACEBOOK_GROUPS:
                posts = await scrape_facebook_group(page, group_url, max_posts=20)
                stats = save_opportunities(posts)
                total_opps += stats["new"]
                print(f"  💾 Saved: {stats['new']} new | Skipped: {stats['skipped']} duplicates")
                await asyncio.sleep(3)

            # ── Search for agency pages ──
            print("\n" + "─" * 50)
            print("📋 STEP 2: Searching for agency Facebook pages...")
            print("─" * 50)
            for term in AGENCY_SEARCH_TERMS:
                pages_found = await search_facebook_pages(page, term, max_results=10)
                stats = save_facebook_pages(pages_found)
                total_agencies += stats["new"] + stats["updated"]
                print(f"  💾 Saved: {stats['new']} new | Updated: {stats['updated']} existing")
                await asyncio.sleep(3)

            await context.close()

    except Exception as e:
        print(f"\n❌ Fatal error: {e}")

        # Log failure
        conn = get_connection()
        conn.execute(
            "UPDATE scraper_logs SET status='error', finished_at=datetime('now'), notes=? WHERE id=?",
            (str(e), log_id)
        )
        conn.commit()
        conn.close()

    finally:
        # Always clean up temp profile
        try:
            shutil.rmtree(temp_dir, ignore_errors=True)
            print(f"\n  🧹 Temp profile cleaned up")
        except Exception:
            pass

    # Log success
    conn = get_connection()
    conn.execute(
        "UPDATE scraper_logs SET status='success', finished_at=datetime('now'), records_found=?, records_new=? WHERE id=?",
        (total_opps + total_agencies, total_opps, log_id)
    )
    conn.commit()
    conn.close()

    print("\n" + "=" * 50)
    print(f"✅ Done!")
    print(f"   🎯 Opportunities found : {total_opps}")
    print(f"   🏢 Agencies found      : {total_agencies}")
    print("=" * 50)


if __name__ == "__main__":
    asyncio.run(run_facebook_scraper())
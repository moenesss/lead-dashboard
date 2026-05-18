import asyncio
import sys
import os
import schedule
import time
import threading
from datetime import datetime

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# ─────────────────────────────────────────
# SCHEDULE CONFIGURATION
# Change these times to whatever you want
# ─────────────────────────────────────────
GOOGLE_MAPS_TIME      = "08:00"   # Run Google Maps scraper at 8am
ENRICHMENT_TIME       = "09:00"   # Run website enrichment at 9am
OPPORTUNITIES_TIME    = "10:00"   # Run opportunities scraper at 10am
OPPORTUNITIES_REPEAT  = 4         # Also repeat every 4 hours


def log(msg):
    print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] {msg}")


def run_google_maps():
    log("🗺️  Starting Google Maps scraper...")
    try:
        from scrapers.google_maps import run_all_queries
        asyncio.run(run_all_queries(max_per_query=10))
        log("✅ Google Maps scraper done")
    except Exception as e:
        log(f"❌ Google Maps scraper failed: {e}")


def run_enrichment():
    log("🔬 Starting website enrichment...")
    try:
        from scrapers.website_enrichment import run_enrichment
        asyncio.run(run_enrichment())
        log("✅ Website enrichment done")
    except Exception as e:
        log(f"❌ Website enrichment failed: {e}")


def run_opportunities():
    log("🎯 Starting opportunities scraper...")
    try:
        from scrapers.opportunities import run_all
        asyncio.run(run_all())
        log("✅ Opportunities scraper done")
    except Exception as e:
        log(f"❌ Opportunities scraper failed: {e}")
def run_facebook():
    log("📘 Starting Facebook scraper...")
    try:
        from scrapers.facebook_scraper import run_facebook_scraper
        asyncio.run(run_facebook_scraper())
        log("✅ Facebook scraper done")
    except Exception as e:
        log(f"❌ Facebook scraper failed: {e}")
def run_linkedin():
    log("💼 Starting LinkedIn scraper...")
    try:
        from scrapers.linkedin_scraper import run_linkedin_scraper
        asyncio.run(run_linkedin_scraper())
        log("✅ LinkedIn scraper done")
    except Exception as e:
        log(f"❌ LinkedIn scraper failed: {e}")


def run_all_scrapers():
    """Run all scrapers in sequence."""
    log("🚀 Running full scrape cycle...")
    run_google_maps()
    run_enrichment()
    run_opportunities()
    log("✅ Full scrape cycle complete")


def setup_schedule():
    """Set up the scraping schedule."""
    # Daily scrapes at specific times
    schedule.every().day.at(GOOGLE_MAPS_TIME).do(run_google_maps)
    schedule.every().day.at(ENRICHMENT_TIME).do(run_enrichment)
    schedule.every().day.at(OPPORTUNITIES_TIME).do(run_opportunities)
    schedule.every().day.at("11:00").do(run_linkedin)
    schedule.every().day.at("12:00").do(run_facebook)

    # Opportunities repeat every X hours (to catch new posts)
    schedule.every(OPPORTUNITIES_REPEAT).hours.do(run_opportunities)

    log("📅 Schedule set up:")
    log(f"   Google Maps:   daily at {GOOGLE_MAPS_TIME}")
    log(f"   Enrichment:    daily at {ENRICHMENT_TIME}")
    log(f"   Opportunities: daily at {OPPORTUNITIES_TIME} + every {OPPORTUNITIES_REPEAT}h")
    log(f"   Opportunities: daily at {OPPORTUNITIES_TIME} + every {OPPORTUNITIES_REPEAT}h")
    log(f"   LinkedIn:      daily at 11:00")


def run_scheduler():
    """Run the scheduler loop."""
    setup_schedule()
    log("⏰ Scheduler started — waiting for scheduled tasks...")
    log("   Press Ctrl+C to stop\n")

    while True:
        schedule.run_pending()
        time.sleep(30)  # Check every 30 seconds


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Lead Dashboard Scraper Scheduler")
    parser.add_argument("--now", action="store_true", help="Run all scrapers immediately then start scheduler")
    parser.add_argument("--maps", action="store_true", help="Run only Google Maps scraper now")
    parser.add_argument("--enrich", action="store_true", help="Run only website enrichment now")
    parser.add_argument("--opps", action="store_true", help="Run only opportunities scraper now")
    args = parser.parse_args()

    if args.maps:
        run_google_maps()
    elif args.enrich:
        run_enrichment()
    elif args.opps:
        run_opportunities()
    elif args.now:
        run_all_scrapers()
        run_scheduler()
    else:
        run_scheduler()
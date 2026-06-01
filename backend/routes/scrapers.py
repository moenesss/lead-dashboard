"""
routes/scrapers.py
------------------
Scraper endpoints for the Agencies page.

ROOT CAUSE FIX:
  The old code used FastAPI BackgroundTasks + SelectorEventLoop.
  On Windows, Playwright needs ProactorEventLoop to spawn Chromium
  subprocesses — SelectorEventLoop silently fails and returns 0 results.

SOLUTION:
  Every scraper now runs in a ThreadPoolExecutor thread with its own
  ProactorEventLoop (Windows) or new_event_loop (Linux/Mac) and BLOCKS
  until the scraper finishes before returning the result to the frontend.
  The frontend already uses a 2-hour timeout so this is fine.
"""

import asyncio
import sys
from concurrent.futures import ThreadPoolExecutor
from fastapi import APIRouter, HTTPException
from database.db import get_connection

router = APIRouter(prefix="/scrapers", tags=["scrapers"])


# ─────────────────────────────────────────
# Core helper — runs a coroutine in its own
# event loop inside a worker thread and
# RETURNS the result (no fire-and-forget).
# ─────────────────────────────────────────

def run_in_thread(coro):
    """
    Execute an async coroutine in a dedicated thread with the correct
    event loop for the platform, and return whatever the coroutine returns.

    Windows  → ProactorEventLoop  (required for Playwright subprocess)
    Linux/Mac→ new_event_loop
    """
    def _run():
        if sys.platform == "win32":
            loop = asyncio.ProactorEventLoop()
        else:
            loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            return loop.run_until_complete(coro)
        finally:
            loop.close()

    with ThreadPoolExecutor(max_workers=1) as ex:
        future = ex.submit(_run)
        return future.result(timeout=7200)   # 2-hour hard cap


# ─────────────────────────────────────────
# GET /scrapers/status
# ─────────────────────────────────────────

@router.get("/status")
def get_scraper_status():
    conn = get_connection()
    rows = conn.execute("""
                        SELECT scraper_name, status, started_at, finished_at,
                               records_found, records_new, notes
                        FROM scraper_logs
                        WHERE id IN (
                            SELECT MAX(id) FROM scraper_logs GROUP BY scraper_name
                        )
                        ORDER BY started_at DESC
                        """).fetchall()
    conn.close()
    return [dict(r) for r in rows]


# ─────────────────────────────────────────
# POST /scrapers/run/googlemaps
# ─────────────────────────────────────────

@router.post("/run/googlemaps")
def run_googlemaps():
    """
    Run the Google Maps agency scraper.
    Blocks until complete and returns the actual record counts.
    """
    try:
        from scrapers.google_maps import run_all_queries
        result = run_in_thread(run_all_queries(max_per_query=20))
        new = result.get("total_new", 0) if result else 0
        return {"status": "done", "scraper": "googlemaps", "new": new}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────
# POST /scrapers/run/enrichment
# ─────────────────────────────────────────

@router.post("/run/enrichment")
def run_enrichment():
    """
    Visit each agency website and extract email + social links.
    Blocks until complete.
    """
    try:
        from scrapers.website_enrichment import run_enrichment as _enrich
        result = run_in_thread(_enrich())
        return {"status": "done", "scraper": "enrichment", "new": 0}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────
# POST /scrapers/run/linkedin
# ─────────────────────────────────────────

@router.post("/run/linkedin")
def run_linkedin():
    try:
        from scrapers.linkedin_scraper import run_linkedin_scraper
        run_in_thread(run_linkedin_scraper())
        return {"status": "done", "scraper": "linkedin", "new": 0}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────
# POST /scrapers/run/facebook
# ─────────────────────────────────────────

@router.post("/run/facebook")
def run_facebook():
    try:
        from scrapers.facebook_scraper import run_facebook_scraper
        run_in_thread(run_facebook_scraper())
        return {"status": "done", "scraper": "facebook", "new": 0}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────
# POST /scrapers/run/freelances
# ─────────────────────────────────────────

@router.post("/run/freelances")
def run_freelances():
    try:
        from scrapers.opportunities import run_all
        run_in_thread(run_all())
        return {"status": "done", "scraper": "freelances.tn", "new": 0}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────
# POST /scrapers/run/tanitjobs
# ─────────────────────────────────────────

@router.post("/run/tanitjobs")
def run_tanitjobs():
    try:
        from scrapers.opportunities import scrape_tanitjobs, save_opportunities
        from playwright.async_api import async_playwright

        async def _run():
            async with async_playwright() as p:
                browser = await p.chromium.launch(headless=False, slow_mo=50)
                context = await browser.new_context(
                    locale="fr-FR",
                    viewport={"width": 1280, "height": 800},
                    user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
                )
                page = await context.new_page()
                results = await scrape_tanitjobs(page)
                save_opportunities(results, "tanitjobs")
                await browser.close()

        run_in_thread(_run())
        return {"status": "done", "scraper": "tanitjobs", "new": 0}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────
# POST /scrapers/run/keejob
# ─────────────────────────────────────────

@router.post("/run/keejob")
def run_keejob():
    try:
        from scrapers.keejob_scraper import run_keejob_scraper
        run_in_thread(run_keejob_scraper())
        return {"status": "done", "scraper": "keejob", "new": 0}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
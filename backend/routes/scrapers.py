"""
routes/scrapers.py
------------------
Exposes POST endpoints to trigger each scraper from the frontend.
Each endpoint runs the scraper in a background thread so the HTTP
request doesn't time out on the browser side.
"""

import asyncio
import sys
import threading
from fastapi import APIRouter, BackgroundTasks, HTTPException
from database.db import get_connection

router = APIRouter(prefix="/scrapers", tags=["scrapers"])


# ─────────────────────────────────────────
# Helper: run an async scraper in a thread
# ─────────────────────────────────────────

def run_async_in_thread(coro):
    """
    Run an asyncio coroutine in a brand-new event loop inside a thread.
    On Windows, the default ProactorEventLoop doesn't support subprocess
    from a thread — so we force SelectorEventLoop which Playwright needs.
    """
    if sys.platform == "win32":
        loop = asyncio.SelectorEventLoop()  # ← the Windows fix
    else:
        loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        loop.run_until_complete(coro)
    finally:
        loop.close()


# ─────────────────────────────────────────
# GET /scrapers/status — last run info
# ─────────────────────────────────────────

@router.get("/status")
def get_scraper_status():
    conn = get_connection()
    rows = conn.execute("""
                        SELECT scraper_name, status, started_at, finished_at, records_found, records_new, notes
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
async def run_googlemaps(background_tasks: BackgroundTasks):
    try:
        from scrapers.google_maps import run_google_maps_scraper
        background_tasks.add_task(run_async_in_thread, run_google_maps_scraper())
        return {"status": "started", "scraper": "googlemaps", "new": 0}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────
# POST /scrapers/run/enrichment
# ─────────────────────────────────────────

@router.post("/run/enrichment")
async def run_enrichment(background_tasks: BackgroundTasks):
    try:
        from scrapers.website_enrichment import run_enrichment
        background_tasks.add_task(run_async_in_thread, run_enrichment())
        return {"status": "started", "scraper": "enrichment", "new": 0}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────
# POST /scrapers/run/freelances
# ─────────────────────────────────────────

@router.post("/run/freelances")
async def run_freelances(background_tasks: BackgroundTasks):
    try:
        from scrapers.opportunities import run_all as _run
        background_tasks.add_task(run_async_in_thread, _run())
        return {"status": "started", "scraper": "freelances.tn", "new": 0}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────
# POST /scrapers/run/tanitjobs
# ─────────────────────────────────────────

@router.post("/run/tanitjobs")
async def run_tanitjobs(background_tasks: BackgroundTasks):
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

        background_tasks.add_task(run_async_in_thread, _run())
        return {"status": "started", "scraper": "tanitjobs", "new": 0}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────
# POST /scrapers/run/linkedin
# ─────────────────────────────────────────

@router.post("/run/linkedin")
async def run_linkedin(background_tasks: BackgroundTasks):
    try:
        from scrapers.linkedin_scraper import run_linkedin_scraper
        background_tasks.add_task(run_async_in_thread, run_linkedin_scraper())
        return {"status": "started", "scraper": "linkedin", "new": 0}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────
# POST /scrapers/run/facebook
# ─────────────────────────────────────────

@router.post("/run/facebook")
async def run_facebook(background_tasks: BackgroundTasks):
    try:
        from scrapers.facebook_scraper import run_facebook_scraper
        background_tasks.add_task(run_async_in_thread, run_facebook_scraper())
        return {"status": "started", "scraper": "facebook", "new": 0}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────
# POST /scrapers/run/keejob
# ─────────────────────────────────────────

@router.post("/run/keejob")
async def run_keejob(background_tasks: BackgroundTasks):
    try:
        from scrapers.keejob_scraper import run_keejob_scraper
        background_tasks.add_task(run_async_in_thread, run_keejob_scraper())
        return {"status": "started", "scraper": "keejob", "new": 0}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
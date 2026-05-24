"""
routes/client_prospector.py
-----------------------------
CRUD + scraper endpoints for the Client Prospector page.
Uses ProactorEventLoop (required on Windows for Playwright subprocess support).
"""

import asyncio
import sys
from concurrent.futures import ThreadPoolExecutor
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from database.db import get_connection

router = APIRouter(prefix="/client-prospector", tags=["Client Prospector"])


# ─────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────

def ensure_table():
    conn = get_connection()
    conn.execute("""
                 CREATE TABLE IF NOT EXISTS client_prospects (
                                                                 id              INTEGER PRIMARY KEY AUTOINCREMENT,
                                                                 name            TEXT NOT NULL,
                                                                 category_id     TEXT,
                                                                 zone            TEXT,
                                                                 address         TEXT,
                                                                 phone           TEXT,
                                                                 website         TEXT,
                                                                 google_maps_url TEXT,
                                                                 google_rating   REAL,
                                                                 instagram_url   TEXT,
                                                                 facebook_url    TEXT,
                                                                 status          TEXT DEFAULT 'prospect',
                                                                 source_query    TEXT,
                                                                 notes           TEXT,
                                                                 created_at      TEXT DEFAULT (datetime('now')),
                                                                 date_updated    TEXT DEFAULT (datetime('now'))
                 )
                 """)
    conn.commit()
    conn.close()


def run_async_windows(coro):
    """
    Run an async coroutine safely on Windows.
    Playwright needs ProactorEventLoop to spawn subprocesses.
    This runs in a ThreadPoolExecutor thread with its own loop.
    """
    if sys.platform == "win32":
        loop = asyncio.ProactorEventLoop()
    else:
        loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


# ─────────────────────────────────────────
# Models
# ─────────────────────────────────────────

class ScrapeRequest(BaseModel):
    category_id: str
    max_results: int = 20

class ScrapeCustomRequest(BaseModel):
    query: str
    zone: str = "Tunis"
    max_results: int = 20

class ProspectUpdate(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None


# ─────────────────────────────────────────
# GET /client-prospector/
# ─────────────────────────────────────────

@router.get("/")
def get_prospects(category: str = None, zone: str = None, status: str = None):
    ensure_table()
    conn = get_connection()
    query = "SELECT * FROM client_prospects WHERE 1=1"
    params = []
    if category:
        query += " AND category_id = ?"
        params.append(category)
    if zone:
        query += " AND zone = ?"
        params.append(zone)
    if status:
        query += " AND status = ?"
        params.append(status)
    query += " ORDER BY created_at DESC"
    rows = conn.execute(query, params).fetchall()
    conn.close()
    return [dict(r) for r in rows]


# ─────────────────────────────────────────
# GET /client-prospector/stats
# ─────────────────────────────────────────

@router.get("/stats")
def get_stats():
    ensure_table()
    conn = get_connection()
    total = conn.execute("SELECT COUNT(*) FROM client_prospects").fetchone()[0]
    new_today = conn.execute(
        "SELECT COUNT(*) FROM client_prospects WHERE date(created_at) = date('now')"
    ).fetchone()[0]
    rows = conn.execute(
        "SELECT category_id, COUNT(*) as count FROM client_prospects GROUP BY category_id"
    ).fetchall()
    by_category = {r["category_id"]: r["count"] for r in rows}
    zone_rows = conn.execute(
        "SELECT zone, COUNT(*) as count FROM client_prospects WHERE zone IS NOT NULL GROUP BY zone ORDER BY count DESC"
    ).fetchall()
    conn.close()
    return {
        "total": total,
        "new_today": new_today,
        "by_category": by_category,
        "by_zone": [dict(r) for r in zone_rows],
    }


# ─────────────────────────────────────────
# PATCH /client-prospector/{id}
# ─────────────────────────────────────────

@router.patch("/{prospect_id}")
def update_prospect(prospect_id: int, data: ProspectUpdate):
    ensure_table()
    conn = get_connection()
    fields, params = [], []
    if data.status is not None:
        fields.append("status = ?"); params.append(data.status)
    if data.notes is not None:
        fields.append("notes = ?"); params.append(data.notes)
    if fields:
        fields.append("date_updated = datetime('now')")
        params.append(prospect_id)
        conn.execute(f"UPDATE client_prospects SET {', '.join(fields)} WHERE id = ?", params)
        conn.commit()
    conn.close()
    return {"ok": True}


# ─────────────────────────────────────────
# DELETE /client-prospector/{id}
# ─────────────────────────────────────────

@router.delete("/{prospect_id}")
def delete_prospect(prospect_id: int):
    ensure_table()
    conn = get_connection()
    conn.execute("DELETE FROM client_prospects WHERE id = ?", [prospect_id])
    conn.commit()
    conn.close()
    return {"ok": True}


# ─────────────────────────────────────────
# POST /client-prospector/scrape
# ─────────────────────────────────────────

@router.post("/scrape")
def scrape_category(req: ScrapeRequest):
    try:
        from scrapers.client_prospector import scrape_category as _scrape
        with ThreadPoolExecutor(max_workers=1) as executor:
            future = executor.submit(run_async_windows, _scrape(req.category_id, req.max_results))
            result = future.result(timeout=300)
        return {"status": "done", "category": req.category_id, **result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────
# POST /client-prospector/scrape-custom
# ─────────────────────────────────────────

@router.post("/scrape-custom")
def scrape_custom(req: ScrapeCustomRequest):
    try:
        from scrapers.client_prospector import scrape_custom_query as _scrape
        with ThreadPoolExecutor(max_workers=1) as executor:
            future = executor.submit(run_async_windows, _scrape(req.query, req.zone, req.max_results))
            result = future.result(timeout=300)
        return {"status": "done", "query": req.query, **result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────
# GET /client-prospector/export/csv
# ─────────────────────────────────────────

@router.get("/export/csv")
def export_csv():
    import csv, io
    from fastapi.responses import StreamingResponse
    ensure_table()
    conn = get_connection()
    rows = conn.execute("""
                        SELECT id, name, category_id, zone, address, phone, website,
                               instagram_url, facebook_url, google_maps_url, google_rating,
                               status, notes, created_at
                        FROM client_prospects ORDER BY created_at DESC
                        """).fetchall()
    conn.close()
    output = io.StringIO()
    if rows:
        writer = csv.DictWriter(output, fieldnames=rows[0].keys())
        writer.writeheader()
        writer.writerows([dict(r) for r in rows])
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": "attachment; filename=client_prospects.csv"}
    )
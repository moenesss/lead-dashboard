"""
routes/client_prospector.py
-----------------------------
CRUD + scraper endpoints for the Client Prospector page.
New in this version:
  - /enrich  → run website enrichment on all un-enriched prospects
  - /clear   → delete all prospects (before a full re-scrape)
  - Returns email, linkedin_url, tiktok_url in all GET responses
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
                                                                 email           TEXT,
                                                                 website         TEXT,
                                                                 google_maps_url TEXT,
                                                                 google_rating   REAL,
                                                                 instagram_url   TEXT,
                                                                 facebook_url    TEXT,
                                                                 linkedin_url    TEXT,
                                                                 tiktok_url      TEXT,
                                                                 status          TEXT DEFAULT 'prospect',
                                                                 source_query    TEXT,
                                                                 enriched        INTEGER DEFAULT 0,
                                                                 notes           TEXT,
                                                                 created_at      TEXT DEFAULT (datetime('now')),
                                                                 date_updated    TEXT DEFAULT (datetime('now'))
                 )
                 """)
    # Migration safety — add new columns if missing
    new_cols = [
        ("email",        "TEXT"),
        ("linkedin_url", "TEXT"),
        ("tiktok_url",   "TEXT"),
        ("enriched",     "INTEGER DEFAULT 0"),
    ]
    for col, typedef in new_cols:
        try:
            conn.execute(f"ALTER TABLE client_prospects ADD COLUMN {col} {typedef}")
        except Exception:
            pass
    conn.commit()
    conn.close()


def run_async_windows(coro):
    """Run an async coroutine safely on Windows with ProactorEventLoop."""
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
    max_results: int = 30

class ScrapeCustomRequest(BaseModel):
    query: str
    zone: str = "Tunis"
    max_results: int = 30

class ProspectUpdate(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None


# ─────────────────────────────────────────
# GET /client-prospector/
# ─────────────────────────────────────────

@router.get("/")
def get_prospects(
        category_id: str = None,
        zone: str = None,
        status: str = None,
):
    ensure_table()
    conn = get_connection()
    query = "SELECT * FROM client_prospects WHERE 1=1"
    params = []
    if category_id:
        query += " AND category_id = ?"
        params.append(category_id)
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
    with_email = conn.execute("SELECT COUNT(*) FROM client_prospects WHERE email IS NOT NULL AND email != ''").fetchone()[0]
    with_instagram = conn.execute("SELECT COUNT(*) FROM client_prospects WHERE instagram_url IS NOT NULL AND instagram_url != ''").fetchone()[0]
    with_phone = conn.execute("SELECT COUNT(*) FROM client_prospects WHERE phone IS NOT NULL AND phone != ''").fetchone()[0]
    not_enriched = conn.execute("SELECT COUNT(*) FROM client_prospects WHERE (enriched = 0 OR enriched IS NULL) AND website IS NOT NULL AND website != ''").fetchone()[0]

    by_status = {}
    for row in conn.execute("SELECT status, COUNT(*) as c FROM client_prospects GROUP BY status").fetchall():
        by_status[row["status"]] = row["c"]

    by_category = {}
    for row in conn.execute("SELECT category_id, COUNT(*) as c FROM client_prospects GROUP BY category_id").fetchall():
        by_category[row["category_id"]] = row["c"]

    conn.close()
    return {
        "total": total,
        "with_email": with_email,
        "with_instagram": with_instagram,
        "with_phone": with_phone,
        "pending_enrichment": not_enriched,
        "by_status": by_status,
        "by_category": by_category,
    }


# ─────────────────────────────────────────
# PATCH /client-prospector/{id}
# ─────────────────────────────────────────

@router.patch("/{prospect_id}")
def update_prospect(prospect_id: int, data: ProspectUpdate):
    ensure_table()
    conn = get_connection()
    fields = []
    params = []
    if data.status is not None:
        fields.append("status = ?"); params.append(data.status)
    if data.notes is not None:
        fields.append("notes = ?"); params.append(data.notes)
    if data.email is not None:
        fields.append("email = ?"); params.append(data.email)
    if data.phone is not None:
        fields.append("phone = ?"); params.append(data.phone)
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
# DELETE /client-prospector/clear/all
# ─────────────────────────────────────────

@router.delete("/clear/all")
def clear_all_prospects():
    """Delete ALL prospects so we can start a fresh scrape."""
    ensure_table()
    conn = get_connection()
    count = conn.execute("SELECT COUNT(*) FROM client_prospects").fetchone()[0]
    conn.execute("DELETE FROM client_prospects")
    conn.commit()
    conn.close()
    return {"ok": True, "deleted": count}


# ─────────────────────────────────────────
# POST /client-prospector/scrape
# ─────────────────────────────────────────

@router.post("/scrape")
def scrape_category(req: ScrapeRequest):
    """Scrape Google Maps for a category, then enrich websites for email + socials."""
    try:
        from scrapers.client_prospector import scrape_category as _scrape
        with ThreadPoolExecutor(max_workers=1) as executor:
            future = executor.submit(run_async_windows, _scrape(req.category_id, req.max_results))
            result = future.result(timeout=600)  # 10 min — enrichment takes time
        return {"status": "done", "category": req.category_id, **result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────
# POST /client-prospector/scrape-custom
# ─────────────────────────────────────────

@router.post("/scrape-custom")
def scrape_custom(req: ScrapeCustomRequest):
    """Custom query scrape with enrichment."""
    try:
        from scrapers.client_prospector import scrape_custom_query as _scrape
        with ThreadPoolExecutor(max_workers=1) as executor:
            future = executor.submit(run_async_windows, _scrape(req.query, req.zone, req.max_results))
            result = future.result(timeout=600)
        return {"status": "done", "query": req.query, **result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────
# POST /client-prospector/enrich
# ─────────────────────────────────────────

@router.post("/enrich")
def run_enrichment():
    """
    Visit websites of all un-enriched prospects and pull:
    email, instagram, facebook, linkedin, tiktok.
    Useful to run separately after a maps scrape, or to re-enrich.
    """
    try:
        from scrapers.client_prospector import enrich_only as _enrich
        with ThreadPoolExecutor(max_workers=1) as executor:
            future = executor.submit(run_async_windows, _enrich())
            result = future.result(timeout=600)
        return {"status": "done", **result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────
# POST /client-prospector/reset-enrichment
# ─────────────────────────────────────────

@router.post("/reset-enrichment")
def reset_enrichment():
    """Mark all prospects as un-enriched so they get re-visited."""
    ensure_table()
    conn = get_connection()
    conn.execute("UPDATE client_prospects SET enriched = 0, email = NULL, linkedin_url = NULL, tiktok_url = NULL")
    conn.commit()
    conn.close()
    return {"ok": True}


# ─────────────────────────────────────────
# GET /client-prospector/export/csv
# ─────────────────────────────────────────

@router.get("/export/csv")
def export_csv():
    """Professional CSV export with all contact columns."""
    import csv, io
    from fastapi.responses import StreamingResponse
    from datetime import datetime

    ensure_table()
    conn = get_connection()
    rows = conn.execute("""
                        SELECT
                            name        AS "Business Name",
                            category_id AS "Category",
                            zone        AS "Zone",
                            address     AS "Address",
                            phone       AS "Phone",
                            email       AS "Email",
                            website     AS "Website",
                            instagram_url AS "Instagram",
                            facebook_url  AS "Facebook",
                            linkedin_url  AS "LinkedIn",
                            tiktok_url    AS "TikTok",
                            google_maps_url AS "Google Maps",
                            google_rating   AS "Rating",
                            status          AS "Status",
                            notes           AS "Notes",
                            created_at      AS "Date Added"
                        FROM client_prospects
                        ORDER BY created_at DESC
                        """).fetchall()
    conn.close()

    output = io.StringIO()
    date_str = datetime.now().strftime("%Y-%m-%d")

    # Branding header rows
    output.write(f"LeadRadar — Client Prospects Export\n")
    output.write(f"Exported: {date_str}\n")
    output.write(f"Total Records: {len(rows)}\n")
    output.write("\n")

    if rows:
        writer = csv.DictWriter(output, fieldnames=rows[0].keys())
        writer.writeheader()
        writer.writerows([dict(r) for r in rows])

    output.seek(0)
    filename = f"client_prospects_{date_str}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
"""
routes/decision_makers.py
--------------------------
CRUD endpoints for decision makers.
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Optional
from database.db import get_connection

router = APIRouter(prefix="/decision-makers", tags=["decision_makers"])


class DecisionMakerUpdate(BaseModel):
    name: Optional[str] = None
    title: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    linkedin_url: Optional[str] = None
    notes: Optional[str] = None


# GET all decision makers (optionally filter by agency_id)
@router.get("/")
def get_decision_makers(agency_id: Optional[int] = None):
    conn = get_connection()
    if agency_id:
        rows = conn.execute("""
            SELECT dm.*, a.name as agency_name
            FROM decision_makers dm
            JOIN agencies a ON a.id = dm.agency_id
            WHERE dm.agency_id = ?
            ORDER BY dm.id DESC
        """, (agency_id,)).fetchall()
    else:
        rows = conn.execute("""
            SELECT dm.*, a.name as agency_name
            FROM decision_makers dm
            JOIN agencies a ON a.id = dm.agency_id
            ORDER BY dm.id DESC
        """).fetchall()
    conn.close()
    return [dict(r) for r in rows]


# GET single decision maker
@router.get("/{dm_id}")
def get_decision_maker(dm_id: int):
    conn = get_connection()
    row = conn.execute("""
        SELECT dm.*, a.name as agency_name
        FROM decision_makers dm
        JOIN agencies a ON a.id = dm.agency_id
        WHERE dm.id = ?
    """, (dm_id,)).fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Not found")
    return dict(row)


# PATCH — update a decision maker
@router.patch("/{dm_id}")
def update_decision_maker(dm_id: int, data: DecisionMakerUpdate):
    conn = get_connection()
    fields = {k: v for k, v in data.dict().items() if v is not None}
    if not fields:
        conn.close()
        return {"ok": True}
    sets = ", ".join(f"{k} = ?" for k in fields)
    values = list(fields.values()) + [dm_id]
    conn.execute(f"UPDATE decision_makers SET {sets} WHERE id = ?", values)
    conn.commit()
    conn.close()
    return {"ok": True}


# DELETE
@router.delete("/{dm_id}")
def delete_decision_maker(dm_id: int):
    conn = get_connection()
    conn.execute("DELETE FROM decision_makers WHERE id = ?", (dm_id,))
    conn.commit()
    conn.close()
    return {"ok": True}


# POST /decision-makers/run — trigger the scraper
@router.post("/run")
def run_scraper(background_tasks: BackgroundTasks):
    import asyncio
    import threading

    def _run():
        from scrapers.decision_makers import run_decision_makers_scraper
        loop = asyncio.new_event_loop()
        loop.run_until_complete(run_decision_makers_scraper())
        loop.close()

    t = threading.Thread(target=_run, daemon=True)
    t.start()
    return {"status": "started", "message": "Decision makers scraper running in background"}

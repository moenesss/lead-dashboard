from fastapi import APIRouter, HTTPException, BackgroundTasks
from database.db import get_connection
from models import AgencyCreate, AgencyUpdate

router = APIRouter(prefix="/agencies", tags=["Agencies"])


@router.get("/")
def get_agencies(zone: str = None, category: str = None, status: str = None):
    """Get all agencies with optional filters."""
    conn = get_connection()
    query = "SELECT * FROM v_agency_overview WHERE 1=1"
    params = []
    if zone:
        query += " AND zone = ?"
        params.append(zone)
    if category:
        query += " AND category = ?"
        params.append(category)
    if status:
        query += " AND status = ?"
        params.append(status)
    query += " ORDER BY opportunity_score DESC, date_scraped DESC"
    rows = conn.execute(query, params).fetchall()
    conn.close()
    return [dict(r) for r in rows]


@router.get("/stats")
def get_agency_stats():
    """Stats for the agencies page header."""
    conn = get_connection()
    total        = conn.execute("SELECT COUNT(*) FROM agencies").fetchone()[0]
    with_email   = conn.execute("""
                                SELECT COUNT(*) FROM agencies a
                                                         JOIN contacts c ON c.agency_id = a.id
                                WHERE c.email_general IS NOT NULL AND c.email_general != ''
                                """).fetchone()[0]
    with_phone   = conn.execute("""
                                SELECT COUNT(*) FROM agencies a
                                                         JOIN contacts c ON c.agency_id = a.id
                                WHERE c.phone IS NOT NULL AND c.phone != ''
                                """).fetchone()[0]
    by_zone      = [dict(r) for r in conn.execute(
        "SELECT zone, COUNT(*) as count FROM agencies WHERE zone IS NOT NULL GROUP BY zone ORDER BY count DESC"
    ).fetchall()]
    by_category  = [dict(r) for r in conn.execute(
        "SELECT category, COUNT(*) as count FROM agencies WHERE category IS NOT NULL GROUP BY category ORDER BY count DESC"
    ).fetchall()]
    conn.close()
    return {
        "total": total,
        "with_email": with_email,
        "with_phone": with_phone,
        "by_zone": by_zone,
        "by_category": by_category,
    }


@router.get("/{agency_id}")
def get_agency(agency_id: int):
    """Get full details of one agency including contacts and decision makers."""
    conn = get_connection()
    agency = conn.execute("SELECT * FROM agencies WHERE id = ?", [agency_id]).fetchone()
    if not agency:
        raise HTTPException(status_code=404, detail="Agency not found")
    contacts         = conn.execute("SELECT * FROM contacts WHERE agency_id = ?", [agency_id]).fetchall()
    decision_makers  = conn.execute("SELECT * FROM decision_makers WHERE agency_id = ?", [agency_id]).fetchall()
    intelligence     = conn.execute("SELECT * FROM agency_intelligence WHERE agency_id = ?", [agency_id]).fetchone()
    outreach         = conn.execute("SELECT * FROM outreach WHERE agency_id = ? ORDER BY date_sent DESC", [agency_id]).fetchall()
    conn.close()
    return {
        "agency": dict(agency),
        "contacts": [dict(c) for c in contacts],
        "decision_makers": [dict(d) for d in decision_makers],
        "intelligence": dict(intelligence) if intelligence else None,
        "outreach_history": [dict(o) for o in outreach],
    }


@router.post("/")
def create_agency(data: AgencyCreate):
    """Add a new agency manually."""
    conn = get_connection()
    try:
        cur = conn.execute("""
                           INSERT INTO agencies (name, name_arabic, category, description, zone, address,
                                                 city, website, google_maps_url, google_place_id, google_rating,
                                                 google_reviews_count, status, source, notes)
                           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
                           """, (data.name, data.name_arabic, data.category, data.description,
                                 data.zone, data.address, data.city, data.website, data.google_maps_url,
                                 data.google_place_id, data.google_rating, data.google_reviews_count,
                                 data.status, data.source, data.notes))
        conn.commit()
        return {"id": cur.lastrowid, "message": "Agency created"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        conn.close()


@router.patch("/{agency_id}")
def update_agency(agency_id: int, data: AgencyUpdate):
    """Update specific fields of an agency."""
    conn = get_connection()
    fields = {k: v for k, v in data.model_dump().items() if v is not None}
    if not fields:
        raise HTTPException(status_code=400, detail="No fields to update")
    set_clause = ", ".join(f"{k} = ?" for k in fields)
    values = list(fields.values()) + [agency_id]
    conn.execute(f"UPDATE agencies SET {set_clause}, date_updated = datetime('now') WHERE id = ?", values)
    conn.commit()
    conn.close()
    return {"message": "Agency updated"}


@router.delete("/clear/all")
def clear_all_agencies():
    """
    Delete ALL agency data: agencies, contacts, decision_makers,
    agency_intelligence. Outreach and opportunities are kept.
    Use before a full re-scrape.
    """
    conn = get_connection()
    # Child tables first (foreign keys), then parent
    counts = {}
    for table in ["agency_intelligence", "decision_makers", "contacts", "outreach"]:
        try:
            n = conn.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
            conn.execute(f"DELETE FROM {table}")
            counts[table] = n
        except Exception:
            counts[table] = 0
    n_agencies = conn.execute("SELECT COUNT(*) FROM agencies").fetchone()[0]
    conn.execute("DELETE FROM agencies")
    counts["agencies"] = n_agencies
    # Reset autoincrement counters
    for table in ["agencies", "contacts", "decision_makers", "agency_intelligence"]:
        try:
            conn.execute(f"DELETE FROM sqlite_sequence WHERE name='{table}'")
        except Exception:
            pass
    conn.commit()
    conn.close()
    return {"ok": True, "deleted": counts}


@router.delete("/{agency_id}")
def delete_agency(agency_id: int):
    """Delete a single agency and all related records."""
    conn = get_connection()
    conn.execute("DELETE FROM agencies WHERE id = ?", [agency_id])
    conn.commit()
    conn.close()
    return {"message": "Agency deleted"}


@router.get("/zones/list")
def get_zones():
    conn = get_connection()
    rows = conn.execute("SELECT DISTINCT zone FROM agencies WHERE zone IS NOT NULL ORDER BY zone").fetchall()
    conn.close()
    return [r["zone"] for r in rows]


@router.get("/categories/list")
def get_categories():
    conn = get_connection()
    rows = conn.execute("SELECT DISTINCT category FROM agencies WHERE category IS NOT NULL ORDER BY category").fetchall()
    conn.close()
    return [r["category"] for r in rows]
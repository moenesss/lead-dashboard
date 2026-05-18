from fastapi import APIRouter, HTTPException
from database.db import get_connection
from models import OpportunityCreate, OpportunityUpdate

router = APIRouter(prefix="/opportunities", tags=["Opportunities"])


@router.get("/")
def get_opportunities(platform: str = None, category: str = None, status: str = None):
    """Get all opportunities with optional filters."""
    conn = get_connection()
    query = "SELECT * FROM opportunities WHERE 1=1"
    params = []
    if platform:
        query += " AND platform = ?"
        params.append(platform)
    if category:
        query += " AND category = ?"
        params.append(category)
    if status:
        query += " AND status = ?"
        params.append(status)
    query += " ORDER BY date_scraped DESC"
    rows = conn.execute(query, params).fetchall()
    conn.close()
    return [dict(r) for r in rows]


@router.get("/new")
def get_new_opportunities():
    """Get unread new opportunities — for dashboard notifications."""
    conn = get_connection()
    rows = conn.execute("""
        SELECT * FROM opportunities
        WHERE status = 'new' AND is_read = 0
        ORDER BY date_scraped DESC
    """).fetchall()
    conn.close()
    return [dict(r) for r in rows]


@router.get("/recent")
def get_recent_opportunities():
    """Get opportunities from the last 7 days."""
    conn = get_connection()
    rows = conn.execute("SELECT * FROM v_recent_opportunities").fetchall()
    conn.close()
    return [dict(r) for r in rows]


@router.get("/{opp_id}")
def get_opportunity(opp_id: int):
    conn = get_connection()
    row = conn.execute("SELECT * FROM opportunities WHERE id = ?", [opp_id]).fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Opportunity not found")
    return dict(row)


@router.post("/")
def create_opportunity(data: OpportunityCreate):
    """Add a new opportunity (manually or from scraper)."""
    conn = get_connection()
    try:
        cur = conn.execute("""
            INSERT INTO opportunities (title, description, platform, url, external_id,
                category, type, client_name, client_location, agency_id,
                budget_min, budget_max, budget_currency, budget_type,
                posted_date, deadline, status, notes)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        """, (data.title, data.description, data.platform, data.url, data.external_id,
              data.category, data.type, data.client_name, data.client_location,
              data.agency_id, data.budget_min, data.budget_max, data.budget_currency,
              data.budget_type, data.posted_date, data.deadline, data.status, data.notes))
        conn.commit()
        return {"id": cur.lastrowid, "message": "Opportunity created"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        conn.close()


@router.patch("/{opp_id}")
def update_opportunity(opp_id: int, data: OpportunityUpdate):
    """Update status, mark as read, add notes."""
    conn = get_connection()
    fields = {k: v for k, v in data.model_dump().items() if v is not None}
    if not fields:
        raise HTTPException(status_code=400, detail="No fields to update")
    set_clause = ", ".join(f"{k} = ?" for k in fields)
    values = list(fields.values()) + [opp_id]
    conn.execute(f"UPDATE opportunities SET {set_clause} WHERE id = ?", values)
    conn.commit()
    conn.close()
    return {"message": "Opportunity updated"}


@router.delete("/{opp_id}")
def delete_opportunity(opp_id: int):
    conn = get_connection()
    conn.execute("DELETE FROM opportunities WHERE id = ?", [opp_id])
    conn.commit()
    conn.close()
    return {"message": "Opportunity deleted"}

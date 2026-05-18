from fastapi import APIRouter, HTTPException
from database.db import get_connection
from models import OutreachCreate

router = APIRouter(prefix="/outreach", tags=["Outreach"])


@router.get("/")
def get_outreach(outcome: str = None):
    """Get full outreach pipeline."""
    conn = get_connection()
    query = "SELECT * FROM v_outreach_pipeline WHERE 1=1"
    params = []
    if outcome:
        query += " AND outcome = ?"
        params.append(outcome)
    rows = conn.execute(query, params).fetchall()
    conn.close()
    return [dict(r) for r in rows]


@router.get("/pending-followup")
def get_pending_followups():
    """Get outreach records where follow-up is due."""
    conn = get_connection()
    rows = conn.execute("""
        SELECT o.*, a.name as agency_name
        FROM outreach o
        LEFT JOIN agencies a ON a.id = o.agency_id
        WHERE o.follow_up_done = 0
          AND o.follow_up_date IS NOT NULL
          AND o.follow_up_date <= date('now')
        ORDER BY o.follow_up_date ASC
    """).fetchall()
    conn.close()
    return [dict(r) for r in rows]


@router.post("/")
def log_outreach(data: OutreachCreate):
    """Log a new outreach attempt."""
    conn = get_connection()
    try:
        cur = conn.execute("""
            INSERT INTO outreach (agency_id, decision_maker_id, opportunity_id,
                channel, message_sent, responded, response_date, response_content,
                response_sentiment, follow_up_date, outcome, notes)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
        """, (data.agency_id, data.decision_maker_id, data.opportunity_id,
              data.channel, data.message_sent, data.responded, data.response_date,
              data.response_content, data.response_sentiment, data.follow_up_date,
              data.outcome, data.notes))
        conn.commit()
        return {"id": cur.lastrowid, "message": "Outreach logged"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        conn.close()


@router.patch("/{outreach_id}/responded")
def mark_responded(outreach_id: int, response_content: str, sentiment: str = "neutral"):
    """Mark an outreach as responded."""
    conn = get_connection()
    conn.execute("""
        UPDATE outreach SET
            responded = 1,
            response_date = datetime('now'),
            response_content = ?,
            response_sentiment = ?
        WHERE id = ?
    """, (response_content, sentiment, outreach_id))
    conn.commit()
    conn.close()
    return {"message": "Marked as responded"}


@router.patch("/{outreach_id}/followup-done")
def mark_followup_done(outreach_id: int):
    """Mark follow-up as completed."""
    conn = get_connection()
    conn.execute("UPDATE outreach SET follow_up_done = 1 WHERE id = ?", [outreach_id])
    conn.commit()
    conn.close()
    return {"message": "Follow-up marked done"}

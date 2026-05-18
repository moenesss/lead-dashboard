from fastapi import APIRouter, HTTPException
from database.db import get_connection
from models import ContactCreate, DecisionMakerCreate, IntelligenceCreate

router = APIRouter(tags=["Contacts & Intelligence"])


# ─────────────────────────────────────────
# CONTACTS
# ─────────────────────────────────────────
contacts_router = APIRouter(prefix="/contacts")

@contacts_router.post("/")
def add_contact(data: ContactCreate):
    conn = get_connection()
    try:
        cur = conn.execute("""
            INSERT INTO contacts (agency_id, phone, phone_2, whatsapp, email_general,
                email_decision_maker, instagram_url, facebook_url, linkedin_url,
                tiktok_url, youtube_url, source)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
        """, (data.agency_id, data.phone, data.phone_2, data.whatsapp,
              data.email_general, data.email_decision_maker, data.instagram_url,
              data.facebook_url, data.linkedin_url, data.tiktok_url,
              data.youtube_url, data.source))
        conn.commit()
        return {"id": cur.lastrowid, "message": "Contact added"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        conn.close()

@contacts_router.get("/{agency_id}")
def get_contacts(agency_id: int):
    conn = get_connection()
    rows = conn.execute("SELECT * FROM contacts WHERE agency_id = ?", [agency_id]).fetchall()
    conn.close()
    return [dict(r) for r in rows]

@contacts_router.delete("/{contact_id}")
def delete_contact(contact_id: int):
    conn = get_connection()
    conn.execute("DELETE FROM contacts WHERE id = ?", [contact_id])
    conn.commit()
    conn.close()
    return {"message": "Contact deleted"}


# ─────────────────────────────────────────
# DECISION MAKERS
# ─────────────────────────────────────────
dm_router = APIRouter(prefix="/decision-makers")

@dm_router.post("/")
def add_decision_maker(data: DecisionMakerCreate):
    conn = get_connection()
    try:
        cur = conn.execute("""
            INSERT INTO decision_makers (agency_id, full_name, first_name, last_name,
                job_title, email, phone, whatsapp, linkedin_url, instagram_url, source, notes)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
        """, (data.agency_id, data.full_name, data.first_name, data.last_name,
              data.job_title, data.email, data.phone, data.whatsapp,
              data.linkedin_url, data.instagram_url, data.source, data.notes))
        conn.commit()
        return {"id": cur.lastrowid, "message": "Decision maker added"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        conn.close()

@dm_router.get("/{agency_id}")
def get_decision_makers(agency_id: int):
    conn = get_connection()
    rows = conn.execute("SELECT * FROM decision_makers WHERE agency_id = ?", [agency_id]).fetchall()
    conn.close()
    return [dict(r) for r in rows]

@dm_router.delete("/{dm_id}")
def delete_decision_maker(dm_id: int):
    conn = get_connection()
    conn.execute("DELETE FROM decision_makers WHERE id = ?", [dm_id])
    conn.commit()
    conn.close()
    return {"message": "Decision maker deleted"}


# ─────────────────────────────────────────
# AGENCY INTELLIGENCE
# ─────────────────────────────────────────
intel_router = APIRouter(prefix="/intelligence")

@intel_router.post("/")
def add_intelligence(data: IntelligenceCreate):
    conn = get_connection()
    try:
        cur = conn.execute("""
            INSERT OR REPLACE INTO agency_intelligence (
                agency_id, instagram_followers, instagram_posts_count, instagram_last_post,
                instagram_post_frequency, instagram_content_quality, instagram_content_gaps,
                facebook_followers, facebook_last_post, facebook_activity,
                linkedin_followers, linkedin_last_post, linkedin_employee_count,
                last_job_posted, hired_videographer_before, services_they_offer,
                opportunity_score, pitch_angle)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        """, (data.agency_id, data.instagram_followers, data.instagram_posts_count,
              data.instagram_last_post, data.instagram_post_frequency,
              data.instagram_content_quality, data.instagram_content_gaps,
              data.facebook_followers, data.facebook_last_post, data.facebook_activity,
              data.linkedin_followers, data.linkedin_last_post, data.linkedin_employee_count,
              data.last_job_posted, data.hired_videographer_before,
              data.services_they_offer, data.opportunity_score, data.pitch_angle))
        conn.commit()
        return {"id": cur.lastrowid, "message": "Intelligence saved"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        conn.close()

@intel_router.get("/{agency_id}")
def get_intelligence(agency_id: int):
    conn = get_connection()
    row = conn.execute("SELECT * FROM agency_intelligence WHERE agency_id = ?", [agency_id]).fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="No intelligence found for this agency")
    return dict(row)

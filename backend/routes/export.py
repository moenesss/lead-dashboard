"""
routes/export.py
-----------------
Export endpoints — download data as CSV files.
"""

import csv
import io
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from database.db import get_connection

router = APIRouter(prefix="/export", tags=["export"])


def clean_value(v):
    """Sanitize a value for CSV output."""
    if v is None:
        return ""
    s = str(v)
    # Strip Google Maps icon characters that pollute address/phone fields
    s = s.replace("\ue0c8", "").replace("\ue0b0", "").strip()
    return s


def make_csv_response(rows, filename):
    """Convert a list of dicts to a CSV StreamingResponse."""
    if not rows:
        output = io.StringIO()
        output.write("No data found\n")
        output.seek(0)
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )

    output = io.StringIO()
    writer = csv.DictWriter(
        output,
        fieldnames=rows[0].keys(),
        quoting=csv.QUOTE_ALL,
        lineterminator="\r\n",
        extrasaction="ignore",
    )
    writer.writeheader()
    for row in rows:
        writer.writerow({k: clean_value(v) for k, v in row.items()})
    output.seek(0)

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


def make_csv_string(rows):
    """Convert a list of dicts to a CSV string (used for ZIP export)."""
    if not rows:
        return "No data\n"
    buf = io.StringIO()
    writer = csv.DictWriter(
        buf,
        fieldnames=dict(rows[0]).keys(),
        quoting=csv.QUOTE_ALL,
        lineterminator="\r\n",
        extrasaction="ignore",
    )
    writer.writeheader()
    for row in rows:
        writer.writerow({k: clean_value(v) for k, v in dict(row).items()})
    return buf.getvalue()


# ─────────────────────────────────────────
# GET /export/agencies
# ─────────────────────────────────────────

@router.get("/agencies")
def export_agencies():
    conn = get_connection()
    rows = conn.execute("""
                        SELECT
                            a.id,
                            a.name,
                            a.category,
                            a.zone,
                            a.address,
                            a.website,
                            a.phone,
                            a.email_general,
                            a.google_rating,
                            a.google_reviews_count,
                            a.status,
                            a.source,
                            a.notes,
                            c.instagram_url,
                            c.facebook_url,
                            c.linkedin_url,
                            c.tiktok_url,
                            c.youtube_url,
                            c.whatsapp,
                            a.created_at
                        FROM agencies a
                                 LEFT JOIN contacts c ON c.agency_id = a.id
                        ORDER BY a.name ASC
                        """).fetchall()
    conn.close()
    return make_csv_response([dict(r) for r in rows], "agencies.csv")


# ─────────────────────────────────────────
# GET /export/opportunities
# ─────────────────────────────────────────

@router.get("/opportunities")
def export_opportunities():
    conn = get_connection()
    rows = conn.execute("""
                        SELECT
                            id,
                            title,
                            platform,
                            category,
                            type,
                            client_name,
                            budget_min,
                            budget_max,
                            budget_currency,
                            status,
                            posted_date,
                            url,
                            description,
                            date_scraped
                        FROM opportunities
                        ORDER BY posted_date DESC, id DESC
                        """).fetchall()
    conn.close()
    return make_csv_response([dict(r) for r in rows], "opportunities.csv")


# ─────────────────────────────────────────
# GET /export/decision-makers
# ─────────────────────────────────────────

@router.get("/decision-makers")
def export_decision_makers():
    conn = get_connection()
    rows = conn.execute("""
                        SELECT
                            dm.id,
                            a.name  AS agency_name,
                            a.zone  AS agency_zone,
                            dm.name AS contact_name,
                            dm.title,
                            dm.email,
                            dm.phone,
                            dm.linkedin_url,
                            dm.source,
                            dm.notes,
                            dm.created_at
                        FROM decision_makers dm
                                 JOIN agencies a ON a.id = dm.agency_id
                        ORDER BY a.name ASC
                        """).fetchall()
    conn.close()
    return make_csv_response([dict(r) for r in rows], "decision_makers.csv")


# ─────────────────────────────────────────
# GET /export/outreach
# ─────────────────────────────────────────

@router.get("/outreach")
def export_outreach():
    conn = get_connection()
    rows = conn.execute("""
                        SELECT
                            o.id,
                            COALESCE(a.name, o.agency_name_manual) AS agency_name,
                            o.contact_name,
                            o.channel,
                            o.subject,
                            o.status,
                            o.responded,
                            o.follow_up_date,
                            o.follow_up_done,
                            o.sent_at,
                            o.notes
                        FROM outreach o
                                 LEFT JOIN agencies a ON a.id = o.agency_id
                        ORDER BY o.sent_at DESC
                        """).fetchall()
    conn.close()
    return make_csv_response([dict(r) for r in rows], "outreach.csv")


# ─────────────────────────────────────────
# GET /export/all  — one ZIP with everything
# ─────────────────────────────────────────

@router.get("/all")
def export_all():
    import zipfile

    conn = get_connection()

    datasets = {
        "agencies.csv": conn.execute("""
                                     SELECT a.id, a.name, a.category, a.zone, a.address, a.website,
                                            a.phone, a.email_general, a.google_rating, a.status, a.source,
                                            c.instagram_url, c.facebook_url, c.linkedin_url
                                     FROM agencies a LEFT JOIN contacts c ON c.agency_id = a.id
                                     ORDER BY a.name
                                     """).fetchall(),

        "opportunities.csv": conn.execute("""
                                          SELECT id, title, platform, category, type, client_name,
                                                 budget_min, budget_max, budget_currency, status, posted_date, url
                                          FROM opportunities ORDER BY posted_date DESC
                                          """).fetchall(),

        "decision_makers.csv": conn.execute("""
                                            SELECT dm.id, a.name AS agency, dm.name AS contact,
                                                   dm.title, dm.email, dm.phone, dm.linkedin_url, dm.source
                                            FROM decision_makers dm
                                                     JOIN agencies a ON a.id = dm.agency_id
                                            ORDER BY a.name
                                            """).fetchall() if _table_exists(conn, "decision_makers") else [],

        "outreach.csv": conn.execute("""
                                     SELECT o.id, COALESCE(a.name, o.agency_name_manual) AS agency,
                                            o.contact_name, o.channel, o.subject, o.status,
                                            o.responded, o.sent_at
                                     FROM outreach o LEFT JOIN agencies a ON a.id = o.agency_id
                                     ORDER BY o.sent_at DESC
                                     """).fetchall(),
    }

    conn.close()

    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        for filename, rows in datasets.items():
            zf.writestr(filename, make_csv_string(rows))  # ✅ uses clean_value + QUOTE_ALL

    zip_buffer.seek(0)
    return StreamingResponse(
        iter([zip_buffer.getvalue()]),
        media_type="application/zip",
        headers={"Content-Disposition": "attachment; filename=leadradar_export.zip"}
    )


def _table_exists(conn, table_name):
    row = conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
        (table_name,)
    ).fetchone()
    return row is not None
"""
routes/export.py
-----------------
Professional CSV exports for all data sections.

Header block uses proper CSV cells (no # comments) so Excel opens
the file natively without any parsing issues:

  Row 1:  App name  |  Section label
  Row 2:  Exported: date  |  Records: N
  Row 3:  (blank separator)
  Row 4:  Column headers  ← data table starts here
  Row 5+: Data rows

ZIP export bundles all 5 datasets in one file.
"""

import csv
import io
import zipfile
from datetime import datetime
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from database.db import get_connection

router = APIRouter(prefix="/export", tags=["export"])

APP_NAME = "LeadRadar — Tunisia Creative"


# ─────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────

def today() -> str:
    return datetime.now().strftime("%Y-%m-%d")

def ts() -> str:
    return datetime.now().strftime("%Y-%m-%d %H:%M")

def clean(v) -> str:
    """Sanitise a single value for CSV output."""
    if v is None:
        return ""
    s = str(v)
    s = s.replace("\ue0c8", "").replace("\ue0b0", "").strip()
    return s

def bool_label(v) -> str:
    if v is None:
        return ""
    return "Yes" if int(v) else "No"


def make_csv_bytes(rows: list, section_label: str) -> str:
    """
    Build a branded CSV string.

    Excel-friendly header block (proper CSV cells, no # comments):
      Row 1 — App name + section
      Row 2 — Export timestamp + record count
      Row 3 — Blank separator
      Row 4 — Column headers
      Row 5+ — Data
    """
    buf = io.StringIO()
    meta = csv.writer(buf, quoting=csv.QUOTE_ALL, lineterminator="\r\n")

    # Branding rows — stored as real CSV cells, not comments
    meta.writerow([f"{APP_NAME}  |  {section_label}"])
    meta.writerow([f"Exported: {ts()}", f"Records: {len(rows)}"])
    meta.writerow([])   # blank separator

    if not rows:
        meta.writerow(["No records found."])
        return buf.getvalue()

    # Data table
    data = csv.DictWriter(
        buf,
        fieldnames=rows[0].keys(),
        quoting=csv.QUOTE_ALL,
        lineterminator="\r\n",
        extrasaction="ignore",
    )
    data.writeheader()
    for row in rows:
        data.writerow({k: clean(v) for k, v in row.items()})

    return buf.getvalue()


def stream_csv(content: str, filename: str) -> StreamingResponse:
    # UTF-8 BOM so Excel auto-detects encoding on Windows
    bom = "\ufeff"
    return StreamingResponse(
        iter([bom + content]),
        media_type="text/csv; charset=utf-8-sig",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


def _table_exists(conn, name: str) -> bool:
    return conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name=?", (name,)
    ).fetchone() is not None


# ─────────────────────────────────────────
# AGENCIES
# ─────────────────────────────────────────

@router.get("/agencies")
def export_agencies():
    conn = get_connection()
    raw = conn.execute("""
                       SELECT
                           a.id                        AS "ID",
                           a.name                      AS "Agency Name",
                           a.category                  AS "Category",
                           a.zone                      AS "Zone",
                           a.city                      AS "City",
                           a.address                   AS "Address",
                           a.website                   AS "Website",
                           a.google_rating             AS "Google Rating",
                           a.google_reviews_count      AS "Reviews Count",
                           a.status                    AS "Status",
                           a.source                    AS "Source",
                           c.phone                     AS "Phone",
                           c.whatsapp                  AS "WhatsApp",
                           c.email_general             AS "Email",
                           c.instagram_url             AS "Instagram",
                           c.facebook_url              AS "Facebook",
                           c.linkedin_url              AS "LinkedIn",
                           c.tiktok_url                AS "TikTok",
                           c.youtube_url               AS "YouTube",
                           ai.opportunity_score        AS "Opportunity Score (1-10)",
                           ai.pitch_angle              AS "Pitch Angle",
                           ai.instagram_content_quality AS "IG Content Quality",
                           ai.hired_videographer_before AS "Hired Videographer Before",
                           a.notes                     AS "Notes",
                           a.date_scraped              AS "Date Added"
                       FROM agencies a
                                LEFT JOIN contacts c             ON c.agency_id = a.id
                                LEFT JOIN agency_intelligence ai ON ai.agency_id = a.id
                       ORDER BY a.name ASC
                       """).fetchall()
    conn.close()

    rows = []
    for r in raw:
        d = dict(r)
        d["Hired Videographer Before"] = bool_label(d.get("Hired Videographer Before"))
        rows.append(d)

    return stream_csv(make_csv_bytes(rows, "Agencies"), f"agencies_{today()}.csv")


# ─────────────────────────────────────────
# OPPORTUNITIES
# ─────────────────────────────────────────

@router.get("/opportunities")
def export_opportunities():
    conn = get_connection()
    raw = conn.execute("""
                       SELECT
                           id              AS "ID",
                           title           AS "Job Title",
                           platform        AS "Platform",
                           category        AS "Category",
                           type            AS "Contract Type",
                           client_name     AS "Client / Company",
                           client_location AS "Client Location",
                           budget_min      AS "Budget Min (TND)",
                           budget_max      AS "Budget Max (TND)",
                           budget_currency AS "Currency",
                           budget_type     AS "Budget Type",
                           status          AS "Status",
                           posted_date     AS "Posted Date",
                           deadline        AS "Deadline",
                           url             AS "Link",
                           notes           AS "Notes",
                           date_scraped    AS "Date Scraped"
                       FROM opportunities
                       ORDER BY posted_date DESC, id DESC
                       """).fetchall()
    conn.close()

    rows = [dict(r) for r in raw]
    return stream_csv(make_csv_bytes(rows, "Opportunities"), f"opportunities_{today()}.csv")


# ─────────────────────────────────────────
# DECISION MAKERS
# ─────────────────────────────────────────

@router.get("/decision-makers")
def export_decision_makers():
    conn = get_connection()
    if not _table_exists(conn, "decision_makers"):
        conn.close()
        return stream_csv(make_csv_bytes([], "Decision Makers"), f"decision_makers_{today()}.csv")

    raw = conn.execute("""
                       SELECT
                           dm.id           AS "ID",
                           a.name          AS "Agency",
                           a.zone          AS "Agency Zone",
                           a.category      AS "Agency Category",
                           dm.name         AS "Full Name",
                           dm.title        AS "Job Title",
                           dm.email        AS "Email",
                           dm.phone        AS "Phone",
                           dm.linkedin_url AS "LinkedIn",
                           dm.source       AS "Source",
                           dm.notes        AS "Notes",
                           dm.created_at   AS "Date Added"
                       FROM decision_makers dm
                                JOIN agencies a ON a.id = dm.agency_id
                       ORDER BY a.name ASC, dm.name ASC
                       """).fetchall()
    conn.close()

    rows = [dict(r) for r in raw]
    return stream_csv(make_csv_bytes(rows, "Decision Makers"), f"decision_makers_{today()}.csv")


# ─────────────────────────────────────────
# OUTREACH
# ─────────────────────────────────────────

@router.get("/outreach")
def export_outreach():
    conn = get_connection()
    raw = conn.execute("""
                       SELECT
                           o.id                    AS "ID",
                           COALESCE(a.name, '')    AS "Agency",
                           a.zone                  AS "Zone",
                           o.channel               AS "Channel",
                           o.message_sent          AS "Message Sent",
                           o.date_sent             AS "Date Sent",
                           o.responded             AS "Responded",
                           o.response_date         AS "Response Date",
                           o.response_sentiment    AS "Sentiment",
                           o.follow_up_date        AS "Follow-up Date",
                           o.follow_up_done        AS "Follow-up Done",
                           o.outcome               AS "Outcome",
                           o.notes                 AS "Notes"
                       FROM outreach o
                                LEFT JOIN agencies a ON a.id = o.agency_id
                       ORDER BY o.date_sent DESC
                       """).fetchall()
    conn.close()

    rows = []
    for r in raw:
        d = dict(r)
        d["Responded"]      = bool_label(d.get("Responded"))
        d["Follow-up Done"] = bool_label(d.get("Follow-up Done"))
        rows.append(d)

    return stream_csv(make_csv_bytes(rows, "Outreach"), f"outreach_{today()}.csv")


# ─────────────────────────────────────────
# CLIENT PROSPECTS
# ─────────────────────────────────────────

@router.get("/client-prospects")
def export_client_prospects():
    conn = get_connection()
    if not _table_exists(conn, "client_prospects"):
        conn.close()
        return stream_csv(make_csv_bytes([], "Client Prospects"), f"client_prospects_{today()}.csv")

    raw = conn.execute("""
                       SELECT
                           id              AS "ID",
                           name            AS "Business Name",
                           category_id     AS "Category",
                           zone            AS "Zone",
                           address         AS "Address",
                           phone           AS "Phone",
                           email           AS "Email",
                           website         AS "Website",
                           instagram_url   AS "Instagram",
                           facebook_url    AS "Facebook",
                           linkedin_url    AS "LinkedIn",
                           tiktok_url      AS "TikTok",
                           google_maps_url AS "Google Maps",
                           google_rating   AS "Google Rating",
                           status          AS "Status",
                           notes           AS "Notes",
                           created_at      AS "Date Added"
                       FROM client_prospects
                       ORDER BY created_at DESC
                       """).fetchall()
    conn.close()

    rows = [dict(r) for r in raw]
    return stream_csv(make_csv_bytes(rows, "Client Prospects"), f"client_prospects_{today()}.csv")


# ─────────────────────────────────────────
# ALL — ZIP bundle
# ─────────────────────────────────────────

@router.get("/all")
def export_all():
    """Download all 5 datasets as a single dated ZIP archive."""
    conn = get_connection()

    agencies_rows = [dict(r) for r in conn.execute("""
                                                   SELECT
                                                       a.id AS "ID", a.name AS "Agency Name", a.category AS "Category",
                                                       a.zone AS "Zone", a.address AS "Address", a.website AS "Website",
                                                       a.google_rating AS "Google Rating", a.status AS "Status",
                                                       c.phone AS "Phone", c.email_general AS "Email",
                                                       c.instagram_url AS "Instagram", c.facebook_url AS "Facebook",
                                                       c.linkedin_url AS "LinkedIn", a.notes AS "Notes",
                                                       a.date_scraped AS "Date Added"
                                                   FROM agencies a LEFT JOIN contacts c ON c.agency_id = a.id
                                                   ORDER BY a.name ASC
                                                   """).fetchall()]

    opps_rows = [dict(r) for r in conn.execute("""
                                               SELECT
                                                   id AS "ID", title AS "Job Title", platform AS "Platform",
                                                   category AS "Category", type AS "Contract Type",
                                                   client_name AS "Client", budget_min AS "Budget Min (TND)",
                                                   budget_max AS "Budget Max (TND)", status AS "Status",
                                                   posted_date AS "Posted Date", url AS "Link",
                                                   date_scraped AS "Date Scraped"
                                               FROM opportunities ORDER BY posted_date DESC
                                               """).fetchall()]

    dm_rows = []
    if _table_exists(conn, "decision_makers"):
        dm_rows = [dict(r) for r in conn.execute("""
                                                 SELECT dm.id AS "ID", a.name AS "Agency", a.zone AS "Zone",
                                                        dm.name AS "Full Name", dm.title AS "Job Title",
                                                        dm.email AS "Email", dm.phone AS "Phone",
                                                        dm.linkedin_url AS "LinkedIn", dm.created_at AS "Date Added"
                                                 FROM decision_makers dm
                                                          JOIN agencies a ON a.id = dm.agency_id
                                                 ORDER BY a.name ASC
                                                 """).fetchall()]

    outreach_raw = conn.execute("""
                                SELECT o.id AS "ID", COALESCE(a.name,'') AS "Agency",
                                       o.channel AS "Channel", o.date_sent AS "Date Sent",
                                       o.responded AS "Responded", o.outcome AS "Outcome",
                                       o.follow_up_date AS "Follow-up Date", o.notes AS "Notes"
                                FROM outreach o LEFT JOIN agencies a ON a.id = o.agency_id
                                ORDER BY o.date_sent DESC
                                """).fetchall()
    outreach_rows = []
    for r in outreach_raw:
        d = dict(r)
        d["Responded"] = bool_label(d.get("Responded"))
        outreach_rows.append(d)

    prospect_rows = []
    if _table_exists(conn, "client_prospects"):
        prospect_rows = [dict(r) for r in conn.execute("""
                                                       SELECT id AS "ID", name AS "Business Name", category_id AS "Category",
                                                              zone AS "Zone", phone AS "Phone", email AS "Email",
                                                              website AS "Website", instagram_url AS "Instagram",
                                                              facebook_url AS "Facebook", linkedin_url AS "LinkedIn",
                                                              google_rating AS "Rating", status AS "Status",
                                                              created_at AS "Date Added"
                                                       FROM client_prospects ORDER BY created_at DESC
                                                       """).fetchall()]

    conn.close()

    # Build ZIP — each file gets UTF-8 BOM so Excel opens correctly
    bom = "\ufeff"
    zip_buf = io.BytesIO()
    with zipfile.ZipFile(zip_buf, "w", zipfile.ZIP_DEFLATED) as zf:
        datasets = [
            (f"agencies_{today()}.csv",        agencies_rows,  "Agencies"),
            (f"opportunities_{today()}.csv",    opps_rows,      "Opportunities"),
            (f"decision_makers_{today()}.csv",  dm_rows,        "Decision Makers"),
            (f"outreach_{today()}.csv",         outreach_rows,  "Outreach"),
            (f"client_prospects_{today()}.csv", prospect_rows,  "Client Prospects"),
        ]
        for fname, rows, label in datasets:
            content = bom + make_csv_bytes(rows, label)
            zf.writestr(fname, content.encode("utf-8-sig"))

    zip_buf.seek(0)
    return StreamingResponse(
        iter([zip_buf.getvalue()]),
        media_type="application/zip",
        headers={"Content-Disposition": f"attachment; filename=leadradar_export_{today()}.zip"},
    )
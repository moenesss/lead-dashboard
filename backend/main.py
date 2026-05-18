from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database.db import init_db, db_stats
from routes.agencies import router as agencies_router
from routes.contacts import contacts_router, dm_router as contacts_dm_router, intel_router
from routes.opportunities import router as opportunities_router
from routes.outreach import router as outreach_router
from routes.scrapers import router as scrapers_router
from routes.decision_makers import router as decision_makers_router
from routes.export import router as export_router

# ─────────────────────────────────────────
# App Setup
# ─────────────────────────────────────────
app = FastAPI(
    title="Lead Dashboard API",
    description="Tunisian creative freelancer lead generation system",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────
# Routes
# ─────────────────────────────────────────
app.include_router(agencies_router)
app.include_router(contacts_router)
app.include_router(contacts_dm_router)
app.include_router(intel_router)
app.include_router(opportunities_router)
app.include_router(outreach_router)
app.include_router(scrapers_router)
app.include_router(decision_makers_router)
app.include_router(export_router)


# ─────────────────────────────────────────
# Dashboard Stats Endpoint
# ─────────────────────────────────────────
@app.get("/stats")
def get_stats():
    from database.db import get_connection
    conn = get_connection()
    stats = {
        "total_agencies":      conn.execute("SELECT COUNT(*) FROM agencies").fetchone()[0],
        "total_opportunities": conn.execute("SELECT COUNT(*) FROM opportunities").fetchone()[0],
        "new_opportunities":   conn.execute("SELECT COUNT(*) FROM opportunities WHERE status='new' AND is_read=0").fetchone()[0],
        "total_outreach":      conn.execute("SELECT COUNT(*) FROM outreach").fetchone()[0],
        "outreach_responded":  conn.execute("SELECT COUNT(*) FROM outreach WHERE responded=1").fetchone()[0],
        "pending_followups":   conn.execute("SELECT COUNT(*) FROM outreach WHERE follow_up_done=0 AND follow_up_date <= date('now')").fetchone()[0],
        "agencies_by_zone":    [dict(r) for r in conn.execute("SELECT zone, COUNT(*) as count FROM agencies WHERE zone IS NOT NULL GROUP BY zone ORDER BY count DESC").fetchall()],
        "opps_by_platform":    [dict(r) for r in conn.execute("SELECT platform, COUNT(*) as count FROM opportunities GROUP BY platform ORDER BY count DESC").fetchall()],
        "total_decision_makers": conn.execute("SELECT COUNT(*) FROM decision_makers").fetchone()[0] if _table_exists(conn, "decision_makers") else 0,
    }
    conn.close()
    return stats

def _table_exists(conn, table_name):
    row = conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name=?", (table_name,)
    ).fetchone()
    return row is not None


# ─────────────────────────────────────────
# Startup
# ─────────────────────────────────────────
@app.on_event("startup")
def startup():
    init_db()
    print("🚀 Lead Dashboard API is running")
    db_stats()


@app.get("/")
def root():
    return {"message": "Lead Dashboard API", "docs": "/docs"}
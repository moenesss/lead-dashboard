import sqlite3
import os
from pathlib import Path

DB_PATH = Path(__file__).parent / "leads.db"
SCHEMA_PATH = Path(__file__).parent / "schema.sql"


def get_connection() -> sqlite3.Connection:
    """Get a database connection with row factory for dict-like access."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("PRAGMA journal_mode = WAL")  # Better performance
    return conn


def init_db():
    """Initialize the database by running the schema SQL."""
    if not SCHEMA_PATH.exists():
        raise FileNotFoundError(f"Schema file not found at {SCHEMA_PATH}")

    conn = get_connection()
    with open(SCHEMA_PATH, "r", encoding="utf-8") as f:
        schema = f.read()

    conn.executescript(schema)
    conn.commit()
    conn.close()
    print(f"✅ Database initialized at: {DB_PATH}")


def db_stats():
    """Print a summary of what's in the database."""
    conn = get_connection()
    tables = ["agencies", "contacts", "decision_makers",
              "agency_intelligence", "opportunities", "outreach", "scraper_logs"]
    print("\n📊 Database Stats:")
    print("-" * 35)
    for table in tables:
        count = conn.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
        print(f"  {table:<25} {count:>5} rows")
    conn.close()


if __name__ == "__main__":
    init_db()
    db_stats()

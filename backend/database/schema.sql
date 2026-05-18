-- ============================================================
-- LEAD DASHBOARD - Full Database Schema
-- For: Tunisian Videographer/Photographer Lead System
-- ============================================================

PRAGMA foreign_keys = ON;

-- ============================================================
-- TABLE 1: AGENCIES
-- Core table — every production house / marketing agency found
-- ============================================================
CREATE TABLE IF NOT EXISTS agencies (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,

    -- Basic Info
    name                TEXT NOT NULL,
    name_arabic         TEXT,                          -- Arabic name if found
    category            TEXT,                          -- 'Marketing Agency', 'Production House', 'Digital Agency', etc.
    description         TEXT,                          -- Short description from Google/website
    zone                TEXT,                          -- 'Berges du Lac', 'CUN', 'Ennasr', 'Centre Ville', etc.
    address             TEXT,
    city                TEXT DEFAULT 'Tunis',
    website             TEXT,
    google_maps_url     TEXT,
    google_place_id     TEXT UNIQUE,                   -- Google Places API unique ID
    google_rating       REAL,                          -- e.g. 4.3
    google_reviews_count INTEGER,

    -- Status
    status              TEXT DEFAULT 'active',         -- 'active', 'inactive', 'closed'
    verified            INTEGER DEFAULT 0,             -- 1 = manually verified by you

    -- Metadata
    source              TEXT,                          -- 'google_maps', 'linkedin', 'facebook', 'manual', etc.
    date_scraped        TEXT DEFAULT (datetime('now')),
    date_updated        TEXT DEFAULT (datetime('now')),
    notes               TEXT                           -- Your personal notes
);

-- ============================================================
-- TABLE 2: CONTACTS
-- All contact info for an agency (multiple per agency)
-- ============================================================
CREATE TABLE IF NOT EXISTS contacts (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    agency_id           INTEGER NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,

    -- Phone & Messaging
    phone               TEXT,
    phone_2             TEXT,
    whatsapp            TEXT,

    -- Email
    email_general       TEXT,                          -- contact@agency.tn
    email_decision_maker TEXT,                         -- firstname.lastname@agency.tn

    -- Social Media (Agency Pages)
    instagram_url       TEXT,
    facebook_url        TEXT,
    linkedin_url        TEXT,
    tiktok_url          TEXT,
    youtube_url         TEXT,

    -- Metadata
    source              TEXT,                          -- where this contact info was found
    date_scraped        TEXT DEFAULT (datetime('now')),
    date_updated        TEXT DEFAULT (datetime('now'))
);

-- ============================================================
-- TABLE 3: DECISION MAKERS
-- Individual people at the agency you can reach out to
-- ============================================================
CREATE TABLE IF NOT EXISTS decision_makers (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    agency_id           INTEGER NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,

    -- Personal Info
    full_name           TEXT NOT NULL,
    first_name          TEXT,
    last_name           TEXT,
    job_title           TEXT,                          -- 'Creative Director', 'Content Manager', 'Producer'

    -- Contact
    email               TEXT,
    phone               TEXT,
    whatsapp            TEXT,

    -- Social
    linkedin_url        TEXT,
    instagram_url       TEXT,

    -- Metadata
    source              TEXT,
    date_scraped        TEXT DEFAULT (datetime('now')),
    notes               TEXT
);

-- ============================================================
-- TABLE 4: AGENCY INTELLIGENCE
-- What you know about their content & activity
-- ============================================================
CREATE TABLE IF NOT EXISTS agency_intelligence (
    id                      INTEGER PRIMARY KEY AUTOINCREMENT,
    agency_id               INTEGER NOT NULL UNIQUE REFERENCES agencies(id) ON DELETE CASCADE,

    -- Instagram Activity
    instagram_followers     INTEGER,
    instagram_posts_count   INTEGER,
    instagram_last_post     TEXT,                      -- date
    instagram_post_frequency TEXT,                     -- 'daily', '3x/week', 'weekly', 'inactive'
    instagram_content_quality TEXT,                    -- 'high', 'medium', 'low'
    instagram_content_gaps  TEXT,                      -- your analysis: 'no video content', 'bad reels', etc.

    -- Facebook Activity
    facebook_followers      INTEGER,
    facebook_last_post      TEXT,
    facebook_activity       TEXT,                      -- 'active', 'low', 'inactive'

    -- LinkedIn Activity
    linkedin_followers      INTEGER,
    linkedin_last_post      TEXT,
    linkedin_employee_count INTEGER,

    -- Hiring Signals
    last_job_posted         TEXT,                      -- date of last job posting found
    hired_videographer_before INTEGER DEFAULT 0,       -- 1 = yes (evidence found)
    services_they_offer     TEXT,                      -- comma-separated

    -- Your Analysis
    opportunity_score       INTEGER DEFAULT 0,         -- 1-10, your rating of how promising they are
    pitch_angle             TEXT,                      -- your specific pitch idea for this agency
    date_analyzed           TEXT DEFAULT (datetime('now'))
);

-- ============================================================
-- TABLE 5: OPPORTUNITIES
-- Active job posts / project requests found on job boards
-- ============================================================
CREATE TABLE IF NOT EXISTS opportunities (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,

    -- Post Info
    title               TEXT NOT NULL,
    description         TEXT,
    platform            TEXT NOT NULL,                 -- 'freelances.tn', 'tanitjobs', 'keejob', 'linkedin', 'facebook'
    url                 TEXT,
    external_id         TEXT,                          -- ID from the platform if available

    -- Classification
    category            TEXT,                          -- 'video', 'photo', 'design', 'mixed'
    type                TEXT,                          -- 'freelance', 'full-time', 'part-time', 'internship'

    -- Client Info
    client_name         TEXT,
    client_location     TEXT,
    agency_id           INTEGER REFERENCES agencies(id), -- link to agency if identified

    -- Budget
    budget_min          REAL,
    budget_max          REAL,
    budget_currency     TEXT DEFAULT 'TND',
    budget_type         TEXT,                          -- 'fixed', 'monthly', 'hourly', 'negotiable'

    -- Timing
    posted_date         TEXT,
    deadline            TEXT,
    date_scraped        TEXT DEFAULT (datetime('now')),

    -- Status
    status              TEXT DEFAULT 'new',            -- 'new', 'seen', 'applied', 'replied', 'won', 'lost', 'expired'
    is_read             INTEGER DEFAULT 0,

    notes               TEXT
);

-- ============================================================
-- TABLE 6: OUTREACH
-- Track every contact attempt you make
-- ============================================================
CREATE TABLE IF NOT EXISTS outreach (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    agency_id           INTEGER REFERENCES agencies(id),
    decision_maker_id   INTEGER REFERENCES decision_makers(id),
    opportunity_id      INTEGER REFERENCES opportunities(id),

    -- Contact Details
    channel             TEXT,                          -- 'linkedin', 'email', 'instagram_dm', 'whatsapp', 'phone'
    message_sent        TEXT,
    date_sent           TEXT DEFAULT (datetime('now')),

    -- Response
    responded           INTEGER DEFAULT 0,             -- 1 = yes
    response_date       TEXT,
    response_content    TEXT,
    response_sentiment  TEXT,                          -- 'positive', 'neutral', 'negative'

    -- Follow-up
    follow_up_date      TEXT,
    follow_up_done      INTEGER DEFAULT 0,

    -- Outcome
    outcome             TEXT,                          -- 'meeting_scheduled', 'project_won', 'rejected', 'no_response'
    notes               TEXT
);

-- ============================================================
-- TABLE 7: SCRAPER LOGS
-- Track when each scraper ran and what it found
-- ============================================================
CREATE TABLE IF NOT EXISTS scraper_logs (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    scraper_name        TEXT NOT NULL,                 -- 'google_maps', 'freelances_tn', 'linkedin', etc.
    started_at          TEXT DEFAULT (datetime('now')),
    finished_at         TEXT,
    status              TEXT,                          -- 'running', 'success', 'failed', 'partial'
    records_found       INTEGER DEFAULT 0,
    records_new         INTEGER DEFAULT 0,
    records_updated     INTEGER DEFAULT 0,
    error_message       TEXT,
    notes               TEXT
);

-- ============================================================
-- INDEXES — For fast queries on the dashboard
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_agencies_zone        ON agencies(zone);
CREATE INDEX IF NOT EXISTS idx_agencies_category    ON agencies(category);
CREATE INDEX IF NOT EXISTS idx_agencies_status      ON agencies(status);
CREATE INDEX IF NOT EXISTS idx_agencies_source      ON agencies(source);

CREATE INDEX IF NOT EXISTS idx_contacts_agency      ON contacts(agency_id);
CREATE INDEX IF NOT EXISTS idx_dm_agency            ON decision_makers(agency_id);
CREATE INDEX IF NOT EXISTS idx_intel_agency         ON agency_intelligence(agency_id);

CREATE INDEX IF NOT EXISTS idx_opps_platform        ON opportunities(platform);
CREATE INDEX IF NOT EXISTS idx_opps_status          ON opportunities(status);
CREATE INDEX IF NOT EXISTS idx_opps_category        ON opportunities(category);
CREATE INDEX IF NOT EXISTS idx_opps_date            ON opportunities(posted_date);

CREATE INDEX IF NOT EXISTS idx_outreach_agency      ON outreach(agency_id);
CREATE INDEX IF NOT EXISTS idx_outreach_status      ON outreach(outcome);

-- ============================================================
-- VIEWS — Useful pre-built queries for the dashboard
-- ============================================================

-- Full agency overview with contact count and decision maker count
CREATE VIEW IF NOT EXISTS v_agency_overview AS
SELECT
    a.id,
    a.name,
    a.category,
    a.zone,
    a.website,
    a.google_rating,
    a.status,
    a.source,
    c.phone,
    c.email_general,
    c.instagram_url,
    c.facebook_url,
    c.linkedin_url,
    COUNT(DISTINCT dm.id)   AS decision_makers_count,
    ai.opportunity_score,
    ai.instagram_content_quality,
    ai.last_job_posted,
    a.date_scraped
FROM agencies a
LEFT JOIN contacts c            ON c.agency_id = a.id
LEFT JOIN decision_makers dm    ON dm.agency_id = a.id
LEFT JOIN agency_intelligence ai ON ai.agency_id = a.id
GROUP BY a.id;

-- New opportunities in last 7 days
CREATE VIEW IF NOT EXISTS v_recent_opportunities AS
SELECT *
FROM opportunities
WHERE date_scraped >= datetime('now', '-7 days')
ORDER BY date_scraped DESC;

-- Outreach pipeline summary
CREATE VIEW IF NOT EXISTS v_outreach_pipeline AS
SELECT
    a.name AS agency_name,
    a.zone,
    o.channel,
    o.date_sent,
    o.responded,
    o.outcome,
    o.follow_up_date
FROM outreach o
JOIN agencies a ON a.id = o.agency_id
ORDER BY o.date_sent DESC;

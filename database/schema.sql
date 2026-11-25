-- VisitorPulse PostgreSQL Schema
-- Normalized tables for visitors, page_views, and blocked_bots

CREATE SEQUENCE IF NOT EXISTS visitor_number_seq START WITH 4821 INCREMENT BY 1;

CREATE TABLE IF NOT EXISTS visitors (
  id              SERIAL PRIMARY KEY,
  visitor_number  INTEGER UNIQUE NOT NULL DEFAULT nextval('visitor_number_seq'),
  fingerprint_id  VARCHAR(64) UNIQUE NOT NULL,
  ip_address      VARCHAR(45) NOT NULL,
  city            VARCHAR(120) NOT NULL DEFAULT 'Unknown',
  country         VARCHAR(120) NOT NULL DEFAULT 'Unknown',
  device          VARCHAR(120) NOT NULL DEFAULT 'Unknown Device',
  browser         VARCHAR(120) NOT NULL DEFAULT 'Unknown Browser',
  first_seen      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  total_visits    INTEGER NOT NULL DEFAULT 1,
  total_pages     INTEGER NOT NULL DEFAULT 1,
  is_returning    BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_visitors_fingerprint ON visitors (fingerprint_id);
CREATE INDEX IF NOT EXISTS idx_visitors_last_seen ON visitors (last_seen DESC);
CREATE INDEX IF NOT EXISTS idx_visitors_city ON visitors (city);
CREATE INDEX IF NOT EXISTS idx_visitors_returning ON visitors (is_returning);

CREATE TABLE IF NOT EXISTS page_views (
  id               SERIAL PRIMARY KEY,
  visitor_id       INTEGER NOT NULL REFERENCES visitors(id) ON DELETE CASCADE,
  url              TEXT NOT NULL,
  page_title       TEXT DEFAULT '',
  source           VARCHAR(120) NOT NULL DEFAULT 'Direct',
  utm_source       VARCHAR(120) DEFAULT '',
  utm_medium       VARCHAR(120) DEFAULT '',
  utm_campaign     VARCHAR(120) DEFAULT '',
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  timestamp        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_page_views_visitor_ts ON page_views (visitor_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_page_views_source ON page_views (source);
CREATE INDEX IF NOT EXISTS idx_page_views_ts ON page_views (timestamp DESC);

CREATE TABLE IF NOT EXISTS blocked_bots (
  id          SERIAL PRIMARY KEY,
  ip_address  VARCHAR(45) NOT NULL,
  user_agent  TEXT NOT NULL DEFAULT '',
  reason      TEXT NOT NULL,
  score       INTEGER NOT NULL DEFAULT 100,
  timestamp   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_blocked_bots_ts ON blocked_bots (timestamp DESC);

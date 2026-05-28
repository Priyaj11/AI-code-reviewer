-- Installations: one row per GitHub App installation (org or user)
CREATE TABLE IF NOT EXISTS installations (
  id SERIAL PRIMARY KEY,
  github_installation_id INTEGER UNIQUE NOT NULL,
  account_login TEXT NOT NULL,
  account_type TEXT NOT NULL DEFAULT 'Organization',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Per-repo settings managed via dashboard
CREATE TABLE IF NOT EXISTS repo_settings (
  id SERIAL PRIMARY KEY,
  installation_id INTEGER NOT NULL REFERENCES installations(id) ON DELETE CASCADE,
  repo_owner TEXT NOT NULL,
  repo_name TEXT NOT NULL,
  enabled BOOLEAN DEFAULT TRUE,
  review_level TEXT DEFAULT 'standard' CHECK (review_level IN ('strict', 'standard', 'light')),
  ignored_paths TEXT[] DEFAULT '{}',
  assign_reviewer TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (installation_id, repo_owner, repo_name)
);

-- Audit log for every completed review
CREATE TABLE IF NOT EXISTS reviews (
  id SERIAL PRIMARY KEY,
  installation_id INTEGER REFERENCES installations(id) ON DELETE SET NULL,
  repo_owner TEXT NOT NULL,
  repo_name TEXT NOT NULL,
  pr_number INTEGER NOT NULL,
  head_sha TEXT NOT NULL,
  comments_posted INTEGER DEFAULT 0,
  tokens_used INTEGER DEFAULT 0,
  chunks_processed INTEGER DEFAULT 0,
  duration_ms INTEGER,
  status TEXT DEFAULT 'completed' CHECK (status IN ('completed', 'failed', 'skipped')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reviews_repo ON reviews (repo_owner, repo_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_repo_settings_installation ON repo_settings (installation_id);

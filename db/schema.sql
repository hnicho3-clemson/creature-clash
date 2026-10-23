-- Creature Clash database schema (Postgres / Neon).
-- Safe to run more than once: every statement is idempotent.

CREATE TABLE IF NOT EXISTS users (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username        text NOT NULL,                      -- as typed, for display
  username_key    text NOT NULL,                      -- lowercase, for uniqueness and lookup
  pass_hash       text NOT NULL,                      -- scrypt, never the password
  contact_email   text NOT NULL,                      -- the player's own email, or a parent's for under-13 players
  is_child        boolean NOT NULL DEFAULT false,     -- under 13 at sign-up; we do not store the birth year
  status          text NOT NULL DEFAULT 'pending'     -- pending (needs email check or parent approval) | active
                  CHECK (status IN ('pending','active')),
  verified_at     timestamptz,                        -- when the email was confirmed or the parent approved
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT username_shape CHECK (username_key ~ '^[a-z0-9_]{3,20}$')
);
CREATE UNIQUE INDEX IF NOT EXISTS users_username_key ON users (username_key);
CREATE INDEX IF NOT EXISTS users_pending_created ON users (created_at) WHERE status = 'pending';

-- Sign-in sessions. The cookie holds a random token; only its SHA-256 is stored here.
CREATE TABLE IF NOT EXISTS sessions (
  token_hash   text PRIMARY KEY,
  user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at   timestamptz NOT NULL DEFAULT now(),
  last_seen    timestamptz NOT NULL DEFAULT now(),
  expires_at   timestamptz NOT NULL,
  revoked_at   timestamptz
);
CREATE INDEX IF NOT EXISTS sessions_user ON sessions (user_id);

-- One-time codes and links: email verification, password reset, parent approval. Stored as keyed hashes.
CREATE TABLE IF NOT EXISTS user_codes (
  id          bigserial PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  purpose     text NOT NULL CHECK (purpose IN ('verify','reset','parent')),
  code_hash   text NOT NULL,
  attempts    integer NOT NULL DEFAULT 0,
  expires_at  timestamptz NOT NULL,
  used_at     timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS user_codes_lookup ON user_codes (user_id, purpose) WHERE used_at IS NULL;
CREATE INDEX IF NOT EXISTS user_codes_hash ON user_codes (code_hash) WHERE used_at IS NULL;

-- Fixed-window rate limit counters. Keys are hashed so no IP address or username is stored in plain text.
CREATE TABLE IF NOT EXISTS rate_limits (
  key           text NOT NULL,
  window_start  timestamptz NOT NULL,
  count         integer NOT NULL DEFAULT 0,
  PRIMARY KEY (key, window_start)
);

-- Cloud save. progress (DNA, XP, level, parts, campaign) is written only by server rules.
-- slots and settings are written by the player, after server-side cleaning.
CREATE TABLE IF NOT EXISTS saves (
  user_id     uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  progress    jsonb NOT NULL,
  slots       jsonb NOT NULL DEFAULT '[]'::jsonb,
  settings    jsonb NOT NULL DEFAULT '{}'::jsonb,
  rev         integer NOT NULL DEFAULT 0,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Matches the server knows about, so rewards are paid once per match and only for plausible results.
CREATE TABLE IF NOT EXISTS matches (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mode          text NOT NULL CHECK (mode IN ('battle','challenge')),
  team_size     integer NOT NULL CHECK (team_size BETWEEN 1 AND 4),
  challenge_id  text,
  rot_key       text,
  started_at    timestamptz NOT NULL DEFAULT now(),
  reported_at   timestamptz,           -- first report: match rewards paid
  ended_at      timestamptz,           -- final report
  reports       integer NOT NULL DEFAULT 0,
  eliminated    boolean NOT NULL DEFAULT false,
  won           boolean,
  kills         integer NOT NULL DEFAULT 0,
  nests         integer NOT NULL DEFAULT 0,
  dna_awarded   integer NOT NULL DEFAULT 0,
  xp_awarded    integer NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS matches_user_started ON matches (user_id, started_at DESC);

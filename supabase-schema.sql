-- ═══════════════════════════════════════════════════════════════════════════════
-- SUPABASE SCHEMA — The Altar of Souls v3.0
-- Run this in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════════

-- Enable RLS (Row Level Security) — optional but recommended
ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret';

-- ─── USERS ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  password TEXT NOT NULL,
  nickname TEXT NOT NULL,
  level INTEGER DEFAULT 1,
  completed_tasks TEXT DEFAULT '',
  points INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  banned_until TIMESTAMPTZ,
  ban_reason TEXT
);

-- ─── LEVELS ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS levels (
  task_id TEXT PRIMARY KEY,
  level_number INTEGER NOT NULL,
  points INTEGER DEFAULT 10,
  description_ar TEXT,
  description_en TEXT,
  verification_type TEXT DEFAULT 'text',
  verification_answer TEXT,
  punishment TEXT,
  reward TEXT,
  media_required BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_levels_level_number ON levels(level_number);

-- ─── PENDING REVIEWS ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pending_reviews (
  review_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  task_id TEXT NOT NULL,
  file_id TEXT,
  media_url TEXT,
  slave_chat_id TEXT,
  status TEXT DEFAULT 'pending',
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by TEXT,
  channel_message_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_reviews_status ON pending_reviews(status);
CREATE INDEX IF NOT EXISTS idx_reviews_user ON pending_reviews(user_id);

-- ─── UPLOAD TOKENS ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS upload_tokens (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  task_id TEXT NOT NULL,
  chat_id TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  used BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_tokens_chat_used ON upload_tokens(chat_id, used);

-- ─── ERROR LOGS ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS error_logs (
  id SERIAL PRIMARY KEY,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  function_name TEXT,
  message TEXT
);

-- ─── ROW LEVEL SECURITY (اختياري — للحماية المتقدمة) ────────────────────────
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE upload_tokens ENABLE ROW LEVEL SECURITY;

-- Allow all operations for service role (backend)
CREATE POLICY "service_all" ON users FOR ALL USING (true);
CREATE POLICY "service_all" ON levels FOR ALL USING (true);
CREATE POLICY "service_all" ON pending_reviews FOR ALL USING (true);
CREATE POLICY "service_all" ON upload_tokens FOR ALL USING (true);

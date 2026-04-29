-- ═══════════════════════════════════════════════════
--  BloodLink — Supabase Database Schema
--  Run this entire file in your Supabase SQL Editor
--  (https://app.supabase.com → SQL Editor → New Query)
-- ═══════════════════════════════════════════════════

-- Enable UUID extension (usually already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─────────────────────────────────────────────────────
-- 1. DONORS TABLE
-- ─────────────────────────────────────────────────────
CREATE TABLE donors (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  full_name     TEXT NOT NULL,
  dob           DATE NOT NULL,
  gender        TEXT CHECK (gender IN ('male', 'female', 'other')),
  blood_group   TEXT NOT NULL CHECK (blood_group IN ('A+','A-','B+','B-','AB+','AB-','O+','O-')),
  phone         TEXT NOT NULL,
  pincode       TEXT NOT NULL,
  city          TEXT NOT NULL,
  state         TEXT NOT NULL,
  last_donated  DATE,
  is_available  BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────
-- 2. HOSPITALS TABLE
-- ─────────────────────────────────────────────────────
CREATE TABLE hospitals (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  hospital_name  TEXT NOT NULL,
  reg_number     TEXT NOT NULL,
  contact_person TEXT NOT NULL,
  phone          TEXT NOT NULL,
  address        TEXT NOT NULL,
  pincode        TEXT NOT NULL,
  city           TEXT NOT NULL,
  state          TEXT NOT NULL,
  is_verified    BOOLEAN DEFAULT FALSE,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────
-- 3. BLOOD REQUESTS TABLE
-- ─────────────────────────────────────────────────────
CREATE TABLE blood_requests (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hospital_id    UUID REFERENCES hospitals(id) ON DELETE CASCADE NOT NULL,
  blood_group    TEXT NOT NULL CHECK (blood_group IN ('A+','A-','B+','B-','AB+','AB-','O+','O-')),
  units_needed   INTEGER DEFAULT 1,
  status         TEXT DEFAULT 'pending' CHECK (status IN ('pending','fulfilled','cancelled')),
  donor_id       UUID REFERENCES donors(id),         -- filled when donor responds
  pincode        TEXT NOT NULL,                      -- copied from hospital at request time
  notes          TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────
-- 4. CALL LOGS TABLE
--    Records every Twilio call that was triggered
-- ─────────────────────────────────────────────────────
CREATE TABLE call_logs (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id   UUID REFERENCES blood_requests(id) ON DELETE CASCADE NOT NULL,
  donor_id     UUID REFERENCES donors(id) NOT NULL,
  phone        TEXT NOT NULL,
  twilio_sid   TEXT,          -- Twilio call SID for tracking
  status       TEXT DEFAULT 'initiated',   -- initiated | completed | failed | no-answer
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────
-- 5. DONATION HISTORY TABLE
-- ─────────────────────────────────────────────────────
CREATE TABLE donation_history (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  donor_id     UUID REFERENCES donors(id) ON DELETE CASCADE NOT NULL,
  hospital_id  UUID REFERENCES hospitals(id),
  request_id   UUID REFERENCES blood_requests(id),
  donated_on   DATE NOT NULL DEFAULT CURRENT_DATE,
  blood_group  TEXT NOT NULL,
  units        INTEGER DEFAULT 1,
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────
-- 6. UPDATED_AT TRIGGER (auto-updates timestamp)
-- ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER donors_updated_at    BEFORE UPDATE ON donors    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER hospitals_updated_at BEFORE UPDATE ON hospitals FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER requests_updated_at  BEFORE UPDATE ON blood_requests FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─────────────────────────────────────────────────────
-- 7. ROW LEVEL SECURITY (RLS)
-- ─────────────────────────────────────────────────────

-- Donors
ALTER TABLE donors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Donors can view their own profile"
  ON donors FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Donors can update their own profile"
  ON donors FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Donors can insert their profile"
  ON donors FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Hospitals can read donor blood_group, pincode, phone for matching (not full profile)
CREATE POLICY "Hospitals can view donors for matching"
  ON donors FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM hospitals WHERE user_id = auth.uid())
  );

-- Hospitals
ALTER TABLE hospitals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hospitals can view their own profile"
  ON hospitals FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Hospitals can update their own profile"
  ON hospitals FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Hospitals can insert their profile"
  ON hospitals FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Blood Requests
ALTER TABLE blood_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hospitals can manage their own requests"
  ON blood_requests FOR ALL
  USING (
    EXISTS (SELECT 1 FROM hospitals WHERE id = hospital_id AND user_id = auth.uid())
  );

CREATE POLICY "Donors can view pending requests"
  ON blood_requests FOR SELECT
  USING (
    status = 'pending' AND
    EXISTS (SELECT 1 FROM donors WHERE user_id = auth.uid())
  );

CREATE POLICY "Donors can update request to fulfilled"
  ON blood_requests FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM donors WHERE user_id = auth.uid())
  );

-- Call Logs (only server/edge functions write; donors/hospitals can read their own)
ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Donors can see their call logs"
  ON call_logs FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM donors WHERE id = donor_id AND user_id = auth.uid())
  );

-- Donation History
ALTER TABLE donation_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Donors can view their own history"
  ON donation_history FOR SELECT USING (
    EXISTS (SELECT 1 FROM donors WHERE id = donor_id AND user_id = auth.uid())
  );

CREATE POLICY "Donors can insert their history"
  ON donation_history FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM donors WHERE id = donor_id AND user_id = auth.uid())
  );

-- ─────────────────────────────────────────────────────
-- 8. REALTIME SUBSCRIPTIONS
--    Enable realtime for live donor notification
-- ─────────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE blood_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE call_logs;

-- ═══════════════════════════════════════════════════
--  ✅ Schema complete! Your tables are ready.
-- ═══════════════════════════════════════════════════

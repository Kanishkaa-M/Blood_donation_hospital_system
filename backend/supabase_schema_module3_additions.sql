-- ═══════════════════════════════════════════════════════════════
--  BloodLink — Module 3 Schema Additions
--  Run ONLY if you already ran supabase_schema.sql from Module 1
--  If this is a fresh setup, just run supabase_schema.sql instead
-- ═══════════════════════════════════════════════════════════════

-- Allow hospitals to view donors for matching (they need this to find eligible donors)
-- (This policy may already exist — if you get an error, skip this line)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Hospitals can view donors for matching'
  ) THEN
    CREATE POLICY "Hospitals can view donors for matching"
      ON donors FOR SELECT
      USING (
        EXISTS (SELECT 1 FROM hospitals WHERE user_id = auth.uid())
      );
  END IF;
END $$;

-- Allow hospitals to insert call_logs (needed when triggering calls)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Hospitals can insert call logs'
  ) THEN
    CREATE POLICY "Hospitals can insert call logs"
      ON call_logs FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM blood_requests br
          JOIN hospitals h ON h.id = br.hospital_id
          WHERE br.id = request_id AND h.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Allow hospitals to view their own call logs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Hospitals can view their call logs'
  ) THEN
    CREATE POLICY "Hospitals can view their call logs"
      ON call_logs FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM blood_requests br
          JOIN hospitals h ON h.id = br.hospital_id
          WHERE br.id = request_id AND h.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- ✅ Module 3 schema additions complete!

-- ── Admin RLS Policies ───────────────────────────────────────────────────────

-- Helper: reusable inline check for admin role
-- (used inside each policy)

-- Hostel: admin full access
CREATE POLICY "Admin can manage hostels"
  ON hostel FOR ALL
  USING (EXISTS (SELECT 1 FROM staff WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM staff WHERE id = auth.uid() AND role = 'admin'));

-- Room: admin full access
CREATE POLICY "Admin can manage rooms"
  ON room FOR ALL
  USING (EXISTS (SELECT 1 FROM staff WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM staff WHERE id = auth.uid() AND role = 'admin'));

-- Student: admin read + update (for special privilege toggle)
CREATE POLICY "Admin can read students"
  ON student FOR SELECT
  USING (EXISTS (SELECT 1 FROM staff WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admin can update students"
  ON student FOR UPDATE
  USING (EXISTS (SELECT 1 FROM staff WHERE id = auth.uid() AND role = 'admin'));

-- Staff: admin read all
CREATE POLICY "Admin can read staff"
  ON staff FOR SELECT
  USING (EXISTS (SELECT 1 FROM staff WHERE id = auth.uid() AND role = 'admin'));

-- Audit log: admin read + delete
CREATE POLICY "Admin can read audit_log"
  ON audit_log FOR SELECT
  USING (EXISTS (SELECT 1 FROM staff WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admin can delete audit_log"
  ON audit_log FOR DELETE
  USING (EXISTS (SELECT 1 FROM staff WHERE id = auth.uid() AND role = 'admin'));

-- Pass: admin read all (for stats)
CREATE POLICY "Admin can read passes"
  ON pass FOR SELECT
  USING (EXISTS (SELECT 1 FROM staff WHERE id = auth.uid() AND role = 'admin'));

-- Attendance session: admin read all (for stats)
CREATE POLICY "Admin can read attendance_session"
  ON attendance_session FOR SELECT
  USING (EXISTS (SELECT 1 FROM staff WHERE id = auth.uid() AND role = 'admin'));

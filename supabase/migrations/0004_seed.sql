-- ============================================================================
-- Seed data. Safe to re-run (idempotent upserts).
-- ============================================================================

insert into librarian_emails (email) values
  ('vijaybhaskar.ch9045@gmail.com')
on conflict (email) do nothing;

insert into academic_options (category, value, sort_order) values
  ('course', 'B.Tech', 1),
  ('course', 'M.Tech', 2),
  ('course', 'MBA', 3),
  ('regulation', 'R20', 1),
  ('regulation', 'R23', 2),
  ('year', '1', 1),
  ('year', '2', 2),
  ('year', '3', 3),
  ('year', '4', 4),
  ('semester', '1', 1),
  ('semester', '2', 2),
  ('branch', 'CSE', 1),
  ('branch', 'ECE', 2),
  ('branch', 'EEE', 3),
  ('branch', 'MECH', 4),
  ('branch', 'CIVIL', 5),
  ('branch', 'IT', 6)
on conflict (category, value) do nothing;

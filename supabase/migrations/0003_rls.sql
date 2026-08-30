-- ============================================================================
-- Adarsh Library Management System — Row Level Security
-- Students: read-only access to their own rows plus public catalog data.
-- Librarians: full management access.
-- All writes to students/books/book_issues/registration_requests flow through
-- the SECURITY DEFINER RPCs in 0002_functions.sql, so there are intentionally
-- NO student-facing insert/update/delete policies on those tables.
-- ============================================================================

alter table profiles enable row level security;
alter table students enable row level security;
alter table registration_requests enable row level security;
alter table books enable row level security;
alter table book_issues enable row level security;
alter table notifications enable row level security;
alter table notices enable row level security;
alter table e_resources enable row level security;
alter table academic_options enable row level security;
alter table librarian_emails enable row level security;

-- ---------------------------------------------------------------------------
-- PROFILES
-- ---------------------------------------------------------------------------
create policy "profiles: read own" on profiles
  for select using (id = auth.uid());

create policy "profiles: librarian reads all" on profiles
  for select using (current_role_is('librarian'));

-- ---------------------------------------------------------------------------
-- STUDENTS
-- ---------------------------------------------------------------------------
create policy "students: read own record" on students
  for select using (profile_id = auth.uid());

create policy "students: librarian full read" on students
  for select using (current_role_is('librarian'));

create policy "students: librarian insert" on students
  for insert with check (current_role_is('librarian'));

create policy "students: librarian update" on students
  for update using (current_role_is('librarian'));

create policy "students: librarian delete" on students
  for delete using (current_role_is('librarian'));

-- ---------------------------------------------------------------------------
-- REGISTRATION REQUESTS
-- ---------------------------------------------------------------------------
create policy "requests: student reads own" on registration_requests
  for select using (student_id = current_student_id());

create policy "requests: librarian reads all" on registration_requests
  for select using (current_role_is('librarian'));

-- Inserts/updates happen only via SECURITY DEFINER RPCs (no direct policy).

-- ---------------------------------------------------------------------------
-- BOOKS — public catalog, librarian-managed
-- ---------------------------------------------------------------------------
create policy "books: anyone authenticated can read" on books
  for select using (auth.uid() is not null);

create policy "books: librarian insert" on books
  for insert with check (current_role_is('librarian'));

create policy "books: librarian update" on books
  for update using (current_role_is('librarian'));

create policy "books: librarian delete" on books
  for delete using (current_role_is('librarian'));

-- ---------------------------------------------------------------------------
-- BOOK ISSUES
-- ---------------------------------------------------------------------------
create policy "issues: student reads own" on book_issues
  for select using (student_id = current_student_id());

create policy "issues: librarian reads all" on book_issues
  for select using (current_role_is('librarian'));

-- Inserts/updates happen only via rpc_issue_book / rpc_return_book.

-- ---------------------------------------------------------------------------
-- NOTIFICATIONS
-- ---------------------------------------------------------------------------
create policy "notifications: student reads own" on notifications
  for select using (student_id = current_student_id());

create policy "notifications: student marks own read" on notifications
  for update using (student_id = current_student_id())
  with check (student_id = current_student_id());

create policy "notifications: librarian reads all" on notifications
  for select using (current_role_is('librarian'));

-- ---------------------------------------------------------------------------
-- NOTICES — readable by everyone signed in, writable by librarians
-- ---------------------------------------------------------------------------
create policy "notices: read all" on notices
  for select using (auth.uid() is not null);

create policy "notices: librarian manage" on notices
  for all using (current_role_is('librarian')) with check (current_role_is('librarian'));

-- ---------------------------------------------------------------------------
-- E-RESOURCES — students see only active ones, librarians manage all
-- ---------------------------------------------------------------------------
create policy "e_resources: students read active" on e_resources
  for select using (active = true);

create policy "e_resources: librarian manage" on e_resources
  for all using (current_role_is('librarian')) with check (current_role_is('librarian'));

-- ---------------------------------------------------------------------------
-- ACADEMIC OPTIONS — reference data, readable by all signed-in users
-- ---------------------------------------------------------------------------
create policy "academic_options: read all" on academic_options
  for select using (auth.uid() is not null);

create policy "academic_options: librarian manage" on academic_options
  for all using (current_role_is('librarian')) with check (current_role_is('librarian'));

-- ---------------------------------------------------------------------------
-- LIBRARIAN EMAILS — no client access at all; managed only via the
-- Supabase SQL editor / migrations by a project admin.
-- ---------------------------------------------------------------------------
create policy "librarian_emails: librarian read" on librarian_emails
  for select using (current_role_is('librarian'));

-- ============================================================================
-- Adarsh Library Management System — Core Schema
-- ============================================================================
create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- ENUM TYPES
-- ---------------------------------------------------------------------------
create type user_role as enum ('student', 'librarian');
create type account_status as enum ('NOT_ACTIVE', 'PENDING', 'ACTIVE', 'REJECTED');
create type request_status as enum ('PENDING', 'APPROVED', 'REJECTED');
create type issue_status as enum ('ISSUED', 'RETURNED');
create type notification_type as enum (
  'BOOK_ISSUED', 'BOOK_RETURNED', 'DUE_SOON_2D', 'DUE_SOON_1D',
  'NOTICE', 'ACCOUNT_APPROVED', 'ACCOUNT_REJECTED'
);
create type academic_category as enum ('course', 'regulation', 'year', 'semester', 'branch', 'section');

-- ---------------------------------------------------------------------------
-- LIBRARIAN ALLOWLIST
-- Authorized librarian emails. Checked by handle_new_user() below to decide
-- whether a freshly authenticated Google account becomes a librarian.
-- ---------------------------------------------------------------------------
create table librarian_emails (
  email text primary key
);

-- ---------------------------------------------------------------------------
-- PROFILES  (1:1 with auth.users)
-- ---------------------------------------------------------------------------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role user_role not null default 'student',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_profiles_role on profiles(role);

-- ---------------------------------------------------------------------------
-- ACADEMIC OPTIONS (database-driven course/regulation/year/semester/branch/section)
-- ---------------------------------------------------------------------------
create table academic_options (
  id uuid primary key default gen_random_uuid(),
  category academic_category not null,
  value text not null,
  sort_order int not null default 0,
  unique (category, value)
);

-- ---------------------------------------------------------------------------
-- STUDENTS
-- Pre-loaded by the librarian from college records. A row can exist with
-- account_status = NOT_ACTIVE / PENDING before any auth account is linked.
-- ---------------------------------------------------------------------------
create table students (
  id uuid primary key default gen_random_uuid(),
  registration_number text not null unique,
  name text not null,
  course text not null,
  regulation text not null,
  year text not null,
  semester text not null,
  branch text not null,
  section text,
  account_status account_status not null default 'NOT_ACTIVE',
  profile_id uuid unique references profiles(id) on delete set null,
  linked_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_students_registration_number on students(registration_number);
create index idx_students_name on students using gin (to_tsvector('simple', name));
create index idx_students_account_status on students(account_status);
create index idx_students_profile_id on students(profile_id);

-- ---------------------------------------------------------------------------
-- REGISTRATION REQUESTS
-- ---------------------------------------------------------------------------
create table registration_requests (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  email text not null,
  status request_status not null default 'PENDING',
  requested_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references profiles(id),
  rejection_reason text
);
create index idx_registration_requests_status on registration_requests(status);
create index idx_registration_requests_student_id on registration_requests(student_id);

-- Only one active (PENDING) request per student at a time.
create unique index uq_one_pending_request_per_student
  on registration_requests(student_id)
  where status = 'PENDING';

-- ---------------------------------------------------------------------------
-- BOOKS
-- ---------------------------------------------------------------------------
create table books (
  id uuid primary key default gen_random_uuid(),
  book_id text,
  title text not null,
  isbn text not null unique,
  author text not null,
  total_copies int not null check (total_copies >= 0),
  available_copies int not null check (available_copies >= 0),
  course text,
  regulation text,
  year text,
  branch text,
  category text,
  publisher text,
  publication_year int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_available_le_total check (available_copies <= total_copies)
);
create index idx_books_isbn on books(isbn);
create index idx_books_title on books using gin (to_tsvector('simple', title));
create index idx_books_author on books using gin (to_tsvector('simple', author));
create index idx_books_course_regulation_year_branch on books(course, regulation, year, branch);

-- ---------------------------------------------------------------------------
-- BOOK ISSUES
-- ---------------------------------------------------------------------------
create table book_issues (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  book_id uuid not null references books(id) on delete restrict,
  issue_date date not null default current_date,
  due_date date not null,
  return_date date,
  status issue_status not null default 'ISSUED',
  calculated_fine numeric(10,2) not null default 0,
  adjusted_fine numeric(10,2),
  final_fine numeric(10,2) not null default 0,
  fine_paid boolean not null default false,
  issued_by uuid references profiles(id),
  returned_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_due_after_issue check (due_date >= issue_date)
);
create index idx_book_issues_student_id on book_issues(student_id);
create index idx_book_issues_book_id on book_issues(book_id);
create index idx_book_issues_status on book_issues(status);
create index idx_book_issues_due_date on book_issues(due_date);

-- A student may only have ONE active (ISSUED) issue per book at a time.
create unique index uq_one_active_issue_per_student_book
  on book_issues(student_id, book_id)
  where status = 'ISSUED';

-- ---------------------------------------------------------------------------
-- NOTIFICATIONS
-- ---------------------------------------------------------------------------
create table notifications (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  type notification_type not null,
  title text not null,
  message text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index idx_notifications_student_id on notifications(student_id);
create index idx_notifications_created_at on notifications(created_at desc);

-- Prevents duplicate due-date reminders for the same issue.
create table due_reminder_log (
  issue_id uuid not null references book_issues(id) on delete cascade,
  reminder_type notification_type not null,
  sent_at timestamptz not null default now(),
  primary key (issue_id, reminder_type)
);

-- ---------------------------------------------------------------------------
-- NOTICES
-- ---------------------------------------------------------------------------
create table notices (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  message text not null,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_notices_created_at on notices(created_at desc);

-- ---------------------------------------------------------------------------
-- E-RESOURCES
-- ---------------------------------------------------------------------------
create table e_resources (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  url text not null,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  active boolean not null default true
);
create index idx_e_resources_active on e_resources(active);

-- ---------------------------------------------------------------------------
-- updated_at helper trigger, reused by several tables
-- ---------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_profiles_updated_at before update on profiles
  for each row execute function set_updated_at();
create trigger trg_students_updated_at before update on students
  for each row execute function set_updated_at();
create trigger trg_books_updated_at before update on books
  for each row execute function set_updated_at();
create trigger trg_book_issues_updated_at before update on book_issues
  for each row execute function set_updated_at();
create trigger trg_notices_updated_at before update on notices
  for each row execute function set_updated_at();

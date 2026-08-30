-- ============================================================================
-- Adarsh Library Management System — Functions, Triggers, RPCs
-- All write-heavy business logic lives here as SECURITY DEFINER functions so
-- that (a) the client never needs elevated privileges, (b) inventory/fine
-- updates are atomic, and (c) RLS still fully protects direct table access.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Role helper — used inside RLS policies and functions
-- ---------------------------------------------------------------------------
create or replace function current_role_is(p_role user_role)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = p_role
  );
$$;

create or replace function current_student_id()
returns uuid
language sql stable security definer
set search_path = public
as $$
  select id from students where profile_id = auth.uid();
$$;

-- ---------------------------------------------------------------------------
-- New auth user -> profiles row. Role is decided by the librarian_emails
-- allowlist so authorization is enforced server-side, not in the frontend.
-- ---------------------------------------------------------------------------
create or replace function handle_new_user()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, role)
  values (
    new.id,
    new.email,
    case when exists (select 1 from public.librarian_emails le where lower(le.email) = lower(new.email))
      then 'librarian'::user_role
      else 'student'::user_role
    end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---------------------------------------------------------------------------
-- Fine calculation: ₹2 per overdue day, floor at 0
-- ---------------------------------------------------------------------------
create or replace function fn_calculate_fine(p_due_date date, p_as_of date)
returns numeric(10,2)
language sql immutable
as $$
  select greatest(0, (p_as_of - p_due_date))::numeric(10,2) * 2;
$$;

-- Live view: currently-issued books with dynamically computed fine + status
create or replace view v_active_issues as
select
  bi.*,
  fn_calculate_fine(bi.due_date, current_date) as live_fine,
  case
    when bi.due_date < current_date then 'OVERDUE'
    when bi.due_date - current_date <= 2 then 'DUE_SOON'
    else 'ON_TIME'
  end as live_status
from book_issues bi
where bi.status = 'ISSUED';

-- Per-student current unpaid fine (issued+overdue live fine, plus any
-- returned-but-unpaid final fines)
create or replace view v_student_fines as
select
  s.id as student_id,
  coalesce(sum(
    case
      when bi.status = 'ISSUED' then fn_calculate_fine(bi.due_date, current_date)
      when bi.status = 'RETURNED' and not bi.fine_paid then bi.final_fine
      else 0
    end
  ), 0)::numeric(10,2) as current_fine
from students s
left join book_issues bi on bi.student_id = s.id
group by s.id;

-- ---------------------------------------------------------------------------
-- STUDENT ACCOUNT CREATION FLOW
-- ---------------------------------------------------------------------------

-- Step A: link the just-authenticated Google account to a preloaded student
-- record by registration number. Must run while the student is authenticated.
create or replace function rpc_start_student_registration(p_registration_number text)
returns students
language plpgsql security definer
set search_path = public
as $$
declare
  v_student students;
  v_caller_email text;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select email into v_caller_email from auth.users where id = auth.uid();

  select * into v_student from students
    where lower(registration_number) = lower(trim(p_registration_number));

  if not found then
    raise exception 'NOT_FOUND';
  end if;

  if v_student.profile_id is not null and v_student.profile_id <> auth.uid() then
    raise exception 'ACCOUNT_EXISTS';
  end if;

  if v_student.account_status = 'ACTIVE' then
    raise exception 'ACCOUNT_EXISTS';
  end if;

  -- Prevent one Google account from being linked to a second student record
  if exists (
    select 1 from students
    where profile_id = auth.uid() and id <> v_student.id
  ) then
    raise exception 'GOOGLE_ACCOUNT_ALREADY_LINKED';
  end if;

  update students
    set profile_id = auth.uid(),
        linked_email = v_caller_email
    where id = v_student.id
    returning * into v_student;

  return v_student;
end;
$$;

-- Step B: after the student sets a password (via supabase-js auth.updateUser
-- on their already-authenticated session), submit the request for approval.
create or replace function rpc_submit_registration_request()
returns registration_requests
language plpgsql security definer
set search_path = public
as $$
declare
  v_student students;
  v_request registration_requests;
begin
  select * into v_student from students where profile_id = auth.uid();
  if not found then
    raise exception 'NOT_LINKED';
  end if;

  if v_student.account_status = 'ACTIVE' then
    raise exception 'ACCOUNT_EXISTS';
  end if;

  if exists (select 1 from registration_requests where student_id = v_student.id and status = 'PENDING') then
    raise exception 'REQUEST_ALREADY_PENDING';
  end if;

  update students set account_status = 'PENDING' where id = v_student.id;

  insert into registration_requests (student_id, email, status)
  values (v_student.id, v_student.linked_email, 'PENDING')
  returning * into v_request;

  return v_request;
end;
$$;

-- Used by the (pre-auth) login and forgot-password screens to resolve the
-- registration number to a real email WITHOUT ever exposing it in a query
-- students can run directly (RLS on `students` blocks anon reads entirely).
create or replace function rpc_resolve_login_email(p_registration_number text)
returns text
language plpgsql security definer
set search_path = public
as $$
declare
  v_student students;
begin
  select * into v_student from students
    where lower(registration_number) = lower(trim(p_registration_number));

  if not found then
    raise exception 'NOT_FOUND';
  end if;

  if v_student.account_status = 'NOT_ACTIVE' then
    raise exception 'NOT_ACTIVE';
  elsif v_student.account_status = 'PENDING' then
    raise exception 'PENDING';
  elsif v_student.account_status = 'REJECTED' then
    raise exception 'REJECTED';
  end if;

  return v_student.linked_email;
end;
$$;

grant execute on function rpc_resolve_login_email(text) to anon, authenticated;
grant execute on function rpc_start_student_registration(text) to authenticated;
grant execute on function rpc_submit_registration_request() to authenticated;

-- ---------------------------------------------------------------------------
-- LIBRARIAN: approve / reject registration requests
-- ---------------------------------------------------------------------------
create or replace function rpc_approve_registration(p_request_id uuid)
returns registration_requests
language plpgsql security definer
set search_path = public
as $$
declare
  v_request registration_requests;
begin
  if not current_role_is('librarian') then
    raise exception 'FORBIDDEN';
  end if;

  select * into v_request from registration_requests where id = p_request_id for update;
  if not found or v_request.status <> 'PENDING' then
    raise exception 'INVALID_REQUEST';
  end if;

  update registration_requests
    set status = 'APPROVED', reviewed_at = now(), reviewed_by = auth.uid()
    where id = p_request_id
    returning * into v_request;

  update students set account_status = 'ACTIVE' where id = v_request.student_id;

  insert into notifications (student_id, type, title, message)
  values (
    v_request.student_id, 'ACCOUNT_APPROVED', 'Account approved',
    'Your library account has been verified and approved. You can now log in.'
  );

  return v_request;
end;
$$;

create or replace function rpc_reject_registration(p_request_id uuid, p_reason text default null)
returns registration_requests
language plpgsql security definer
set search_path = public
as $$
declare
  v_request registration_requests;
begin
  if not current_role_is('librarian') then
    raise exception 'FORBIDDEN';
  end if;

  select * into v_request from registration_requests where id = p_request_id for update;
  if not found or v_request.status <> 'PENDING' then
    raise exception 'INVALID_REQUEST';
  end if;

  update registration_requests
    set status = 'REJECTED', reviewed_at = now(), reviewed_by = auth.uid(), rejection_reason = p_reason
    where id = p_request_id
    returning * into v_request;

  update students set account_status = 'REJECTED' where id = v_request.student_id;

  insert into notifications (student_id, type, title, message)
  values (
    v_request.student_id, 'ACCOUNT_REJECTED', 'Registration not approved',
    coalesce('Your registration request was not approved. Reason: ' || p_reason,
             'Your registration request was not approved. Please contact the librarian.')
  );

  return v_request;
end;
$$;

grant execute on function rpc_approve_registration(uuid) to authenticated;
grant execute on function rpc_reject_registration(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- LIBRARIAN: issue a book (atomic — validates stock, decrements inventory,
-- creates the issue record and the student notification in one transaction)
-- ---------------------------------------------------------------------------
create or replace function rpc_issue_book(
  p_isbn text,
  p_registration_number text,
  p_issue_date date,
  p_due_date date
)
returns book_issues
language plpgsql security definer
set search_path = public
as $$
declare
  v_book books;
  v_student students;
  v_issue book_issues;
begin
  if not current_role_is('librarian') then
    raise exception 'FORBIDDEN';
  end if;

  if p_due_date < p_issue_date then
    raise exception 'INVALID_DATES';
  end if;

  select * into v_book from books where isbn = p_isbn for update;
  if not found then
    raise exception 'BOOK_NOT_FOUND';
  end if;
  if v_book.available_copies <= 0 then
    raise exception 'OUT_OF_STOCK';
  end if;

  select * into v_student from students
    where lower(registration_number) = lower(trim(p_registration_number)) for update;
  if not found then
    raise exception 'STUDENT_NOT_FOUND';
  end if;
  if v_student.account_status <> 'ACTIVE' then
    raise exception 'STUDENT_NOT_ACTIVE';
  end if;

  if exists (
    select 1 from book_issues
    where student_id = v_student.id and book_id = v_book.id and status = 'ISSUED'
  ) then
    raise exception 'ALREADY_ISSUED_TO_STUDENT';
  end if;

  insert into book_issues (student_id, book_id, issue_date, due_date, status, issued_by)
  values (v_student.id, v_book.id, p_issue_date, p_due_date, 'ISSUED', auth.uid())
  returning * into v_issue;

  update books set available_copies = available_copies - 1 where id = v_book.id;

  insert into notifications (student_id, type, title, message)
  values (
    v_student.id, 'BOOK_ISSUED', 'Book issued',
    format('The book with ISBN: %s, Title: %s, is issued to you on %s and the due date is %s.',
           v_book.isbn, v_book.title, to_char(p_issue_date, 'DD Mon YYYY'), to_char(p_due_date, 'DD Mon YYYY'))
  );

  return v_issue;
end;
$$;

-- ---------------------------------------------------------------------------
-- LIBRARIAN: return a book (atomic — freezes the fine, marks payment,
-- restocks inventory, notifies the student). Safe against double-submission:
-- the WHERE status='ISSUED' guard means a second call finds no row.
-- ---------------------------------------------------------------------------
create or replace function rpc_return_book(
  p_isbn text,
  p_registration_number text,
  p_adjusted_fine numeric default null,
  p_mark_fine_paid boolean default true
)
returns book_issues
language plpgsql security definer
set search_path = public
as $$
declare
  v_book books;
  v_student students;
  v_issue book_issues;
  v_calc_fine numeric(10,2);
  v_final_fine numeric(10,2);
begin
  if not current_role_is('librarian') then
    raise exception 'FORBIDDEN';
  end if;

  select * into v_book from books where isbn = p_isbn;
  if not found then
    raise exception 'BOOK_NOT_FOUND';
  end if;

  select * into v_student from students
    where lower(registration_number) = lower(trim(p_registration_number));
  if not found then
    raise exception 'STUDENT_NOT_FOUND';
  end if;

  select * into v_issue from book_issues
    where student_id = v_student.id and book_id = v_book.id and status = 'ISSUED'
    for update;
  if not found then
    raise exception 'NO_ACTIVE_ISSUE';
  end if;

  v_calc_fine := fn_calculate_fine(v_issue.due_date, current_date);
  v_final_fine := coalesce(p_adjusted_fine, v_calc_fine);

  update book_issues
    set status = 'RETURNED',
        return_date = current_date,
        calculated_fine = v_calc_fine,
        adjusted_fine = p_adjusted_fine,
        final_fine = v_final_fine,
        fine_paid = p_mark_fine_paid,
        returned_by = auth.uid()
    where id = v_issue.id
    returning * into v_issue;

  update books set available_copies = available_copies + 1 where id = v_book.id;

  insert into notifications (student_id, type, title, message)
  values (
    v_student.id, 'BOOK_RETURNED', 'Book returned',
    format('The book with ISBN: %s, Title: %s has been returned successfully.', v_book.isbn, v_book.title)
  );

  return v_issue;
end;
$$;

-- LIBRARIAN: settle an already-returned issue's fine later
create or replace function rpc_settle_fine(p_issue_id uuid, p_paid boolean)
returns book_issues
language plpgsql security definer
set search_path = public
as $$
declare
  v_issue book_issues;
begin
  if not current_role_is('librarian') then
    raise exception 'FORBIDDEN';
  end if;

  update book_issues set fine_paid = p_paid where id = p_issue_id
    returning * into v_issue;
  if not found then
    raise exception 'ISSUE_NOT_FOUND';
  end if;
  return v_issue;
end;
$$;

grant execute on function rpc_issue_book(text, text, date, date) to authenticated;
grant execute on function rpc_return_book(text, text, numeric, boolean) to authenticated;
grant execute on function rpc_settle_fine(uuid, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- LIBRARIAN: safe student deletion (blocks if the student has active issues)
-- ---------------------------------------------------------------------------
create or replace function rpc_delete_student(p_student_id uuid)
returns void
language plpgsql security definer
set search_path = public
as $$
begin
  if not current_role_is('librarian') then
    raise exception 'FORBIDDEN';
  end if;

  if exists (select 1 from book_issues where student_id = p_student_id and status = 'ISSUED') then
    raise exception 'HAS_ACTIVE_ISSUES';
  end if;

  delete from notifications where student_id = p_student_id;
  delete from registration_requests where student_id = p_student_id;
  delete from book_issues where student_id = p_student_id; -- only RETURNED rows remain by this point
  delete from students where id = p_student_id;
end;
$$;

grant execute on function rpc_delete_student(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- LIBRARIAN: bulk import students (validated rows only; duplicates skipped)
-- Returns the count actually inserted so the UI can show an import summary.
-- ---------------------------------------------------------------------------
create or replace function rpc_bulk_import_students(p_rows jsonb)
returns table(inserted_count int, skipped_duplicates int)
language plpgsql security definer
set search_path = public
as $$
declare
  v_row jsonb;
  v_inserted int := 0;
  v_skipped int := 0;
begin
  if not current_role_is('librarian') then
    raise exception 'FORBIDDEN';
  end if;

  for v_row in select * from jsonb_array_elements(p_rows)
  loop
    if exists (select 1 from students where lower(registration_number) = lower(v_row->>'registration_number')) then
      v_skipped := v_skipped + 1;
      continue;
    end if;

    insert into students (registration_number, name, course, regulation, year, semester, branch, section)
    values (
      v_row->>'registration_number', v_row->>'name', v_row->>'course', v_row->>'regulation',
      v_row->>'year', v_row->>'semester', v_row->>'branch', v_row->>'section'
    );
    v_inserted := v_inserted + 1;
  end loop;

  return query select v_inserted, v_skipped;
end;
$$;

grant execute on function rpc_bulk_import_students(jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- LIBRARIAN: send a notice to every active student
-- ---------------------------------------------------------------------------
create or replace function rpc_send_notice(p_title text, p_message text)
returns notices
language plpgsql security definer
set search_path = public
as $$
declare
  v_notice notices;
begin
  if not current_role_is('librarian') then
    raise exception 'FORBIDDEN';
  end if;

  insert into notices (title, message, created_by)
  values (p_title, p_message, auth.uid())
  returning * into v_notice;

  insert into notifications (student_id, type, title, message)
  select id, 'NOTICE', v_notice.title, v_notice.message
  from students where account_status = 'ACTIVE';

  return v_notice;
end;
$$;

grant execute on function rpc_send_notice(text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Due-date reminders (called by the scheduled Edge Function, see
-- supabase/functions/due-reminders). Idempotent via due_reminder_log.
-- ---------------------------------------------------------------------------
create or replace function rpc_run_due_reminders()
returns table(reminders_sent int)
language plpgsql security definer
set search_path = public
as $$
declare
  v_count int := 0;
  v_issue record;
begin
  for v_issue in
    select bi.*, b.isbn, b.title
    from book_issues bi
    join books b on b.id = bi.book_id
    where bi.status = 'ISSUED'
      and bi.due_date - current_date in (1, 2)
  loop
    declare
      v_type notification_type := case when v_issue.due_date - current_date = 2 then 'DUE_SOON_2D' else 'DUE_SOON_1D' end;
    begin
      insert into due_reminder_log (issue_id, reminder_type)
      values (v_issue.id, v_type)
      on conflict do nothing;

      if found then
        insert into notifications (student_id, type, title, message)
        values (
          v_issue.student_id, v_type, 'Book due soon',
          format('Reminder: the book "%s" (ISBN: %s) is due on %s.', v_issue.title, v_issue.isbn,
                 to_char(v_issue.due_date, 'DD Mon YYYY'))
        );
        v_count := v_count + 1;
      end if;
    end;
  end loop;

  return query select v_count;
end;
$$;

grant execute on function rpc_run_due_reminders() to service_role;

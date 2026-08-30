# Adarsh Library Management System

A production-oriented Library Management System for a college library, built with React + TypeScript + Vite + Tailwind CSS on the frontend and Supabase (PostgreSQL, Auth, Row Level Security, Edge Functions) on the backend.

Two roles are supported end to end: **Student** and **Librarian**.

> **Before you start:** this codebase was generated without network access to actually run `npm install`, build it, or provision a live Supabase project. Do a local `npm install && npm run build` early to catch any straggling type errors, and expect to iterate on the Google OAuth / Supabase dashboard steps below by hand.

---

## 1. Prerequisites

- Node.js 18+ and npm
- A [Supabase](https://supabase.com) account (free tier is enough to start)
- A Google Cloud project for OAuth credentials
- The [Supabase CLI](https://supabase.com/docs/guides/cli) (optional but recommended, for running migrations and deploying the Edge Function)

## 2. Install dependencies

```bash
npm install
```

## 3. Create a Supabase project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard) → **New project**.
2. Note your **Project URL** and **anon public key** (Project Settings → API) — you'll need them for `.env`.

## 4. Configure Google OAuth

1. In the [Google Cloud Console](https://console.cloud.google.com/apis/credentials), create an **OAuth 2.0 Client ID** (Web application).
2. Add your Supabase auth callback as an authorized redirect URI:
   `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`
3. In the Supabase Dashboard → **Authentication → Providers → Google**, enable Google and paste in the Client ID and Client Secret.
4. Under **Authentication → URL Configuration**, add your app's URLs (e.g. `http://localhost:5173`, and your production URL) to the allow list, and set the Site URL.

## 5. Add environment variables

```bash
cp .env.example .env
```

Fill in:

```
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## 6. Run the SQL

All the SQL Supabase needs lives under `supabase/`. Two ways to apply it — pick one:

### Option A — One file, Dashboard SQL Editor (easiest)

`supabase/sql/complete_setup.sql` is a single file containing everything (schema → functions → RLS → seed data), in the correct order. On a **fresh** Supabase project:

1. Open your project → **SQL Editor** → **New query**.
2. Paste in the entire contents of `supabase/sql/complete_setup.sql`.
3. Click **Run**.

That's it — tables, constraints, indexes, triggers, RPCs, RLS policies, and seed data (including the librarian allowlist) are all created in one execution.

### Option B — Supabase CLI, individual migrations

For ongoing development, or if you want proper migration history tracking, use the individual files in `supabase/migrations/` (applied in numeric order — `0001_schema.sql`, `0002_functions.sql`, `0003_rls.sql`, `0004_seed.sql`):

```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

`supabase/sql/complete_setup.sql` and `supabase/migrations/*.sql` contain identical SQL — the single file is just those four concatenated for convenience. **Only run one of the two options, not both**, or you'll get "already exists" errors on the second pass. If you've already run Option A and later add a new migration file, apply just that new file by hand rather than re-running the combined file.

### Add your librarian's email

`0004_seed.sql` seeds `vijaybhaskar.ch9045@gmail.com` as an authorized librarian. To add more, run:

```sql
insert into librarian_emails (email) values ('another.librarian@gmail.com');
```

Any Google account signing in with an email in this table is automatically given the `librarian` role by the `handle_new_user()` trigger — everyone else defaults to `student`.

## 7. Row Level Security

RLS is enabled on every table by `0003_rls.sql`. Students can only read their own `students`/`book_issues`/`notifications` rows (plus the public book catalog, active notices, and active e-resources); all writes to sensitive tables go through `SECURITY DEFINER` RPC functions (`rpc_issue_book`, `rpc_return_book`, `rpc_approve_registration`, etc.) so business rules are enforced server-side, not just hidden in the UI.

## 8. Configure due-date reminder scheduling

The `rpc_run_due_reminders()` function (in `0002_functions.sql`) finds every issued book due in 1 or 2 days and creates a notification, skipping any issue that's already been reminded (via `due_reminder_log`) so it's safe to run repeatedly.

`supabase/functions/due-reminders/index.ts` is a thin Edge Function that calls this RPC. Deploy and schedule it:

```bash
supabase functions deploy due-reminders --no-verify-jwt
```

Then in the Supabase Dashboard → **Edge Functions → due-reminders → Cron**, set a schedule such as `0 3 * * *` (daily at 03:00 UTC). `supabase/config.toml` documents the intended schedule as well.

## 9. Run locally

```bash
npm run dev
```

Visit `http://localhost:5173`.

## 10. Build

```bash
npm run build
```

Type-checks (`tsc -b`) then builds with Vite. Output goes to `dist/`.

## 11. Deploy

Any static host that serves a Vite SPA works (Vercel, Netlify, Cloudflare Pages, etc.). For **Vercel**:

1. Import the repo in Vercel.
2. Framework preset: Vite.
3. Add the same two environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) in the Vercel project settings.
4. Add your deployed URL to Supabase's Auth → URL Configuration allow list (and as an authorized redirect if you use different OAuth redirect URLs per environment).

---

## Architecture notes

### Authentication strategy

Supabase Auth is built around one email per account. To let students log in with a **registration number** instead of an email, while still using native, secure Supabase Auth (no separate passwords table, no plaintext password storage):

1. A student first authenticates with **Google** (`supabase.auth.signInWithOAuth`). Their Google account's email becomes the account's real email.
2. They enter their **registration number**; `rpc_start_student_registration` links their `auth.users` id to the matching (librarian-preloaded) `students` row.
3. They set a password via `supabase.auth.updateUser({ password })` — this sets a password credential on that *same* account (same email), so the account now supports both Google sign-in and password sign-in.
4. `rpc_submit_registration_request` flips the student to `PENDING` and creates a `registration_requests` row for the librarian.
5. Once approved, the student can log in with **registration number + password**: the login screen calls `rpc_resolve_login_email(registration_number)` (a `SECURITY DEFINER` RPC that only returns the linked email once the account is `ACTIVE`) and then calls `supabase.auth.signInWithPassword` with that email — the student never sees or types their email.

Librarians authenticate with Google only; role assignment happens server-side via the `librarian_emails` allowlist, not in frontend code.

### Fine calculation

₹2 per day overdue, computed by the immutable SQL function `fn_calculate_fine(due_date, as_of)`. It's used live (via the `v_active_issues` / `v_student_fines` views) for currently-issued books, and frozen into `book_issues.final_fine` at return time (optionally overridden by the librarian via `adjusted_fine`).

### Inventory safety

`rpc_issue_book` and `rpc_return_book` are single atomic transactions (`SECURITY DEFINER` functions with row locks) that validate stock, update `available_copies`, and write the issue/notification records together — so concurrent issues can't oversell a book, and a duplicate "return" click can't double-increment inventory (the second call simply finds no `ISSUED` row to update).

### Project structure

```
src/
  components/ui/      Reusable UI primitives (button, card, dialog, table, etc.)
  features/auth/       Auth context, Supabase auth API wrappers
  layouts/             Responsive app shell (desktop sidebar / mobile drawer)
  pages/student/        Student-facing pages
  pages/librarian/       Librarian-facing pages
  routes/               Role-based route guards
  services/             Supabase query/RPC wrappers, grouped by domain
  types/database.ts     TypeScript types mirroring the SQL schema

supabase/
  sql/complete_setup.sql   All SQL in one file — easiest path for a fresh project
  migrations/              Same SQL split into 4 ordered files, for the Supabase CLI
  functions/due-reminders/ Scheduled Edge Function
  config.toml              Local project + function schedule config
```

## Known limitations / follow-ups

- This was generated without the ability to run `npm install` or a build — run `npm run build` locally first and fix any straggling TypeScript issues before deploying.
- Excel bulk import validates required columns and in-file duplicates client-side; server-side duplicate detection against existing students happens in `rpc_bulk_import_students`.
- The due-reminder Edge Function needs to be deployed and scheduled manually (step 8) — it will not run on its own until you do.
- Google OAuth and RLS behavior should be smoke-tested end-to-end in your own Supabase project, since this environment could not connect to a live Supabase instance to verify it.

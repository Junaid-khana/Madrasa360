# Madrasa Management System

A complete, responsive management dashboard for a small-to-medium madrasa in Pakistan (~100 students, boys and girls up to 15).
Built with **Next.js (App Router) · React · TypeScript · Tailwind CSS v4 · Recharts · Zod**.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # production build
npm run typecheck
```

Demo accounts (all use the password `madrasa123`):

| Role          | Username     | What they can do                                              |
|---------------|--------------|---------------------------------------------------------------|
| Super Admin   | `superadmin` | Everything, including users, settings, backups, deletion      |
| Administrator | `manager`    | Students, admissions, classes, attendance, fees, reports, SMS |
| Accountant    | `accountant` | Fees, receipts, donations, financial reports                  |
| Teacher       | `teacher`    | Own classes only: attendance, Hifz, results, student profiles |

The first launch seeds ~95 students, 10 teachers, 12 classes, six weeks of attendance, six months of fees,
donations, Hifz records, exam results, leave and SMS history (all fictional). *Settings → Backup & Data → Reset demo data* restores it.

## Architecture

```
src/
  app/                 Routes (thin pages). (app)/ is the authenticated area; /login is public
  components/
    ui/                Design system: Button, Card, Badge, forms, Modal, Tabs, DataTable, toasts, confirm…
    layout/            App shell: sidebar, drawer, bottom nav, top bar, global search, notifications
    print/             Print engine (letterhead, print portal) used by receipts, profiles, reports
    charts/            Chart theme + card wrapper
  features/<module>/   UI for each module (students, attendance, hifz, fees, …)
  lib/
    types.ts           Domain types (mirror docs/schema.sql)
    seed.ts            Deterministic demo-data generator
    db/store.ts        The only place that touches storage (localStorage adapter)
    services/*.ts      ALL business logic + mutations (validation with Zod, audit log entries)
    auth/              Roles, permissions matrix, session, data scoping
    i18n/              English/Urdu (RTL) strings, number/date formatting
    sms/provider.ts    Provider-agnostic SMS interface
docs/schema.sql        PostgreSQL / Supabase schema with RLS pattern
```

**UI ↔ data separation.** Components read a `Db` snapshot with `useDb()` / `useAuth().scoped` and change data only by
calling service functions (`createStudent`, `collectPayment`, `saveAttendance`, `addHifzRecord`, …). Services validate, mutate and append to
the audit log in one step, so the modules stay consistent: a fee payment updates the student's fee status, outstanding balance,
dashboard totals, reports and receipt history because they all derive from the same `fees` + `payments` tables.

**Connecting a real database.** Implement `PersistenceAdapter` in `src/lib/db/store.ts` (or replace the service functions with
Supabase/PostgREST calls) using `docs/schema.sql`. Enable Row Level Security, move password handling to Supabase Auth, and
move SMS provider calls behind a server route (`src/lib/sms/provider.ts`). Nothing in `components/` or `features/` has to change.

## Roles, permissions and student safety

* Permissions are declared once in `src/lib/auth/permissions.ts` (role → permission list) and enforced in the sidebar, route guard, pages and buttons.
* Teachers get a *scoped* database (`scopeDb`): only their classes' students and records — fees, donations and messages are never loaded for them.
* Nothing public: `/` redirects to the app, unauthenticated visitors only ever see `/login`, pages send `noindex`.
* Students are archived, not deleted; permanent deletion is Super Admin only, behind a confirmation.
* Every important action writes to the audit log (Settings → Security → Audit log).
* Demo note: passwords are SHA-256 hashed client-side because there is no server. Use Supabase Auth (or similar) in production.

## Urdu / RTL

Every UI string goes through `t("English text")`; Urdu translations live in `src/lib/i18n/ur/*.ts` (missing keys fall back to English).
Switching to اردو sets `dir="rtl"`; layout uses logical CSS properties (`ms-`, `pe-`, `start-`…), so the sidebar, tables, forms and icons mirror
correctly. Numbers, phone numbers and dates stay Latin-digit and left-to-right for readability. The language is stored in a cookie so it renders correctly on first paint.
Names of students and teachers are stored as entered (Latin script in the demo data).

## Printing / export

Receipts, student profiles, result cards and reports print through the browser (`Print` → *Save as PDF* for PDF).
Tables and reports export to CSV (UTF-8 with BOM, opens correctly in Excel).

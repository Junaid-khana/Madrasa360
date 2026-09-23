-- Madrasa Management System — PostgreSQL / Supabase schema
-- Mirrors src/lib/types.ts one-to-one. Run in the Supabase SQL editor (or psql) and then replace the
-- local store in src/lib/db/store.ts / the functions in src/lib/services/* with queries against these tables.
--
-- Security model: enable Row Level Security on EVERY table (student data is about minors).
-- Policies at the bottom show the pattern; they rely on a `profiles` row per auth user carrying a role.

create extension if not exists "pgcrypto";

create type user_role      as enum ('super_admin', 'admin', 'teacher', 'accountant');
create type gender_t       as enum ('Male', 'Female');
create type class_gender_t as enum ('Male', 'Female', 'Mixed');
create type student_status as enum ('Active', 'Archived', 'Left', 'Graduated');
create type progress_t     as enum ('Not Started', 'In Progress', 'Completed');
create type att_mark       as enum ('P', 'A', 'L');
create type pay_method     as enum ('Cash', 'JazzCash', 'Easypaisa', 'Bank Transfer', 'Cheque');

-- Users are Supabase Auth users; this table holds role + link to a teacher profile.
create table profiles (
  id            uuid primary key references auth.users on delete cascade,
  name          text not null,
  username      text unique not null,
  role          user_role not null default 'teacher',
  status        text not null default 'Active' check (status in ('Active', 'Disabled')),
  teacher_id    uuid,
  last_login    timestamptz,
  created_at    timestamptz not null default now()
);

create table settings (
  id int primary key default 1 check (id = 1),           -- single row
  madrasa_name text not null, madrasa_name_ur text, logo text, address text, phone text, email text, website text,
  principal text, academic_year text, subjects text[] default '{}', exam_types text[] default '{}',
  default_monthly_fee int default 0, admission_fee int default 0, exam_fee int default 0,
  fee_categories text[] default '{}', discount_presets jsonb default '[]',
  sms jsonb default '{"provider":"none"}',                -- keep API keys in a secrets store, not here
  notifications jsonb default '{}'
);

create table teachers (
  id uuid primary key default gen_random_uuid(),
  name text not null, gender gender_t not null, phone text, email text, qualification text, specialization text,
  join_date date, status text not null default 'Active'
);
alter table profiles add constraint profiles_teacher_fk foreign key (teacher_id) references teachers (id);

create table classes (
  id uuid primary key default gen_random_uuid(),
  name text not null, section text default '', kind text not null, teacher_id uuid references teachers (id),
  room text, gender class_gender_t not null default 'Mixed', subjects text[] default '{}',
  timetable jsonb default '[]'
);

create table students (
  id text primary key,                                   -- e.g. MDR-0001
  full_name text not null, father_name text not null, dob date not null, gender gender_t not null,
  b_form text, photo_path text, address text, city text, province text,
  guardian jsonb not null,                               -- {name, relationship, phone, altPhone, email, address}
  admission_date date not null, previous_school text, class_id uuid references classes (id), section text,
  status student_status not null default 'Active', residence text not null default 'Day Scholar',
  monthly_fee int not null default 0, discount int not null default 0, nazra_status progress_t not null default 'Not Started',
  hifz jsonb not null,                                   -- {status,startDate,currentPara,currentSurah,parasCompleted,...}
  created_at timestamptz not null default now(), archived_at timestamptz
);
create index on students (class_id);
create index on students (status);

create table attendance_sheets (
  id uuid primary key default gen_random_uuid(),
  date date not null, class_id uuid not null references classes (id), session text not null,
  marked_by uuid references profiles (id), updated_at timestamptz not null default now(),
  unique (date, class_id, session)
);
create table attendance_entries (
  sheet_id uuid references attendance_sheets (id) on delete cascade,
  student_id text references students (id) on delete cascade,
  mark att_mark not null,
  primary key (sheet_id, student_id)
);

create table fee_records (
  id uuid primary key default gen_random_uuid(),
  student_id text not null references students (id) on delete cascade,
  month char(7) not null, category text not null, description text, amount int not null,
  discount int not null default 0, waived boolean not null default false, created_at timestamptz not null default now()
);
create index on fee_records (student_id, month);

create table payments (
  id uuid primary key default gen_random_uuid(),
  receipt_no text unique not null, student_id text not null references students (id),
  date date not null, amount int not null check (amount > 0), method pay_method not null,
  received_by uuid references profiles (id), note text
);
create table payment_allocations (
  payment_id uuid references payments (id) on delete cascade,
  fee_id uuid references fee_records (id),
  amount int not null check (amount > 0),
  primary key (payment_id, fee_id)
);

create table donations (
  id uuid primary key default gen_random_uuid(),
  receipt_no text unique not null, donor_name text not null, phone text, amount int not null check (amount > 0),
  date date not null, category text not null, method pay_method not null, purpose text, notes text,
  received_by uuid references profiles (id)
);

create table hifz_records (
  id uuid primary key default gen_random_uuid(),
  student_id text not null references students (id) on delete cascade, date date not null,
  para int not null check (para between 1 and 30), surah text not null, ayah_from int, ayah_to int,
  sabaq text, sabqi text, manzil text, mistakes int default 0, quality text, assessment text,
  teacher_id uuid references teachers (id), para_completed boolean default false
);
create index on hifz_records (student_id, date desc);

create table exam_results (
  id uuid primary key default gen_random_uuid(),
  student_id text not null references students (id) on delete cascade, class_id uuid references classes (id),
  exam text not null, subject text not null, marks numeric not null, total_marks numeric not null,
  percentage numeric, grade text, remarks text, entered_by uuid references profiles (id), date date,
  unique (student_id, exam, subject)
);

create table leaves (
  id uuid primary key default gen_random_uuid(),
  student_id text not null references students (id) on delete cascade, type text not null,
  start_date date not null, end_date date not null, reason text, status text not null default 'Pending',
  approved_by text, remarks text, created_at timestamptz not null default now()
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  type text not null, audience text, body text not null, status text not null, provider text,
  sent_by text, sent_at timestamptz not null default now()
);
create table message_recipients (
  message_id uuid references messages (id) on delete cascade,
  student_id text references students (id), guardian_name text, phone text, body text
);

create table admission_applications (
  id text primary key, applicant_name text not null, father_name text, dob date, gender gender_t,
  guardian_phone text, address text, applied_class_id uuid references classes (id), applied_date date,
  previous_school text, status text not null default 'New', notes text, student_id text references students (id)
);

create table student_documents (
  id uuid primary key default gen_random_uuid(),
  student_id text not null references students (id) on delete cascade, name text not null, type text,
  storage_path text, size_kb int, uploaded_at timestamptz not null default now()
);

-- Audit trail: append-only.
create table activity_log (
  id uuid primary key default gen_random_uuid(),
  at timestamptz not null default now(), user_id uuid, user_name text, kind text not null, text text not null, ref_id text
);

-- ---------------------------------------------------------------------------
-- Row Level Security (pattern). Repeat for each table with the permissions from
-- src/lib/auth/permissions.ts. Teachers may only read students of classes they teach.
-- ---------------------------------------------------------------------------
-- Supabase exposes every table in the public schema through its API. Turn RLS on for ALL of them:
-- with no policy, a table is completely closed to the API (safe default). Add policies per table
-- (see the students example below) before the app reads/writes it with the anon key.
alter table profiles              enable row level security;
alter table settings              enable row level security;
alter table teachers              enable row level security;
alter table classes               enable row level security;
alter table attendance_sheets     enable row level security;
alter table attendance_entries    enable row level security;
alter table fee_records           enable row level security;
alter table payments              enable row level security;
alter table payment_allocations   enable row level security;
alter table donations             enable row level security;
alter table hifz_records          enable row level security;
alter table exam_results          enable row level security;
alter table leaves                enable row level security;
alter table messages              enable row level security;
alter table message_recipients    enable row level security;
alter table admission_applications enable row level security;
alter table student_documents     enable row level security;
alter table activity_log          enable row level security;
alter table students enable row level security;

create function current_role_() returns user_role language sql stable security definer as
  $$ select role from profiles where id = auth.uid() and status = 'Active' $$;

create policy students_staff_read on students for select using (
  current_role_() in ('super_admin', 'admin', 'accountant')
  or (current_role_() = 'teacher' and class_id in (
        select c.id from classes c join profiles p on p.teacher_id = c.teacher_id where p.id = auth.uid()))
);
create policy students_admin_write on students for all using (current_role_() in ('super_admin', 'admin'))
  with check (current_role_() in ('super_admin', 'admin'));

-- =====================================================================
-- 0001_init.sql — Wanzwei initial Postgres schema.
--
-- Tables: facilities, users, jobs, applications, notifications,
--         emergency_alerts, emergency_alert_recipients.
--
-- This migration only creates the schema. Row-level security policies,
-- auth.users wiring, and storage policies arrive in later migrations.
-- =====================================================================

-- gen_random_uuid() is in core on Postgres 13+, but pgcrypto is also fine
-- and is what Supabase enables by default.
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------

create type role as enum ('professional', 'facility', 'admin');

create type facility_type as enum (
  'Hospital', 'Clinic', 'Pharmacy', 'Laboratory', 'Radiology'
);

create type employment_type as enum (
  'Full-time', 'Part-time', 'Locum', 'Contract', 'Permanent'
);

create type job_status as enum (
  'Open', 'Interested', 'Shortlisted', 'Matched', 'Closed'
);

create type application_status as enum (
  'Under Review', 'Screening', 'Shortlisted', 'Interview',
  'Offer', 'Hired', 'Rejected'
);

create type notification_kind as enum (
  'match', 'application', 'verification', 'system', 'emergency'
);

create type urgency as enum ('Standard', 'High', 'Critical');

create type alert_overall_status as enum (
  'Sent', 'Filled', 'Expired', 'Cancelled'
);

create type alert_response_status as enum (
  'Pending', 'Accepted', 'Declined', 'Expired'
);

create type pay_currency as enum ('USD', 'ZWL', 'ZAR');
create type pay_period   as enum ('hour', 'shift', 'day');

-- ---------------------------------------------------------------------
-- Shared updated_at trigger
-- ---------------------------------------------------------------------

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- facilities
-- ---------------------------------------------------------------------

create table facilities (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  type        facility_type not null,
  location    text not null,
  verified    boolean not null default false,
  rating      numeric(3,2) not null default 0,
  open_roles  integer not null default 0,
  logo_color  text,
  initials    text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger trg_facilities_updated_at
  before update on facilities
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- users
--
-- `id` is defaulted with gen_random_uuid() so the table is usable in
-- isolation during scaffolding. A later migration will drop the default
-- and add a foreign key to auth.users(id) once Supabase Auth is wired.
-- ---------------------------------------------------------------------

create table users (
  id            uuid primary key default gen_random_uuid(),
  email         text not null,
  role          role not null,
  name          text not null,
  title         text,
  location      text,
  avatar_url    text,
  verified      boolean not null default false,
  profession    text,
  cpd_credits   numeric(6,2),
  cpd_target    numeric(6,2),
  facility_id   uuid references facilities(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create unique index users_email_uniq    on users(email);
create        index users_facility_id_idx on users(facility_id);
create        index users_role_idx        on users(role);

create trigger trg_users_updated_at
  before update on users
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- jobs
-- ---------------------------------------------------------------------

create table jobs (
  id                uuid primary key default gen_random_uuid(),
  facility_id       uuid not null references facilities(id) on delete cascade,
  title             text not null,
  location          text not null,
  type              employment_type not null,
  salary            text,
  status            job_status not null default 'Open',
  applicants_count  integer not null default 0,
  description       text not null default '',
  tags              text[] not null default '{}'::text[],
  posted_at         timestamptz not null default now(),
  created_at        timestamptz not null default now()
);

create index jobs_facility_id_idx on jobs(facility_id);
create index jobs_status_idx      on jobs(status);
create index jobs_posted_at_idx   on jobs(posted_at desc);

-- ---------------------------------------------------------------------
-- applications
-- ---------------------------------------------------------------------

create table applications (
  id              uuid primary key default gen_random_uuid(),
  job_id          uuid not null references jobs(id)  on delete cascade,
  professional_id uuid not null references users(id) on delete cascade,
  status          application_status not null default 'Under Review',
  notes           text,
  applied_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create        index applications_job_id_idx          on applications(job_id);
create        index applications_professional_id_idx on applications(professional_id);
create unique index applications_job_pro_uniq        on applications(job_id, professional_id);

create trigger trg_applications_updated_at
  before update on applications
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- notifications
-- ---------------------------------------------------------------------

create table notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users(id) on delete cascade,
  title       text not null,
  body        text not null,
  kind        notification_kind not null,
  unread      boolean not null default true,
  created_at  timestamptz not null default now()
);

create index notifications_user_id_idx    on notifications(user_id);
create index notifications_created_at_idx on notifications(created_at desc);

-- ---------------------------------------------------------------------
-- emergency_alerts
-- ---------------------------------------------------------------------

create table emergency_alerts (
  id              uuid primary key default gen_random_uuid(),
  facility_id     uuid not null references facilities(id) on delete cascade,
  profession      text not null,
  location        text not null,
  urgency         urgency not null,
  shift_start     timestamptz not null,
  shift_end       timestamptz not null,
  notes           text not null default '',
  pay_min         numeric(10,2) not null,
  pay_max         numeric(10,2) not null,
  pay_currency    pay_currency not null,
  pay_period      pay_period   not null,
  expires_at      timestamptz not null,
  status          alert_overall_status not null default 'Sent',
  matched_count   integer not null default 0,
  created_at      timestamptz not null default now(),

  constraint emergency_alerts_shift_window check (shift_end > shift_start),
  constraint emergency_alerts_pay_range   check (pay_max  >= pay_min)
);

create index emergency_alerts_facility_id_idx on emergency_alerts(facility_id);
create index emergency_alerts_status_idx      on emergency_alerts(status);
create index emergency_alerts_expires_at_idx  on emergency_alerts(expires_at);

-- ---------------------------------------------------------------------
-- emergency_alert_recipients (composite-PK join table)
-- ---------------------------------------------------------------------

create table emergency_alert_recipients (
  alert_id        uuid not null references emergency_alerts(id) on delete cascade,
  professional_id uuid not null references users(id)            on delete cascade,
  status          alert_response_status not null default 'Pending',
  responded_at    timestamptz,

  primary key (alert_id, professional_id)
);

create index alert_recipients_professional_id_idx
  on emergency_alert_recipients(professional_id);
create index alert_recipients_status_idx
  on emergency_alert_recipients(status);

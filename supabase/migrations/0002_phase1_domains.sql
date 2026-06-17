-- =====================================================================
-- 0002_phase1_domains.sql — add remaining Phase 1 production domains.
--
-- Adds saved jobs, interviews, verifications, verification document
-- metadata, courses, and marketplace listings. RLS/policies arrive later.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------

create type interview_mode as enum ('Onsite', 'Video', 'Phone');

create type verification_status as enum (
  'Pending', 'Under Review', 'Verified', 'Rejected'
);

create type course_category as enum (
  'Clinical', 'Compliance', 'Leadership', 'Tech', 'Wellbeing'
);

create type course_status as enum (
  'not_started', 'in_progress', 'completed'
);

create type listing_kind as enum (
  'Clinic', 'Pharmacy', 'Hospital', 'Laboratory', 'Practice'
);

create type listing_mode as enum ('Sale', 'Lease');

-- ---------------------------------------------------------------------
-- saved_jobs
-- ---------------------------------------------------------------------

create table saved_jobs (
  user_id     uuid not null references users(id) on delete cascade,
  job_id      uuid not null references jobs(id)  on delete cascade,
  created_at  timestamptz not null default now(),

  primary key (user_id, job_id)
);

create index saved_jobs_job_id_idx on saved_jobs(job_id);

-- ---------------------------------------------------------------------
-- interviews
-- ---------------------------------------------------------------------

create table interviews (
  id               uuid primary key default gen_random_uuid(),
  job_id           uuid not null references jobs(id)  on delete cascade,
  professional_id  uuid not null references users(id) on delete cascade,
  date             timestamptz not null,
  duration         integer not null,
  mode             interview_mode not null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  constraint interviews_duration_positive check (duration > 0)
);

create index interviews_job_id_idx          on interviews(job_id);
create index interviews_professional_id_idx on interviews(professional_id);
create index interviews_date_idx            on interviews(date);

create trigger trg_interviews_updated_at
  before update on interviews
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- verifications
-- ---------------------------------------------------------------------

create table verifications (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references users(id) on delete cascade,
  name            text not null,
  profession      text not null,
  status          verification_status not null default 'Pending',
  document_count  integer not null default 0,
  submitted_at    timestamptz not null default now(),
  flags           text[] not null default '{}'::text[],
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint verifications_document_count_nonnegative check (document_count >= 0)
);

create index verifications_user_id_idx      on verifications(user_id);
create index verifications_status_idx       on verifications(status);
create index verifications_submitted_at_idx on verifications(submitted_at desc);

create trigger trg_verifications_updated_at
  before update on verifications
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- verification_documents
-- ---------------------------------------------------------------------

create table verification_documents (
  id               uuid primary key default gen_random_uuid(),
  verification_id  uuid not null references verifications(id) on delete cascade,
  user_id          uuid not null references users(id)         on delete cascade,
  file_name        text not null,
  storage_bucket   text not null,
  storage_path     text not null,
  content_type     text,
  size_bytes       integer,
  uploaded_at      timestamptz not null default now(),

  constraint verification_documents_size_nonnegative
    check (size_bytes is null or size_bytes >= 0)
);

create index verification_documents_verification_id_idx
  on verification_documents(verification_id);
create index verification_documents_user_id_idx
  on verification_documents(user_id);
create unique index verification_documents_storage_path_uniq
  on verification_documents(storage_bucket, storage_path);

-- ---------------------------------------------------------------------
-- courses
-- ---------------------------------------------------------------------

create table courses (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  provider     text not null,
  category     course_category not null,
  duration     text not null,
  credits      numeric(6,2) not null,
  progress     integer not null default 0,
  status       course_status not null default 'not_started',
  cover        text not null,
  recommended  boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  constraint courses_credits_nonnegative check (credits >= 0),
  constraint courses_progress_range check (progress between 0 and 100)
);

create index courses_category_idx    on courses(category);
create index courses_status_idx      on courses(status);
create index courses_recommended_idx on courses(recommended);

create trigger trg_courses_updated_at
  before update on courses
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- listings
-- ---------------------------------------------------------------------

create table listings (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  kind          listing_kind not null,
  mode          listing_mode not null,
  location      text not null,
  price         numeric(12,2) not null,
  currency      text not null,
  beds          integer,
  rooms         integer,
  staff         integer,
  posted        timestamptz not null default now(),
  cover         text not null,
  description   text not null,
  confidential  boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  constraint listings_price_nonnegative check (price >= 0),
  constraint listings_beds_nonnegative  check (beds  is null or beds  >= 0),
  constraint listings_rooms_nonnegative check (rooms is null or rooms >= 0),
  constraint listings_staff_nonnegative check (staff is null or staff >= 0)
);

create index listings_kind_idx   on listings(kind);
create index listings_mode_idx   on listings(mode);
create index listings_posted_idx on listings(posted desc);

create trigger trg_listings_updated_at
  before update on listings
  for each row execute function set_updated_at();

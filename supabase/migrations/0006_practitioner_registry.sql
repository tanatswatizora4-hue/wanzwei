-- =====================================================================
-- 0006_practitioner_registry.sql — HPA practitioner registry foundation.
--
-- Adds the server-side practitioner registry, verification audit events,
-- and registration-number columns on users / verifications. Does not
-- import registry rows. RLS is enabled with no client policies so
-- anon/authenticated cannot read or forge registry or audit data;
-- application code continues to use the direct DB connection (bypasses RLS).
-- =====================================================================

-- ---------------------------------------------------------------------
-- practitioner_registry
-- ---------------------------------------------------------------------

create table public.practitioner_registry (
  id                              uuid primary key default gen_random_uuid(),
  registering_body                text not null default 'HPA',
  registration_number             text not null,
  registration_number_normalized  text not null,
  licence_class                   text not null,
  licence_serial                  text not null,
  licence_year                    integer not null,
  full_name                       text not null,
  full_name_normalized            text not null,
  qualification                   text not null,
  qualification_normalized        text not null,
  address                         text,
  town                            text,
  expiry_date                     date not null,
  derived_status                  text not null,
  is_placeholder                  boolean not null default false,
  source_file                     text not null,
  source_imported_at              timestamptz not null,
  source_row                      jsonb not null,
  created_at                      timestamptz not null default now(),
  updated_at                      timestamptz not null default now(),

  constraint practitioner_registry_derived_status_allowed
    check (derived_status in ('active', 'expired'))
);

-- Unique only for real licence numbers. Six HPA rows share P03-0000-2026
-- and are flagged is_placeholder; they must never auto-verify.
create unique index practitioner_registry_body_number_nonplaceholder_uniq
  on public.practitioner_registry (registering_body, registration_number_normalized)
  where is_placeholder = false;

create index practitioner_registry_body_number_idx
  on public.practitioner_registry (registering_body, registration_number_normalized);

create index practitioner_registry_body_class_serial_idx
  on public.practitioner_registry (registering_body, licence_class, licence_serial);

create index practitioner_registry_expiry_date_idx
  on public.practitioner_registry (expiry_date);

create index practitioner_registry_qualification_normalized_idx
  on public.practitioner_registry (qualification_normalized);

create index practitioner_registry_derived_status_idx
  on public.practitioner_registry (derived_status);

create trigger trg_practitioner_registry_updated_at
  before update on public.practitioner_registry
  for each row execute function set_updated_at();

alter table public.practitioner_registry enable row level security;
-- Intentionally no policies: default-deny for anon and authenticated.
-- Server-side Drizzle (SUPABASE_DB_URL) and the service role bypass RLS.

-- ---------------------------------------------------------------------
-- users: optional HPA (or later council) registration details
-- ---------------------------------------------------------------------

alter table public.users
  add column registering_body text,
  add column registration_number text;

create index users_registering_body_registration_number_idx
  on public.users (registering_body, registration_number);

-- ---------------------------------------------------------------------
-- verifications: registry match metadata (existing statuses unchanged)
-- ---------------------------------------------------------------------

alter table public.verifications
  add column registering_body text,
  add column registration_number text,
  add column matched_registry_id uuid
    references public.practitioner_registry(id) on delete set null,
  add column match_outcome text,
  add constraint verifications_match_outcome_allowed
    check (
      match_outcome is null
      or match_outcome in (
        'matched',
        'not_found',
        'expired',
        'ambiguous',
        'profession_mismatch',
        'name_mismatch',
        'missing_registration_number',
        'registry_lookup_failed',
        'non_clinical_qualification'
      )
    );

create index verifications_matched_registry_id_idx
  on public.verifications (matched_registry_id);

create index verifications_registering_body_registration_number_idx
  on public.verifications (registering_body, registration_number);

-- Professionals may still update their own case via RLS, but must not
-- forge registry match results. Registration number fields stay writable
-- so a later submit path can store what the professional entered.
create or replace function public.prevent_verification_self_review_update()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.app_user_is_admin()
     and auth.uid() = old.user_id
     and (
       new.status is distinct from old.status
       or new.document_count is distinct from old.document_count
       or new.flags is distinct from old.flags
       or new.matched_registry_id is distinct from old.matched_registry_id
       or new.match_outcome is distinct from old.match_outcome
     ) then
    raise exception 'Only administrators may update verification review fields'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- verification_events (append-only audit; actor nullable for auto matches)
-- ---------------------------------------------------------------------

create table public.verification_events (
  id                 uuid primary key default gen_random_uuid(),
  verification_id    uuid not null
    references public.verifications(id) on delete cascade,
  actor_user_id      uuid
    references public.users(id) on delete set null,
  from_status        text,
  to_status          text not null,
  method             text not null,
  match_registry_id  uuid
    references public.practitioner_registry(id) on delete set null,
  reason             text,
  created_at         timestamptz not null default now(),

  constraint verification_events_from_status_allowed
    check (
      from_status is null
      or from_status in ('Pending', 'Under Review', 'Verified', 'Rejected')
    ),
  constraint verification_events_to_status_allowed
    check (to_status in ('Pending', 'Under Review', 'Verified', 'Rejected')),
  constraint verification_events_method_allowed
    check (method in ('auto', 'admin'))
);

create index verification_events_verification_id_idx
  on public.verification_events (verification_id);

create index verification_events_actor_user_id_idx
  on public.verification_events (actor_user_id);

create index verification_events_match_registry_id_idx
  on public.verification_events (match_registry_id);

create index verification_events_created_at_idx
  on public.verification_events (created_at desc);

alter table public.verification_events enable row level security;
-- Intentionally no policies: clients cannot select, insert, update, or
-- delete audit rows. Server-side application code writes events.

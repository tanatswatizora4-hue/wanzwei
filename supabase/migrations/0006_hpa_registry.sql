-- =====================================================================
-- 0006_hpa_registry.sql — HPA practitioner registry and verification
-- workflow columns.
--
-- Reference data only. No rows are imported here.
-- person_no is indexed but NOT unique (source register has duplicates).
-- verification_status enum is unchanged.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------

create type hpa_import_status as enum ('Pending', 'Completed', 'Failed');

create type verification_match_method as enum ('manual', 'hpa_auto');

-- ---------------------------------------------------------------------
-- hpa_registry_imports
-- ---------------------------------------------------------------------

create table hpa_registry_imports (
  id            uuid primary key default gen_random_uuid(),
  source_name   text not null,
  source_date   date,
  imported_at   timestamptz not null default now(),
  imported_by   uuid references users(id) on delete set null,
  record_count  integer not null default 0,
  status        hpa_import_status not null default 'Pending',
  notes         text,

  constraint hpa_registry_imports_record_count_nonnegative
    check (record_count >= 0)
);

create index hpa_registry_imports_imported_at_idx
  on hpa_registry_imports (imported_at desc);
create index hpa_registry_imports_status_idx
  on hpa_registry_imports (status);
create index hpa_registry_imports_imported_by_idx
  on hpa_registry_imports (imported_by);

-- ---------------------------------------------------------------------
-- hpa_practitioners
-- ---------------------------------------------------------------------

create table hpa_practitioners (
  id              uuid primary key default gen_random_uuid(),
  person_no       text not null,
  full_name       text not null,
  qualification   text not null,
  address         text,
  town            text,
  expiry_date     date,
  import_id       uuid not null references hpa_registry_imports(id)
                    on delete cascade,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index hpa_practitioners_person_no_idx
  on hpa_practitioners (person_no);
create index hpa_practitioners_import_id_idx
  on hpa_practitioners (import_id);
create index hpa_practitioners_full_name_idx
  on hpa_practitioners (full_name);
create index hpa_practitioners_full_name_lower_idx
  on hpa_practitioners (lower(full_name));
create index hpa_practitioners_expiry_date_idx
  on hpa_practitioners (expiry_date);

create trigger trg_hpa_practitioners_updated_at
  before update on hpa_practitioners
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- verifications: HPA match / review columns
--
-- verifications_user_id_idx already exists from 0002.
-- ---------------------------------------------------------------------

alter table verifications
  add column hpa_practitioner_id uuid
    references hpa_practitioners(id) on delete set null,
  add column match_method verification_match_method not null default 'manual',
  add column match_confidence numeric(5, 4),
  add column registry_checked_at timestamptz,
  add column registry_status text,
  add column reviewer_id uuid
    references users(id) on delete set null,
  add column review_notes text,
  add constraint verifications_match_confidence_range
    check (
      match_confidence is null
      or (match_confidence >= 0 and match_confidence <= 1)
    );

create index verifications_hpa_practitioner_id_idx
  on verifications (hpa_practitioner_id);
create index verifications_reviewer_id_idx
  on verifications (reviewer_id);
create index verifications_match_method_idx
  on verifications (match_method);

-- Professionals must not write HPA / review fields on their own case.
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
       or new.hpa_practitioner_id is distinct from old.hpa_practitioner_id
       or new.match_method is distinct from old.match_method
       or new.match_confidence is distinct from old.match_confidence
       or new.registry_checked_at is distinct from old.registry_checked_at
       or new.registry_status is distinct from old.registry_status
       or new.reviewer_id is distinct from old.reviewer_id
       or new.review_notes is distinct from old.review_notes
     ) then
    raise exception 'Only administrators may update verification review fields'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- RLS: HPA registry is reference data. Authenticated professionals
-- cannot read or write it. App matching will use Drizzle / service role
-- (bypasses RLS). Admins may manage rows via the authenticated client.
-- ---------------------------------------------------------------------

alter table public.hpa_registry_imports enable row level security;
alter table public.hpa_practitioners enable row level security;

drop policy if exists hpa_registry_imports_select_admin
  on public.hpa_registry_imports;
create policy hpa_registry_imports_select_admin
  on public.hpa_registry_imports
  for select
  to authenticated
  using (public.app_user_is_admin());

drop policy if exists hpa_registry_imports_insert_admin
  on public.hpa_registry_imports;
create policy hpa_registry_imports_insert_admin
  on public.hpa_registry_imports
  for insert
  to authenticated
  with check (public.app_user_is_admin());

drop policy if exists hpa_registry_imports_update_admin
  on public.hpa_registry_imports;
create policy hpa_registry_imports_update_admin
  on public.hpa_registry_imports
  for update
  to authenticated
  using (public.app_user_is_admin())
  with check (public.app_user_is_admin());

drop policy if exists hpa_registry_imports_delete_admin
  on public.hpa_registry_imports;
create policy hpa_registry_imports_delete_admin
  on public.hpa_registry_imports
  for delete
  to authenticated
  using (public.app_user_is_admin());

drop policy if exists hpa_practitioners_select_admin
  on public.hpa_practitioners;
create policy hpa_practitioners_select_admin
  on public.hpa_practitioners
  for select
  to authenticated
  using (public.app_user_is_admin());

drop policy if exists hpa_practitioners_insert_admin
  on public.hpa_practitioners;
create policy hpa_practitioners_insert_admin
  on public.hpa_practitioners
  for insert
  to authenticated
  with check (public.app_user_is_admin());

drop policy if exists hpa_practitioners_update_admin
  on public.hpa_practitioners;
create policy hpa_practitioners_update_admin
  on public.hpa_practitioners
  for update
  to authenticated
  using (public.app_user_is_admin())
  with check (public.app_user_is_admin());

drop policy if exists hpa_practitioners_delete_admin
  on public.hpa_practitioners;
create policy hpa_practitioners_delete_admin
  on public.hpa_practitioners
  for delete
  to authenticated
  using (public.app_user_is_admin());

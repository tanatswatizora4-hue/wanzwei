-- =====================================================================
-- 0005_rls_gap_hardening.sql - RLS gap hardening for private beta
--
-- Adds/repairs RLS policies for:
--   - facilities
--   - interviews
--   - courses
--   - listings
--   - professional_documents
--   - facility_verification_documents
--
-- =====================================================================

-- ---------------------------------------------------------------------
-- Helper functions (safe to re-run)
-- ---------------------------------------------------------------------

create or replace function public.app_user_is_professional()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(public.app_user_role() = 'professional'::public.role, false)
$$;

create or replace function public.app_user_is_facility()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(public.app_user_role() = 'facility'::public.role, false)
$$;

grant execute on function public.app_user_is_professional() to authenticated;
grant execute on function public.app_user_is_facility() to authenticated;

-- ---------------------------------------------------------------------
-- facilities
-- ---------------------------------------------------------------------

alter table public.facilities enable row level security;

drop policy if exists facilities_select_authenticated_or_admin on public.facilities;
create policy facilities_select_authenticated_or_admin
  on public.facilities
  for select
  to authenticated
  using (true);

drop policy if exists facilities_update_own_or_admin on public.facilities;
create policy facilities_update_own_or_admin
  on public.facilities
  for update
  to authenticated
  using (
    public.app_user_is_admin()
    or public.app_user_owns_facility(id)
  )
  with check (
    public.app_user_is_admin()
    or public.app_user_owns_facility(id)
  );

drop policy if exists facilities_insert_admin_only on public.facilities;
create policy facilities_insert_admin_only
  on public.facilities
  for insert
  to authenticated
  with check (public.app_user_is_admin());

drop policy if exists facilities_delete_admin_only on public.facilities;
create policy facilities_delete_admin_only
  on public.facilities
  for delete
  to authenticated
  using (public.app_user_is_admin());

-- ---------------------------------------------------------------------
-- interviews
-- ---------------------------------------------------------------------

alter table public.interviews enable row level security;

drop policy if exists interviews_select_participants_facility_or_admin on public.interviews;
create policy interviews_select_participants_facility_or_admin
  on public.interviews
  for select
  to authenticated
  using (
    public.app_user_is_admin()
    or professional_id = auth.uid()
    or public.app_facility_owns_job(job_id)
  );

drop policy if exists interviews_insert_facility_or_admin on public.interviews;
create policy interviews_insert_facility_or_admin
  on public.interviews
  for insert
  to authenticated
  with check (
    public.app_user_is_admin()
    or public.app_facility_owns_job(job_id)
  );

drop policy if exists interviews_update_facility_or_admin on public.interviews;
create policy interviews_update_facility_or_admin
  on public.interviews
  for update
  to authenticated
  using (
    public.app_user_is_admin()
    or public.app_facility_owns_job(job_id)
  )
  with check (
    public.app_user_is_admin()
    or public.app_facility_owns_job(job_id)
  );

drop policy if exists interviews_delete_admin_only on public.interviews;
create policy interviews_delete_admin_only
  on public.interviews
  for delete
  to authenticated
  using (public.app_user_is_admin());

-- ---------------------------------------------------------------------
-- courses
-- ---------------------------------------------------------------------

alter table public.courses enable row level security;

drop policy if exists courses_select_authenticated on public.courses;
create policy courses_select_authenticated
  on public.courses
  for select
  to authenticated
  using (true);

drop policy if exists courses_insert_admin_only on public.courses;
create policy courses_insert_admin_only
  on public.courses
  for insert
  to authenticated
  with check (public.app_user_is_admin());

drop policy if exists courses_update_admin_only on public.courses;
create policy courses_update_admin_only
  on public.courses
  for update
  to authenticated
  using (public.app_user_is_admin())
  with check (public.app_user_is_admin());

drop policy if exists courses_delete_admin_only on public.courses;
create policy courses_delete_admin_only
  on public.courses
  for delete
  to authenticated
  using (public.app_user_is_admin());

-- ---------------------------------------------------------------------
-- listings
-- ---------------------------------------------------------------------

alter table public.listings enable row level security;

drop policy if exists listings_select_authenticated on public.listings;
create policy listings_select_authenticated
  on public.listings
  for select
  to authenticated
  using (true);

-- Listings table currently does not track an explicit owner column in the
-- schema. We therefore scope write access to "facility" users and admins.
drop policy if exists listings_insert_owner_or_admin on public.listings;
create policy listings_insert_owner_or_admin
  on public.listings
  for insert
  to authenticated
  with check (
    public.app_user_is_admin()
    or public.app_user_is_facility()
  );

drop policy if exists listings_update_owner_or_admin on public.listings;
create policy listings_update_owner_or_admin
  on public.listings
  for update
  to authenticated
  using (
    public.app_user_is_admin()
    or public.app_user_is_facility()
  )
  with check (
    public.app_user_is_admin()
    or public.app_user_is_facility()
  );

drop policy if exists listings_delete_owner_or_admin on public.listings;
create policy listings_delete_owner_or_admin
  on public.listings
  for delete
  to authenticated
  using (
    public.app_user_is_admin()
    or public.app_user_is_facility()
  );

-- ---------------------------------------------------------------------
-- professional_documents
-- ---------------------------------------------------------------------

alter table public.professional_documents enable row level security;

drop policy if exists professional_documents_select_own_or_admin on public.professional_documents;
create policy professional_documents_select_own_or_admin
  on public.professional_documents
  for select
  to authenticated
  using (
    public.app_user_is_admin()
    or (
      public.app_user_is_professional()
      and user_id = auth.uid()::text
    )
  );

drop policy if exists professional_documents_insert_owner_only on public.professional_documents;
create policy professional_documents_insert_owner_only
  on public.professional_documents
  for insert
  to authenticated
  with check (
    public.app_user_is_professional()
    and user_id = auth.uid()::text
  );

drop policy if exists professional_documents_update_owner_or_admin on public.professional_documents;
create policy professional_documents_update_owner_or_admin
  on public.professional_documents
  for update
  to authenticated
  using (
    public.app_user_is_admin()
    or (
      public.app_user_is_professional()
      and user_id = auth.uid()::text
    )
  )
  with check (
    public.app_user_is_admin()
    or (
      public.app_user_is_professional()
      and user_id = auth.uid()::text
    )
  );

drop policy if exists professional_documents_delete_owner_or_admin on public.professional_documents;
create policy professional_documents_delete_owner_or_admin
  on public.professional_documents
  for delete
  to authenticated
  using (
    public.app_user_is_admin()
    or (
      public.app_user_is_professional()
      and user_id = auth.uid()::text
    )
  );

-- ---------------------------------------------------------------------
-- facility_verification_documents
-- ---------------------------------------------------------------------

alter table public.facility_verification_documents enable row level security;

drop policy if exists facility_verification_documents_select_facility_or_admin on public.facility_verification_documents;
create policy facility_verification_documents_select_facility_or_admin
  on public.facility_verification_documents
  for select
  to authenticated
  using (
    public.app_user_is_admin()
    or (
      public.app_user_is_facility()
      and facility_id = public.app_user_facility_id()::text
    )
  );

drop policy if exists facility_verification_documents_insert_facility_owner_only on public.facility_verification_documents;
create policy facility_verification_documents_insert_facility_owner_only
  on public.facility_verification_documents
  for insert
  to authenticated
  with check (
    public.app_user_is_facility()
    and facility_id = public.app_user_facility_id()::text
    and user_id = auth.uid()::text
  );

drop policy if exists facility_verification_documents_update_owner_or_admin on public.facility_verification_documents;
create policy facility_verification_documents_update_owner_or_admin
  on public.facility_verification_documents
  for update
  to authenticated
  using (
    public.app_user_is_admin()
    or (
      public.app_user_is_facility()
      and facility_id = public.app_user_facility_id()::text
    )
  )
  with check (
    public.app_user_is_admin()
    or (
      public.app_user_is_facility()
      and facility_id = public.app_user_facility_id()::text
    )
  );

drop policy if exists facility_verification_documents_delete_owner_or_admin on public.facility_verification_documents;
create policy facility_verification_documents_delete_owner_or_admin
  on public.facility_verification_documents
  for delete
  to authenticated
  using (
    public.app_user_is_admin()
    or (
      public.app_user_is_facility()
      and facility_id = public.app_user_facility_id()::text
    )
  );


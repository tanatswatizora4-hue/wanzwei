-- =====================================================================
-- 0017_database_security_hardening.sql
-- Release hardening for staging advisor findings.
--
-- Does not change authorization semantics, product behavior, or data.
-- Does not create policies on practitioner_registry, verification_events,
-- or verification_evidence (RLS-enabled, no client policies = default deny).
--
-- Reverse (manual, not applied):
--   drop index if exists public.account_memberships_professional_profile_id_idx;
--   drop index if exists public.listing_images_owner_id_idx;
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Pin search_path on trigger + SECURITY DEFINER helpers.
--    Function bodies are unchanged.
-- ---------------------------------------------------------------------

alter function public.set_updated_at()
  set search_path = public, pg_temp;

alter function public.app_user_role()
  set search_path = public, pg_temp;
alter function public.app_user_facility_id()
  set search_path = public, pg_temp;
alter function public.app_user_is_admin()
  set search_path = public, pg_temp;
alter function public.app_user_owns_facility(uuid)
  set search_path = public, pg_temp;
alter function public.app_facility_owns_job(uuid)
  set search_path = public, pg_temp;
alter function public.app_facility_owns_application(uuid)
  set search_path = public, pg_temp;
alter function public.app_facility_owns_alert(uuid)
  set search_path = public, pg_temp;
alter function public.app_alert_assigned_to_user(uuid)
  set search_path = public, pg_temp;
alter function public.app_user_is_professional()
  set search_path = public, pg_temp;
alter function public.app_user_is_facility()
  set search_path = public, pg_temp;
alter function public.app_user_has_professional_membership()
  set search_path = public, pg_temp;
alter function public.app_user_has_facility_membership(uuid)
  set search_path = public, pg_temp;
alter function public.app_user_owns_listing(uuid)
  set search_path = public, pg_temp;
alter function public.prevent_user_self_privilege_update()
  set search_path = public, pg_temp;
alter function public.prevent_verification_self_review_update()
  set search_path = public, pg_temp;
alter function public.prevent_alert_recipient_identity_update()
  set search_path = public, pg_temp;
alter function public.prevent_facility_self_verify()
  set search_path = public, pg_temp;

-- ---------------------------------------------------------------------
-- 2. SECURITY DEFINER execute grants.
--    Default PUBLIC execute is revoked. Anon never executes these.
--    RLS helpers remain executable by authenticated (policy evaluation).
--    Trigger-only functions are not granted to clients.
-- ---------------------------------------------------------------------

revoke all on function public.app_user_role() from public, anon;
revoke all on function public.app_user_facility_id() from public, anon;
revoke all on function public.app_user_is_admin() from public, anon;
revoke all on function public.app_user_owns_facility(uuid) from public, anon;
revoke all on function public.app_facility_owns_job(uuid) from public, anon;
revoke all on function public.app_facility_owns_application(uuid) from public, anon;
revoke all on function public.app_facility_owns_alert(uuid) from public, anon;
revoke all on function public.app_alert_assigned_to_user(uuid) from public, anon;
revoke all on function public.app_user_is_professional() from public, anon;
revoke all on function public.app_user_is_facility() from public, anon;
revoke all on function public.app_user_has_professional_membership() from public, anon;
revoke all on function public.app_user_has_facility_membership(uuid) from public, anon;
revoke all on function public.app_user_owns_listing(uuid) from public, anon;

grant execute on function public.app_user_role() to authenticated;
grant execute on function public.app_user_facility_id() to authenticated;
grant execute on function public.app_user_is_admin() to authenticated;
grant execute on function public.app_user_owns_facility(uuid) to authenticated;
grant execute on function public.app_facility_owns_job(uuid) to authenticated;
grant execute on function public.app_facility_owns_application(uuid) to authenticated;
grant execute on function public.app_facility_owns_alert(uuid) to authenticated;
grant execute on function public.app_alert_assigned_to_user(uuid) to authenticated;
grant execute on function public.app_user_is_professional() to authenticated;
grant execute on function public.app_user_is_facility() to authenticated;
grant execute on function public.app_user_has_professional_membership() to authenticated;
grant execute on function public.app_user_has_facility_membership(uuid) to authenticated;
grant execute on function public.app_user_owns_listing(uuid) to authenticated;

revoke all on function public.prevent_user_self_privilege_update() from public, anon, authenticated;
revoke all on function public.prevent_verification_self_review_update() from public, anon, authenticated;
revoke all on function public.prevent_alert_recipient_identity_update() from public, anon, authenticated;
revoke all on function public.prevent_facility_self_verify() from public, anon, authenticated;
revoke all on function public.set_updated_at() from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 3. Covering indexes (advisor unindexed foreign keys).
-- ---------------------------------------------------------------------

create index if not exists account_memberships_professional_profile_id_idx
  on public.account_memberships (professional_profile_id);

create index if not exists listing_images_owner_id_idx
  on public.listing_images (owner_id);

-- ---------------------------------------------------------------------
-- 4. Straightforward RLS InitPlan wrapping of auth.uid().
--    Semantics unchanged: same comparisons, same helper calls.
--    Limited to 0014–0016 policies; no rewrite of 0003–0013 policies.
-- ---------------------------------------------------------------------

drop policy if exists account_memberships_select_own_or_admin
  on public.account_memberships;
create policy account_memberships_select_own_or_admin
  on public.account_memberships
  for select
  to authenticated
  using (
    public.app_user_is_admin()
    or user_id = (select auth.uid())
  );

drop policy if exists listing_images_select_public_or_owner
  on public.listing_images;
create policy listing_images_select_public_or_owner
  on public.listing_images
  for select
  to authenticated
  using (
    public.app_user_is_admin()
    or owner_id = (select auth.uid())
    or exists (
      select 1
      from public.listings l
      where l.id = listing_id
        and l.status = 'Open'
    )
    or exists (
      select 1
      from public.listings l
      where l.id = listing_id
        and l.seller_type = 'facility'
        and l.facility_id is not null
        and public.app_user_has_facility_membership(l.facility_id)
    )
  );

drop policy if exists listings_select_authenticated on public.listings;
create policy listings_select_authenticated
  on public.listings
  for select
  to authenticated
  using (
    status = 'Open'
    or public.app_user_is_admin()
    or owner_id = (select auth.uid())
    or (
      seller_type = 'facility'
      and facility_id is not null
      and public.app_user_has_facility_membership(facility_id)
    )
  );

drop policy if exists listings_insert_owner_or_admin on public.listings;
create policy listings_insert_owner_or_admin
  on public.listings
  for insert
  to authenticated
  with check (
    public.app_user_is_admin()
    or (
      owner_id = (select auth.uid())
      and seller_type = 'professional'
      and facility_id is null
      and public.app_user_has_professional_membership()
      and exists (
        select 1 from public.users u
        where u.id = (select auth.uid()) and u.verified = true
      )
    )
    or (
      owner_id = (select auth.uid())
      and seller_type = 'facility'
      and facility_id is not null
      and public.app_user_has_facility_membership(facility_id)
    )
  );

drop policy if exists listings_update_owner_or_admin on public.listings;
create policy listings_update_owner_or_admin
  on public.listings
  for update
  to authenticated
  using (
    public.app_user_is_admin()
    or owner_id = (select auth.uid())
    or (
      seller_type = 'facility'
      and facility_id is not null
      and public.app_user_has_facility_membership(facility_id)
    )
  )
  with check (
    public.app_user_is_admin()
    or owner_id = (select auth.uid())
    or (
      seller_type = 'facility'
      and facility_id is not null
      and public.app_user_has_facility_membership(facility_id)
    )
  );

drop policy if exists listings_delete_owner_or_admin on public.listings;
create policy listings_delete_owner_or_admin
  on public.listings
  for delete
  to authenticated
  using (
    public.app_user_is_admin()
    or owner_id = (select auth.uid())
    or (
      seller_type = 'facility'
      and facility_id is not null
      and public.app_user_has_facility_membership(facility_id)
    )
  );

drop policy if exists cpd_certificates_select_own_or_admin
  on public.cpd_certificates;
create policy cpd_certificates_select_own_or_admin
  on public.cpd_certificates
  for select
  to authenticated
  using (
    public.app_user_is_admin()
    or user_id = (select auth.uid())
  );

drop policy if exists course_enrolments_insert_own_professional
  on public.course_enrolments;
create policy course_enrolments_insert_own_professional
  on public.course_enrolments
  for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and (
      public.app_user_is_professional()
      or public.app_user_has_professional_membership()
    )
  );

drop policy if exists course_enrolments_update_own_or_admin
  on public.course_enrolments;
create policy course_enrolments_update_own_or_admin
  on public.course_enrolments
  for update
  to authenticated
  using (
    public.app_user_is_admin()
    or (
      user_id = (select auth.uid())
      and (
        public.app_user_is_professional()
        or public.app_user_has_professional_membership()
      )
    )
  )
  with check (
    public.app_user_is_admin()
    or (
      user_id = (select auth.uid())
      and (
        public.app_user_is_professional()
        or public.app_user_has_professional_membership()
      )
    )
  );

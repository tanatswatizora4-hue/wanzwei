-- =====================================================================
-- 0003_phase4_rls.sql - Phase 4 row level security policies.
--
-- These policies intentionally derive authorization from public.users,
-- not client-supplied role claims. They assume public.users.id is aligned
-- with auth.users.id / auth.uid(). The initial schema still permits random
-- UUID defaults for scaffolding, so production auth provisioning must create
-- each public.users row with id = auth.users.id before relying on these
-- policies.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Authorization helpers
-- ---------------------------------------------------------------------

create or replace function public.app_user_role()
returns public.role
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select u.role
  from public.users u
  where u.id = auth.uid()
$$;

create or replace function public.app_user_facility_id()
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select u.facility_id
  from public.users u
  where u.id = auth.uid()
$$;

create or replace function public.app_user_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(public.app_user_role() = 'admin'::public.role, false)
$$;

create or replace function public.app_user_owns_facility(target_facility_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    public.app_user_role() = 'facility'::public.role
    and public.app_user_facility_id() = target_facility_id,
    false
  )
$$;

create or replace function public.app_facility_owns_job(target_job_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.jobs j
    where j.id = target_job_id
      and public.app_user_owns_facility(j.facility_id)
  )
$$;

create or replace function public.app_facility_owns_application(target_application_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.applications a
    where a.id = target_application_id
      and public.app_facility_owns_job(a.job_id)
  )
$$;

create or replace function public.app_facility_owns_alert(target_alert_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.emergency_alerts ea
    where ea.id = target_alert_id
      and public.app_user_owns_facility(ea.facility_id)
  )
$$;

create or replace function public.app_alert_assigned_to_user(target_alert_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.emergency_alert_recipients ear
    where ear.alert_id = target_alert_id
      and ear.professional_id = auth.uid()
  )
$$;

grant execute on function public.app_user_role() to authenticated;
grant execute on function public.app_user_facility_id() to authenticated;
grant execute on function public.app_user_is_admin() to authenticated;
grant execute on function public.app_user_owns_facility(uuid) to authenticated;
grant execute on function public.app_facility_owns_job(uuid) to authenticated;
grant execute on function public.app_facility_owns_application(uuid) to authenticated;
grant execute on function public.app_facility_owns_alert(uuid) to authenticated;
grant execute on function public.app_alert_assigned_to_user(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- Guard protected fields that RLS cannot express at column level.
-- ---------------------------------------------------------------------

create or replace function public.prevent_user_self_privilege_update()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.app_user_is_admin()
     and auth.uid() = old.id
     and (
       new.role is distinct from old.role
       or new.facility_id is distinct from old.facility_id
       or new.verified is distinct from old.verified
     ) then
    raise exception 'Only administrators may update protected user fields'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_users_prevent_self_privilege_update on public.users;
create trigger trg_users_prevent_self_privilege_update
  before update on public.users
  for each row execute function public.prevent_user_self_privilege_update();

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
     ) then
    raise exception 'Only administrators may update verification review fields'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_verifications_prevent_self_review_update on public.verifications;
create trigger trg_verifications_prevent_self_review_update
  before update on public.verifications
  for each row execute function public.prevent_verification_self_review_update();

create or replace function public.prevent_alert_recipient_identity_update()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.app_user_is_admin()
     and (
       new.alert_id is distinct from old.alert_id
       or new.professional_id is distinct from old.professional_id
     ) then
    raise exception 'Alert recipient identity fields are immutable'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_alert_recipients_prevent_identity_update
  on public.emergency_alert_recipients;
create trigger trg_alert_recipients_prevent_identity_update
  before update on public.emergency_alert_recipients
  for each row execute function public.prevent_alert_recipient_identity_update();

-- ---------------------------------------------------------------------
-- Enable RLS
-- ---------------------------------------------------------------------

alter table public.users enable row level security;
alter table public.applications enable row level security;
alter table public.jobs enable row level security;
alter table public.emergency_alerts enable row level security;
alter table public.emergency_alert_recipients enable row level security;
alter table public.notifications enable row level security;
alter table public.saved_jobs enable row level security;
alter table public.verifications enable row level security;
alter table public.verification_documents enable row level security;

-- ---------------------------------------------------------------------
-- users: users read/update themselves; admins manage all.
-- ---------------------------------------------------------------------

drop policy if exists users_select_self_or_admin on public.users;
create policy users_select_self_or_admin
  on public.users
  for select
  to authenticated
  using (id = auth.uid() or public.app_user_is_admin());

drop policy if exists users_update_self_or_admin on public.users;
create policy users_update_self_or_admin
  on public.users
  for update
  to authenticated
  using (id = auth.uid() or public.app_user_is_admin())
  with check (id = auth.uid() or public.app_user_is_admin());

drop policy if exists users_delete_admin on public.users;
create policy users_delete_admin
  on public.users
  for delete
  to authenticated
  using (public.app_user_is_admin());

-- ---------------------------------------------------------------------
-- jobs: authenticated users read; facility owners manage own jobs;
-- admins manage all.
-- ---------------------------------------------------------------------

drop policy if exists jobs_select_authenticated on public.jobs;
create policy jobs_select_authenticated
  on public.jobs
  for select
  to authenticated
  using (true);

drop policy if exists jobs_insert_facility_owner_or_admin on public.jobs;
create policy jobs_insert_facility_owner_or_admin
  on public.jobs
  for insert
  to authenticated
  with check (
    public.app_user_is_admin()
    or public.app_user_owns_facility(facility_id)
  );

drop policy if exists jobs_update_facility_owner_or_admin on public.jobs;
create policy jobs_update_facility_owner_or_admin
  on public.jobs
  for update
  to authenticated
  using (
    public.app_user_is_admin()
    or public.app_user_owns_facility(facility_id)
  )
  with check (
    public.app_user_is_admin()
    or public.app_user_owns_facility(facility_id)
  );

drop policy if exists jobs_delete_facility_owner_or_admin on public.jobs;
create policy jobs_delete_facility_owner_or_admin
  on public.jobs
  for delete
  to authenticated
  using (
    public.app_user_is_admin()
    or public.app_user_owns_facility(facility_id)
  );

-- ---------------------------------------------------------------------
-- applications: professionals see/create own applications; facilities see
-- and update applications to their jobs; admins manage all.
-- ---------------------------------------------------------------------

drop policy if exists applications_select_participant_or_admin on public.applications;
create policy applications_select_participant_or_admin
  on public.applications
  for select
  to authenticated
  using (
    public.app_user_is_admin()
    or professional_id = auth.uid()
    or public.app_facility_owns_job(job_id)
  );

drop policy if exists applications_insert_professional_or_admin on public.applications;
create policy applications_insert_professional_or_admin
  on public.applications
  for insert
  to authenticated
  with check (
    public.app_user_is_admin()
    or (
      professional_id = auth.uid()
      and public.app_user_role() = 'professional'::public.role
    )
  );

drop policy if exists applications_update_facility_or_admin on public.applications;
create policy applications_update_facility_or_admin
  on public.applications
  for update
  to authenticated
  using (
    public.app_user_is_admin()
    or public.app_facility_owns_application(id)
  )
  with check (
    public.app_user_is_admin()
    or public.app_facility_owns_job(job_id)
  );

drop policy if exists applications_delete_owner_facility_or_admin on public.applications;
create policy applications_delete_owner_facility_or_admin
  on public.applications
  for delete
  to authenticated
  using (
    public.app_user_is_admin()
    or professional_id = auth.uid()
    or public.app_facility_owns_application(id)
  );

-- ---------------------------------------------------------------------
-- emergency_alerts: facilities manage own alerts; professionals see assigned
-- alerts; admins manage all.
-- ---------------------------------------------------------------------

drop policy if exists emergency_alerts_select_participant_or_admin on public.emergency_alerts;
create policy emergency_alerts_select_participant_or_admin
  on public.emergency_alerts
  for select
  to authenticated
  using (
    public.app_user_is_admin()
    or public.app_user_owns_facility(facility_id)
    or public.app_alert_assigned_to_user(id)
  );

drop policy if exists emergency_alerts_insert_facility_or_admin on public.emergency_alerts;
create policy emergency_alerts_insert_facility_or_admin
  on public.emergency_alerts
  for insert
  to authenticated
  with check (
    public.app_user_is_admin()
    or public.app_user_owns_facility(facility_id)
  );

drop policy if exists emergency_alerts_update_facility_or_admin on public.emergency_alerts;
create policy emergency_alerts_update_facility_or_admin
  on public.emergency_alerts
  for update
  to authenticated
  using (
    public.app_user_is_admin()
    or public.app_user_owns_facility(facility_id)
  )
  with check (
    public.app_user_is_admin()
    or public.app_user_owns_facility(facility_id)
  );

drop policy if exists emergency_alerts_delete_facility_or_admin on public.emergency_alerts;
create policy emergency_alerts_delete_facility_or_admin
  on public.emergency_alerts
  for delete
  to authenticated
  using (
    public.app_user_is_admin()
    or public.app_user_owns_facility(facility_id)
  );

-- ---------------------------------------------------------------------
-- emergency_alert_recipients: facilities manage recipients for own alerts;
-- professionals see/update their own assignment response; admins manage all.
-- ---------------------------------------------------------------------

drop policy if exists alert_recipients_select_participant_or_admin
  on public.emergency_alert_recipients;
create policy alert_recipients_select_participant_or_admin
  on public.emergency_alert_recipients
  for select
  to authenticated
  using (
    public.app_user_is_admin()
    or professional_id = auth.uid()
    or public.app_facility_owns_alert(alert_id)
  );

drop policy if exists alert_recipients_insert_facility_or_admin
  on public.emergency_alert_recipients;
create policy alert_recipients_insert_facility_or_admin
  on public.emergency_alert_recipients
  for insert
  to authenticated
  with check (
    public.app_user_is_admin()
    or public.app_facility_owns_alert(alert_id)
  );

drop policy if exists alert_recipients_update_participant_or_admin
  on public.emergency_alert_recipients;
create policy alert_recipients_update_participant_or_admin
  on public.emergency_alert_recipients
  for update
  to authenticated
  using (
    public.app_user_is_admin()
    or professional_id = auth.uid()
    or public.app_facility_owns_alert(alert_id)
  )
  with check (
    public.app_user_is_admin()
    or professional_id = auth.uid()
    or public.app_facility_owns_alert(alert_id)
  );

drop policy if exists alert_recipients_delete_facility_or_admin
  on public.emergency_alert_recipients;
create policy alert_recipients_delete_facility_or_admin
  on public.emergency_alert_recipients
  for delete
  to authenticated
  using (
    public.app_user_is_admin()
    or public.app_facility_owns_alert(alert_id)
  );

-- ---------------------------------------------------------------------
-- notifications: owner only.
-- ---------------------------------------------------------------------

drop policy if exists notifications_select_owner on public.notifications;
create policy notifications_select_owner
  on public.notifications
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists notifications_insert_owner on public.notifications;
create policy notifications_insert_owner
  on public.notifications
  for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists notifications_update_owner on public.notifications;
create policy notifications_update_owner
  on public.notifications
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists notifications_delete_owner on public.notifications;
create policy notifications_delete_owner
  on public.notifications
  for delete
  to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- saved_jobs: owner only.
-- ---------------------------------------------------------------------

drop policy if exists saved_jobs_select_owner on public.saved_jobs;
create policy saved_jobs_select_owner
  on public.saved_jobs
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists saved_jobs_insert_owner on public.saved_jobs;
create policy saved_jobs_insert_owner
  on public.saved_jobs
  for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists saved_jobs_update_owner on public.saved_jobs;
create policy saved_jobs_update_owner
  on public.saved_jobs
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists saved_jobs_delete_owner on public.saved_jobs;
create policy saved_jobs_delete_owner
  on public.saved_jobs
  for delete
  to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- verifications: user self-service with admin review/management.
-- ---------------------------------------------------------------------

drop policy if exists verifications_select_self_or_admin on public.verifications;
create policy verifications_select_self_or_admin
  on public.verifications
  for select
  to authenticated
  using (user_id = auth.uid() or public.app_user_is_admin());

drop policy if exists verifications_insert_self_or_admin on public.verifications;
create policy verifications_insert_self_or_admin
  on public.verifications
  for insert
  to authenticated
  with check (user_id = auth.uid() or public.app_user_is_admin());

drop policy if exists verifications_update_self_or_admin on public.verifications;
create policy verifications_update_self_or_admin
  on public.verifications
  for update
  to authenticated
  using (user_id = auth.uid() or public.app_user_is_admin())
  with check (user_id = auth.uid() or public.app_user_is_admin());

drop policy if exists verifications_delete_self_or_admin on public.verifications;
create policy verifications_delete_self_or_admin
  on public.verifications
  for delete
  to authenticated
  using (user_id = auth.uid() or public.app_user_is_admin());

-- ---------------------------------------------------------------------
-- verification_documents: documents follow the verification owner/admin.
-- ---------------------------------------------------------------------

drop policy if exists verification_documents_select_self_or_admin
  on public.verification_documents;
create policy verification_documents_select_self_or_admin
  on public.verification_documents
  for select
  to authenticated
  using (user_id = auth.uid() or public.app_user_is_admin());

drop policy if exists verification_documents_insert_self_or_admin
  on public.verification_documents;
create policy verification_documents_insert_self_or_admin
  on public.verification_documents
  for insert
  to authenticated
  with check (
    public.app_user_is_admin()
    or (
      user_id = auth.uid()
      and exists (
        select 1
        from public.verifications v
        where v.id = verification_id
          and v.user_id = auth.uid()
      )
    )
  );

drop policy if exists verification_documents_update_self_or_admin
  on public.verification_documents;
create policy verification_documents_update_self_or_admin
  on public.verification_documents
  for update
  to authenticated
  using (user_id = auth.uid() or public.app_user_is_admin())
  with check (
    public.app_user_is_admin()
    or (
      user_id = auth.uid()
      and exists (
        select 1
        from public.verifications v
        where v.id = verification_id
          and v.user_id = auth.uid()
      )
    )
  );

drop policy if exists verification_documents_delete_self_or_admin
  on public.verification_documents;
create policy verification_documents_delete_self_or_admin
  on public.verification_documents
  for delete
  to authenticated
  using (user_id = auth.uid() or public.app_user_is_admin());

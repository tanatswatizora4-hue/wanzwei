-- =====================================================================
-- 0014_account_memberships.sql
-- Additive account ↔ workspace memberships.
--
-- Distinguishes the authenticated Auth user from the active professional
-- or facility workspace. Does NOT change public.users.role, Auth UUIDs,
-- or admin (admin remains a system privilege on public.users.role).
--
-- Reverse (manual, not applied):
--   drop table if exists public.account_memberships;
--   drop function if exists public.app_user_has_professional_membership();
--   drop function if exists public.app_user_has_facility_membership(uuid);
-- =====================================================================

create table if not exists public.account_memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  profile_type text not null check (profile_type in ('professional', 'facility')),
  professional_profile_id uuid references public.users(id) on delete cascade,
  facility_id uuid references public.facilities(id) on delete cascade,
  membership_role text not null check (
    membership_role in ('owner', 'admin', 'recruiter', 'viewer')
  ),
  status text not null default 'active' check (status in ('active', 'revoked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint account_memberships_shape_chk check (
    (
      profile_type = 'professional'
      and professional_profile_id is not null
      and facility_id is null
      and membership_role = 'owner'
      and professional_profile_id = user_id
    )
    or (
      profile_type = 'facility'
      and facility_id is not null
      and professional_profile_id is null
      and membership_role in ('owner', 'admin', 'recruiter', 'viewer')
    )
  )
);

create unique index if not exists account_memberships_one_active_professional
  on public.account_memberships (user_id)
  where profile_type = 'professional' and status = 'active';

create unique index if not exists account_memberships_one_active_facility
  on public.account_memberships (user_id, facility_id)
  where profile_type = 'facility' and status = 'active';

create index if not exists account_memberships_user_id_idx
  on public.account_memberships (user_id);

create index if not exists account_memberships_facility_id_idx
  on public.account_memberships (facility_id);

drop trigger if exists trg_account_memberships_updated_at on public.account_memberships;
create trigger trg_account_memberships_updated_at
  before update on public.account_memberships
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- Authoritative backfill only.
-- Professional: users.role = professional → self-owned professional membership.
-- Facility owner: users.role = facility AND users.facility_id set → owner.
-- Do NOT infer from display name, email, or UI role selection.
-- Facility rows without facility_id are skipped (ownership unproven).
-- Admins are not converted into workspaces.
-- ---------------------------------------------------------------------

insert into public.account_memberships (
  user_id,
  profile_type,
  professional_profile_id,
  membership_role,
  status
)
select
  u.id,
  'professional',
  u.id,
  'owner',
  'active'
from public.users u
where u.role = 'professional'
  and u.deleted_at is null
on conflict (user_id) where (profile_type = 'professional' and status = 'active')
do nothing;

insert into public.account_memberships (
  user_id,
  profile_type,
  facility_id,
  membership_role,
  status
)
select
  u.id,
  'facility',
  u.facility_id,
  'owner',
  'active'
from public.users u
where u.role = 'facility'
  and u.facility_id is not null
  and u.deleted_at is null
  and exists (
    select 1 from public.facilities f where f.id = u.facility_id
  )
on conflict (user_id, facility_id) where (profile_type = 'facility' and status = 'active')
do nothing;

-- ---------------------------------------------------------------------
-- RLS: clients may read their own memberships. Writes are service-role only.
-- Users must not forge facility memberships from the client.
-- ---------------------------------------------------------------------

alter table public.account_memberships enable row level security;

revoke all on public.account_memberships from anon;
revoke insert, update, delete on public.account_memberships from authenticated;
grant select on public.account_memberships to authenticated;
grant all on public.account_memberships to service_role;

drop policy if exists account_memberships_select_own_or_admin
  on public.account_memberships;
create policy account_memberships_select_own_or_admin
  on public.account_memberships
  for select
  to authenticated
  using (
    public.app_user_is_admin()
    or user_id = auth.uid()
  );

drop policy if exists account_memberships_no_client_insert
  on public.account_memberships;
create policy account_memberships_no_client_insert
  on public.account_memberships
  for insert
  to authenticated
  with check (false);

drop policy if exists account_memberships_no_client_update
  on public.account_memberships;
create policy account_memberships_no_client_update
  on public.account_memberships
  for update
  to authenticated
  using (false)
  with check (false);

drop policy if exists account_memberships_no_client_delete
  on public.account_memberships;
create policy account_memberships_no_client_delete
  on public.account_memberships
  for delete
  to authenticated
  using (false);

create or replace function public.app_user_has_professional_membership()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.account_memberships m
    where m.user_id = auth.uid()
      and m.profile_type = 'professional'
      and m.status = 'active'
  )
$$;

create or replace function public.app_user_has_facility_membership(p_facility_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.account_memberships m
    where m.user_id = auth.uid()
      and m.profile_type = 'facility'
      and m.status = 'active'
      and m.facility_id = p_facility_id
  )
$$;

grant execute on function public.app_user_has_professional_membership() to authenticated;
grant execute on function public.app_user_has_facility_membership(uuid) to authenticated;

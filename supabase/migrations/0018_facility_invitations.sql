-- =====================================================================
-- 0018_facility_invitations.sql
-- Additive facility workspace invitations.
--
-- Does not change public.users.role, users.facility_id, Auth UUIDs,
-- or existing account_memberships.
--
-- Reverse (manual, not applied):
--   drop table if exists public.facility_invitations;
-- =====================================================================

create table if not exists public.facility_invitations (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references public.facilities(id) on delete cascade,
  email text not null,
  membership_role text not null check (
    membership_role in ('owner', 'admin', 'recruiter', 'viewer')
  ),
  token_hash text not null,
  status text not null default 'pending' check (
    status in ('pending', 'accepted', 'revoked', 'expired')
  ),
  invited_by uuid not null references public.users(id) on delete cascade,
  expires_at timestamptz not null,
  accepted_by uuid references public.users(id) on delete set null,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists facility_invitations_token_hash_uniq
  on public.facility_invitations (token_hash);

create unique index if not exists facility_invitations_one_pending_email
  on public.facility_invitations (facility_id, email)
  where status = 'pending';

create index if not exists facility_invitations_facility_id_idx
  on public.facility_invitations (facility_id);

create index if not exists facility_invitations_email_idx
  on public.facility_invitations (email);

create index if not exists facility_invitations_status_idx
  on public.facility_invitations (status);

drop trigger if exists trg_facility_invitations_updated_at
  on public.facility_invitations;
create trigger trg_facility_invitations_updated_at
  before update on public.facility_invitations
  for each row execute function set_updated_at();

alter table public.facility_invitations enable row level security;

revoke all on public.facility_invitations from anon, authenticated;
grant all on public.facility_invitations to service_role;

-- Intentionally no client policies: invitation tokens and membership grants
-- are server-controlled. Authenticated JWT clients cannot insert or accept.

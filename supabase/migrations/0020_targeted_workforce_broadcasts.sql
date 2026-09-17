-- =====================================================================
-- 0020_targeted_workforce_broadcasts.sql
-- Additive facility professional network + workforce broadcasts.
--
-- Does not change account_memberships, users.role, users.facility_id,
-- emergency alert matching, or existing jobs.
-- Network membership is NOT workspace authorization.
--
-- Reverse (manual, not applied):
--   drop table if exists public.workforce_broadcast_recipients;
--   drop table if exists public.workforce_broadcasts;
--   drop table if exists public.facility_professional_network;
-- =====================================================================

create table if not exists public.facility_professional_network (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references public.facilities(id) on delete cascade,
  professional_user_id uuid not null references public.users(id) on delete cascade,
  relationship_type text not null check (
    relationship_type in (
      'employee',
      'approved_locum',
      'previous_locum',
      'contractor',
      'talent_pool',
      'other'
    )
  ),
  status text not null default 'active' check (
    status in ('active', 'inactive', 'invited')
  ),
  added_by uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (facility_id, professional_user_id)
);

create index if not exists facility_professional_network_facility_id_idx
  on public.facility_professional_network (facility_id);

create index if not exists facility_professional_network_professional_user_id_idx
  on public.facility_professional_network (professional_user_id);

create index if not exists facility_professional_network_added_by_idx
  on public.facility_professional_network (added_by);

drop trigger if exists trg_facility_professional_network_updated_at
  on public.facility_professional_network;
create trigger trg_facility_professional_network_updated_at
  before update on public.facility_professional_network
  for each row execute function set_updated_at();

alter table public.facility_professional_network enable row level security;

revoke all on public.facility_professional_network from anon, authenticated;
grant all on public.facility_professional_network to service_role;

create table if not exists public.workforce_broadcasts (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references public.facilities(id) on delete cascade,
  created_by uuid not null references public.users(id) on delete cascade,
  type text not null check (
    type in ('emergency', 'locum', 'internal_locum', 'targeted_opportunity')
  ),
  title text not null,
  message text not null,
  location text,
  positions_needed integer check (
    positions_needed is null or positions_needed > 0
  ),
  shift_start timestamptz,
  shift_end timestamptz,
  status text not null default 'draft' check (
    status in ('draft', 'sent', 'cancelled')
  ),
  targeting_criteria jsonb not null default '{}'::jsonb,
  matched_recipient_count integer not null default 0,
  job_id uuid references public.jobs(id) on delete set null,
  emergency_alert_id uuid references public.emergency_alerts(id) on delete set null,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  updated_at timestamptz not null default now(),
  check (
    shift_start is null
    or shift_end is null
    or shift_end > shift_start
  )
);

create index if not exists workforce_broadcasts_facility_id_idx
  on public.workforce_broadcasts (facility_id);

create index if not exists workforce_broadcasts_created_by_idx
  on public.workforce_broadcasts (created_by);

create index if not exists workforce_broadcasts_job_id_idx
  on public.workforce_broadcasts (job_id);

create index if not exists workforce_broadcasts_emergency_alert_id_idx
  on public.workforce_broadcasts (emergency_alert_id);

create index if not exists workforce_broadcasts_status_idx
  on public.workforce_broadcasts (status);

drop trigger if exists trg_workforce_broadcasts_updated_at
  on public.workforce_broadcasts;
create trigger trg_workforce_broadcasts_updated_at
  before update on public.workforce_broadcasts
  for each row execute function set_updated_at();

alter table public.workforce_broadcasts enable row level security;

revoke all on public.workforce_broadcasts from anon, authenticated;
grant all on public.workforce_broadcasts to service_role;

create table if not exists public.workforce_broadcast_recipients (
  id uuid primary key default gen_random_uuid(),
  broadcast_id uuid not null references public.workforce_broadcasts(id) on delete cascade,
  professional_user_id uuid not null references public.users(id) on delete cascade,
  status text not null default 'notified' check (
    status in ('notified', 'failed')
  ),
  created_at timestamptz not null default now(),
  unique (broadcast_id, professional_user_id)
);

create index if not exists workforce_broadcast_recipients_broadcast_id_idx
  on public.workforce_broadcast_recipients (broadcast_id);

create index if not exists workforce_broadcast_recipients_professional_user_id_idx
  on public.workforce_broadcast_recipients (professional_user_id);

alter table public.workforce_broadcast_recipients enable row level security;

revoke all on public.workforce_broadcast_recipients from anon, authenticated;
grant all on public.workforce_broadcast_recipients to service_role;

-- Intentionally no client policies: network and broadcast writes are
-- server-controlled. Authenticated JWT clients cannot insert or send.

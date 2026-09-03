-- =====================================================================
-- 0009_cpd_marketplace_core.sql
-- Additive CPD enrolments + marketplace ownership/enquiries.
-- Reuses public.courses and public.listings. Does not drop data.
--
-- Reverse (manual, not applied):
--   drop table if exists public.listing_enquiries;
--   drop table if exists public.course_enrolments;
--   alter table public.listings drop column if exists owner_id;
--   alter table public.listings drop column if exists status;
--   alter table public.courses drop column if exists description;
--   alter table public.courses drop column if exists format;
--   alter table public.courses drop column if exists location;
--   alter table public.courses drop column if exists starts_at;
--   alter table public.courses drop column if exists ends_at;
--   drop type if exists public.listing_status;
--   drop type if exists public.course_enrolment_status;
--   drop type if exists public.course_format;
--   drop function if exists public.app_user_owns_listing(uuid);
-- =====================================================================

-- ---------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'course_format'
  ) then
    create type public.course_format as enum ('Online', 'In person', 'Hybrid');
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'course_enrolment_status'
  ) then
    create type public.course_enrolment_status as enum (
      'registered',
      'completed',
      'withdrawn'
    );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'listing_status'
  ) then
    create type public.listing_status as enum ('Open', 'Closed');
  end if;
end
$$;

-- ---------------------------------------------------------------------
-- courses: catalogue metadata (progress/status stay unused as learner state)
-- ---------------------------------------------------------------------

alter table public.courses
  add column if not exists description text not null default '';

alter table public.courses
  add column if not exists format public.course_format not null default 'Online';

alter table public.courses
  add column if not exists location text;

alter table public.courses
  add column if not exists starts_at timestamptz;

alter table public.courses
  add column if not exists ends_at timestamptz;

-- Repair broken /covers/* paths from staging seed. Gradient classes are the
-- supported cover representation; no image files were shipped.
update public.courses
set cover = case
  when cover like '/covers/%' or cover like 'http%' then 'from-violet-500 to-slate-800'
  else cover
end
where cover like '/covers/%' or cover like 'http%';

-- ---------------------------------------------------------------------
-- listings: owner + availability
-- ---------------------------------------------------------------------

alter table public.listings
  add column if not exists owner_id uuid references public.users(id) on delete set null;

alter table public.listings
  add column if not exists status public.listing_status not null default 'Open';

create index if not exists listings_owner_id_idx on public.listings(owner_id);
create index if not exists listings_status_idx on public.listings(status);

update public.listings
set cover = case
  when cover like '/covers/%' or cover like 'http%' then 'from-sky-500 to-slate-800'
  else cover
end
where cover like '/covers/%' or cover like 'http%';

-- ---------------------------------------------------------------------
-- course_enrolments
-- ---------------------------------------------------------------------

create table if not exists public.course_enrolments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  status public.course_enrolment_status not null default 'registered',
  enrolled_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint course_enrolments_user_course_uniq unique (user_id, course_id),
  constraint course_enrolments_completed_at_chk check (
    (status = 'completed' and completed_at is not null)
    or (status <> 'completed' and completed_at is null)
  )
);

create index if not exists course_enrolments_user_id_idx
  on public.course_enrolments(user_id);
create index if not exists course_enrolments_course_id_idx
  on public.course_enrolments(course_id);

drop trigger if exists trg_course_enrolments_updated_at on public.course_enrolments;
create trigger trg_course_enrolments_updated_at
  before update on public.course_enrolments
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- listing_enquiries (enquiry-based marketplace; no payments)
-- ---------------------------------------------------------------------

create table if not exists public.listing_enquiries (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  from_user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  email text not null,
  phone text not null default '',
  message text not null,
  created_at timestamptz not null default now()
);

create index if not exists listing_enquiries_listing_id_idx
  on public.listing_enquiries(listing_id);
create index if not exists listing_enquiries_from_user_id_idx
  on public.listing_enquiries(from_user_id);
create index if not exists listing_enquiries_created_at_idx
  on public.listing_enquiries(created_at desc);

-- ---------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------

grant select, insert, update, delete on public.course_enrolments to authenticated;
grant all on public.course_enrolments to service_role;

grant select, insert on public.listing_enquiries to authenticated;
grant all on public.listing_enquiries to service_role;

-- ---------------------------------------------------------------------
-- Helper: listing owner
-- ---------------------------------------------------------------------

create or replace function public.app_user_owns_listing(p_listing_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.listings l
    where l.id = p_listing_id
      and l.owner_id is not null
      and l.owner_id = auth.uid()
  )
$$;

grant execute on function public.app_user_owns_listing(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- RLS: course_enrolments
-- ---------------------------------------------------------------------

alter table public.course_enrolments enable row level security;

drop policy if exists course_enrolments_select_own_or_admin
  on public.course_enrolments;
create policy course_enrolments_select_own_or_admin
  on public.course_enrolments
  for select
  to authenticated
  using (
    public.app_user_is_admin()
    or user_id = auth.uid()
  );

drop policy if exists course_enrolments_insert_own_professional
  on public.course_enrolments;
create policy course_enrolments_insert_own_professional
  on public.course_enrolments
  for insert
  to authenticated
  with check (
    public.app_user_is_professional()
    and user_id = auth.uid()
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
      public.app_user_is_professional()
      and user_id = auth.uid()
    )
  )
  with check (
    public.app_user_is_admin()
    or (
      public.app_user_is_professional()
      and user_id = auth.uid()
    )
  );

drop policy if exists course_enrolments_delete_own_or_admin
  on public.course_enrolments;
create policy course_enrolments_delete_own_or_admin
  on public.course_enrolments
  for delete
  to authenticated
  using (
    public.app_user_is_admin()
    or (
      public.app_user_is_professional()
      and user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------
-- RLS: listing_enquiries
-- ---------------------------------------------------------------------

alter table public.listing_enquiries enable row level security;

drop policy if exists listing_enquiries_select_parties_or_admin
  on public.listing_enquiries;
create policy listing_enquiries_select_parties_or_admin
  on public.listing_enquiries
  for select
  to authenticated
  using (
    public.app_user_is_admin()
    or from_user_id = auth.uid()
    or public.app_user_owns_listing(listing_id)
  );

drop policy if exists listing_enquiries_insert_authenticated_own
  on public.listing_enquiries;
create policy listing_enquiries_insert_authenticated_own
  on public.listing_enquiries
  for insert
  to authenticated
  with check (from_user_id = auth.uid());

drop policy if exists listing_enquiries_no_client_update
  on public.listing_enquiries;
create policy listing_enquiries_no_client_update
  on public.listing_enquiries
  for update
  to authenticated
  using (public.app_user_is_admin())
  with check (public.app_user_is_admin());

drop policy if exists listing_enquiries_no_client_delete
  on public.listing_enquiries;
create policy listing_enquiries_no_client_delete
  on public.listing_enquiries
  for delete
  to authenticated
  using (public.app_user_is_admin());

-- ---------------------------------------------------------------------
-- RLS: listings writes now require owner or admin (replaces facility-wide)
-- ---------------------------------------------------------------------

drop policy if exists listings_insert_owner_or_admin on public.listings;
create policy listings_insert_owner_or_admin
  on public.listings
  for insert
  to authenticated
  with check (
    public.app_user_is_admin()
    or (
      public.app_user_is_facility()
      and owner_id = auth.uid()
    )
  );

drop policy if exists listings_update_owner_or_admin on public.listings;
create policy listings_update_owner_or_admin
  on public.listings
  for update
  to authenticated
  using (
    public.app_user_is_admin()
    or (
      public.app_user_is_facility()
      and owner_id = auth.uid()
    )
  )
  with check (
    public.app_user_is_admin()
    or (
      public.app_user_is_facility()
      and owner_id = auth.uid()
    )
  );

drop policy if exists listings_delete_owner_or_admin on public.listings;
create policy listings_delete_owner_or_admin
  on public.listings
  for delete
  to authenticated
  using (
    public.app_user_is_admin()
    or (
      public.app_user_is_facility()
      and owner_id = auth.uid()
    )
  );

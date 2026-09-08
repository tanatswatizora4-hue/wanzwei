-- =====================================================================
-- 0015_marketplace_classified_listings.sql
-- Additive classified listing fields, facility seller identity, images.
-- Reuses public.listings. Does not drop owner_id or existing Open listings.
--
-- Reverse (manual, not applied):
--   drop table if exists public.listing_images;
--   alter table public.listings drop column if exists category;
--   alter table public.listings drop column if exists condition;
--   alter table public.listings drop column if exists seller_type;
--   alter table public.listings drop column if exists facility_id;
-- =====================================================================

do $$
begin
  if not exists (
    select 1
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'listing_status'
      and e.enumlabel = 'Paused'
  ) then
    alter type public.listing_status add value 'Paused';
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'listing_status'
      and e.enumlabel = 'Draft'
  ) then
    alter type public.listing_status add value 'Draft';
  end if;
end
$$;

alter table public.listings
  add column if not exists category text;

alter table public.listings
  add column if not exists condition text;

alter table public.listings
  add column if not exists seller_type text;

alter table public.listings
  add column if not exists facility_id uuid references public.facilities(id) on delete set null;

alter table public.listings
  drop constraint if exists listings_category_chk;
alter table public.listings
  add constraint listings_category_chk check (
    category is null
    or category in (
      'medical_equipment',
      'clinical_supplies',
      'scrubs_uniforms',
      'books_study',
      'diagnostic_equipment',
      'mobility_rehabilitation',
      'office_facility_equipment',
      'other'
    )
  );

alter table public.listings
  drop constraint if exists listings_condition_chk;
alter table public.listings
  add constraint listings_condition_chk check (
    condition is null
    or condition in ('new', 'like_new', 'good', 'used', 'not_applicable')
  );

alter table public.listings
  drop constraint if exists listings_seller_type_chk;
alter table public.listings
  add constraint listings_seller_type_chk check (
    seller_type is null
    or seller_type in ('professional', 'facility')
  );

alter table public.listings
  drop constraint if exists listings_seller_shape_chk;
alter table public.listings
  add constraint listings_seller_shape_chk check (
    seller_type is null
    or (
      seller_type = 'professional'
      and facility_id is null
    )
    or (
      seller_type = 'facility'
      and facility_id is not null
    )
  );

create index if not exists listings_category_idx on public.listings (category);
create index if not exists listings_facility_id_idx on public.listings (facility_id);
create index if not exists listings_seller_type_idx on public.listings (seller_type);

-- Legacy facility-owned listings: attach the owner's persisted facility when
-- that relationship is already stored on public.users.
update public.listings l
set
  seller_type = 'facility',
  facility_id = u.facility_id
from public.users u
where l.owner_id = u.id
  and l.seller_type is null
  and u.role = 'facility'
  and u.facility_id is not null;

update public.listings l
set seller_type = 'professional'
from public.users u
where l.owner_id = u.id
  and l.seller_type is null
  and u.role = 'professional';

create table if not exists public.listing_images (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  owner_id uuid not null references public.users(id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  content_type text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint listing_images_storage_path_uniq unique (storage_path)
);

create index if not exists listing_images_listing_id_idx
  on public.listing_images (listing_id);

-- Private listing-image bucket. Do not reuse professional documents.
insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'listing-images',
  'listing-images',
  false,
  5242880,
  array['image/jpeg', 'image/png']
)
on conflict (id) do update
set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- listing-images stays private. Uploads and signed URL reads go through the
-- server (service role). Do not grant client storage.object writes.

alter table public.listing_images enable row level security;

revoke all on public.listing_images from anon;
revoke insert, update, delete on public.listing_images from authenticated;
grant select on public.listing_images to authenticated;
grant all on public.listing_images to service_role;

drop policy if exists listing_images_select_public_or_owner
  on public.listing_images;
create policy listing_images_select_public_or_owner
  on public.listing_images
  for select
  to authenticated
  using (
    public.app_user_is_admin()
    or owner_id = auth.uid()
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

drop policy if exists listing_images_no_client_insert
  on public.listing_images;
create policy listing_images_no_client_insert
  on public.listing_images
  for insert
  to authenticated
  with check (false);

drop policy if exists listing_images_no_client_update
  on public.listing_images;
create policy listing_images_no_client_update
  on public.listing_images
  for update
  to authenticated
  using (false)
  with check (false);

drop policy if exists listing_images_no_client_delete
  on public.listing_images;
create policy listing_images_no_client_delete
  on public.listing_images
  for delete
  to authenticated
  using (false);

-- Public catalogue is Open only. Owners/admins/facility members see their own.
drop policy if exists listings_select_authenticated on public.listings;
create policy listings_select_authenticated
  on public.listings
  for select
  to authenticated
  using (
    status = 'Open'
    or public.app_user_is_admin()
    or owner_id = auth.uid()
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
      owner_id = auth.uid()
      and seller_type = 'professional'
      and facility_id is null
      and public.app_user_has_professional_membership()
      and exists (
        select 1 from public.users u
        where u.id = auth.uid() and u.verified = true
      )
    )
    or (
      owner_id = auth.uid()
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
    or owner_id = auth.uid()
    or (
      seller_type = 'facility'
      and facility_id is not null
      and public.app_user_has_facility_membership(facility_id)
    )
  )
  with check (
    public.app_user_is_admin()
    or owner_id = auth.uid()
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
    or owner_id = auth.uid()
    or (
      seller_type = 'facility'
      and facility_id is not null
      and public.app_user_has_facility_membership(facility_id)
    )
  );

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
      and (
        public.app_user_is_admin()
        or (l.owner_id is not null and l.owner_id = auth.uid())
        or (
          l.seller_type = 'facility'
          and l.facility_id is not null
          and public.app_user_has_facility_membership(l.facility_id)
        )
      )
  )
$$;

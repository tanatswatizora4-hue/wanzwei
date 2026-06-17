-- =====================================================================
-- 0004_phase5_storage_hardening.sql - Private storage hardening.
--
-- Supabase Storage buckets live in the managed `storage` schema. This
-- migration configures the existing/upload bucket as private and keeps
-- server routes responsible for issuing short-lived signed URLs.
-- =====================================================================

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'documents',
  'documents',
  false,
  15728640,
  array['application/pdf', 'image/jpeg', 'image/png']
)
on conflict (id) do update
set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.professional_documents (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  storage_path text not null,
  public_url text not null default '',
  file_name text not null,
  content_type text not null,
  created_at timestamptz not null default now()
);

create index if not exists professional_documents_user_id_idx
  on public.professional_documents (user_id);

create unique index if not exists professional_documents_storage_path_uniq
  on public.professional_documents (storage_path);

create table if not exists public.facility_verification_documents (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  facility_id text not null,
  storage_path text not null,
  public_url text not null default '',
  file_name text not null,
  content_type text not null,
  created_at timestamptz not null default now()
);

create index if not exists facility_verification_documents_facility_idx
  on public.facility_verification_documents (facility_id);

create index if not exists facility_verification_documents_user_idx
  on public.facility_verification_documents (user_id);

create unique index if not exists facility_verification_documents_storage_path_uniq
  on public.facility_verification_documents (storage_path);

alter table public.professional_documents
  alter column public_url set default '';

alter table public.facility_verification_documents
  alter column public_url set default '';

-- Legacy rows may contain public Storage URLs from getPublicUrl(). The app
-- now derives signed URLs from storage_path at read time, so remove raw URLs.
update public.professional_documents
set public_url = ''
where public_url ~* '^https?://';

update public.facility_verification_documents
set public_url = ''
where public_url ~* '^https?://';

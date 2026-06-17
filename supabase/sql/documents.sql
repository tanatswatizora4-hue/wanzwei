-- Run in Supabase SQL editor (or via migration tool).
-- 1) Create Storage bucket "documents" in Dashboard → Storage → New bucket.
--    Keep "Public bucket" disabled. Server routes return signed URLs.
-- 2) Run the statements below.

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

-- Optional RLS — server uses service role which bypasses RLS.

-- =====================================================================
-- 0012_hybrid_verification_evidence.sql
--
-- Hybrid professional verification evidence. Additive and independent of
-- 0011 premises_number. Does not change users.verified defaults or
-- existing verified rows.
--
-- Document analysis results are stored as structured evidence. Raw
-- identity/credential files remain in private professional_documents.
-- Clients have no policies on verification_evidence (default deny).
-- =====================================================================

alter table public.professional_documents
  add column if not exists purpose text not null default 'supporting';

alter table public.professional_documents
  drop constraint if exists professional_documents_purpose_allowed;

alter table public.professional_documents
  add constraint professional_documents_purpose_allowed
  check (purpose in ('identity', 'credential', 'supporting'));

comment on column public.professional_documents.purpose is
  'identity and credential files are verification evidence. supporting is general private upload. Never exposed to facilities or the public.';

create table if not exists public.verification_evidence (
  id uuid primary key default gen_random_uuid(),
  verification_id uuid not null
    references public.verifications(id) on delete cascade,
  user_id uuid not null
    references public.users(id) on delete cascade,
  identity_document_id uuid,
  credential_document_id uuid,
  identity_name text,
  identity_document_type text,
  credential_name text,
  credential_type text,
  detected_profession text,
  registration_number text,
  issuing_body text,
  issue_date text,
  expiry_date text,
  name_match text,
  profession_match text,
  expiry_check text,
  registry_available boolean not null default false,
  registry_outcome text,
  registry_name_match boolean,
  registry_profession_match boolean,
  document_quality text,
  identity_quality text,
  credential_quality text,
  credential_class text,
  fraud_flags text,
  analysis_status text not null,
  decision text not null,
  decision_reason text not null,
  verification_method text not null,
  review_required boolean not null default true,
  created_at timestamptz not null default now(),
  constraint verification_evidence_decision_allowed
    check (
      decision in (
        'pending_documents',
        'processing',
        'verified',
        'additional_evidence_required',
        'manual_review',
        'rejected'
      )
    ),
  constraint verification_evidence_method_allowed
    check (verification_method in ('hybrid', 'registry_assisted', 'manual', 'admin'))
);

create index if not exists verification_evidence_verification_id_idx
  on public.verification_evidence (verification_id);

create index if not exists verification_evidence_user_id_idx
  on public.verification_evidence (user_id);

create index if not exists verification_evidence_created_at_idx
  on public.verification_evidence (created_at desc);

alter table public.verification_evidence enable row level security;
-- Intentionally no policies: clients cannot read or write evidence rows.
-- Server-side application code (service role / server connection) writes them.

comment on table public.verification_evidence is
  'Auditable hybrid verification evidence. Does not store raw document bytes or national-id/passport numbers.';

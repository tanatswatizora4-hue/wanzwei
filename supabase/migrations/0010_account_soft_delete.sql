-- =====================================================================
-- 0010_account_soft_delete.sql
--
-- Adds users.deleted_at for Play-required account closure.
-- Application, verification, and hiring rows stay; the profile is
-- anonymized by the application layer. No retention period is invented.
-- Numbered 0010 so production 0009 can ship CPD/marketplace first.
-- =====================================================================

alter table public.users
  add column if not exists deleted_at timestamptz;

create index if not exists users_deleted_at_idx
  on public.users (deleted_at);

comment on column public.users.deleted_at is
  'Set when the account holder closes the account. Profile PII is anonymized in the same update. Audit/verification rows are retained.';

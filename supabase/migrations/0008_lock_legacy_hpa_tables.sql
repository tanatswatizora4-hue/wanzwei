-- =====================================================================
-- 0008_lock_legacy_hpa_tables.sql — close leftover HPA PostgREST reads.
--
-- public.hpa_practitioners and public.hpa_premises are unused by current
-- application code. They had SELECT policies for role PUBLIC, so the
-- anon key could read registry PII. Canonical matching uses
-- public.practitioner_registry (RLS on, no client policies).
--
-- This migration only drops those permissive policies. It does not drop
-- tables, change rows, or grant replacement client access. RLS stays on;
-- with no policies, anon/authenticated default-deny.
-- =====================================================================

drop policy if exists hpa_practitioners_read_all on public.hpa_practitioners;
drop policy if exists hpa_premises_read_all on public.hpa_premises;

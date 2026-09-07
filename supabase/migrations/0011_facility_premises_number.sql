-- =====================================================================
-- 0011_facility_premises_number.sql
--
-- Additive nullable premises registration number on facilities.
-- Existing rows stay unverified. Submitting a premises number does not
-- grant facilities.verified — that remains admin/DB-authoritative.
-- =====================================================================

alter table public.facilities
  add column if not exists premises_number text;

create index if not exists facilities_premises_number_idx
  on public.facilities (premises_number);

comment on column public.facilities.premises_number is
  'Premises registration number supplied by the facility. Stored for display and admin review. Does not auto-verify the facility.';

-- =====================================================================
-- 0013_council_aware_verification.sql
--
-- Council-aware professional verification. Additive and non-destructive.
-- Does not change users.verified defaults or existing verified rows.
--
-- LEGACY TRANSITION
-- -----------------
-- Existing verified professionals keep users.verified = true even when the
-- new practising-certificate and identity/credential status columns are NULL.
-- NULL expiry/status means Wanzwei has not yet assessed certificate currency
-- for that account (unable_to_confirm). It must not be treated as expired
-- and must not mass-deverify production users.
--
-- A later release may require current practising-certificate evidence from
-- every professional after legacy accounts have supplied the new documents.
-- Until then, verified-only gates continue to use users.verified.
--
-- registering_body stores the selectable council code (MDPCZ, NCZ, ...).
-- Existing "HPA" values are left unchanged and are not rewritten to a
-- council. Other free-text names live in regulatory_body_other.
-- =====================================================================

alter table public.users
  add column if not exists regulatory_body_other text,
  add column if not exists identity_verification_status text,
  add column if not exists credential_status text,
  add column if not exists credential_verified_at timestamptz,
  add column if not exists credential_verification_method text,
  add column if not exists practising_certificate_expiry date,
  add column if not exists practising_certificate_status text,
  add column if not exists last_verification_review_at timestamptz;

alter table public.verifications
  add column if not exists regulatory_body_other text;

alter table public.verification_evidence
  add column if not exists regulatory_body text,
  add column if not exists regulatory_body_other text;

alter table public.users
  drop constraint if exists users_identity_verification_status_allowed;
alter table public.users
  add constraint users_identity_verification_status_allowed
  check (
    identity_verification_status is null
    or identity_verification_status in (
      'pending',
      'processed',
      'unreadable',
      'unavailable',
      'reviewed'
    )
  );

alter table public.users
  drop constraint if exists users_credential_status_allowed;
alter table public.users
  add constraint users_credential_status_allowed
  check (
    credential_status is null
    or credential_status in (
      'pending_review',
      'reviewed',
      'insufficient'
    )
  );

alter table public.users
  drop constraint if exists users_credential_verification_method_allowed;
alter table public.users
  add constraint users_credential_verification_method_allowed
  check (
    credential_verification_method is null
    or credential_verification_method in (
      'hybrid',
      'registry_assisted',
      'manual'
    )
  );

alter table public.users
  drop constraint if exists users_practising_certificate_status_allowed;
alter table public.users
  add constraint users_practising_certificate_status_allowed
  check (
    practising_certificate_status is null
    or practising_certificate_status in (
      'current',
      'expired',
      'pending_review',
      'unable_to_confirm'
    )
  );

comment on column public.users.registering_body is
  'Selectable Zimbabwean regulatory body code (MDPCZ, NCZ, PCZ, AHPCZ, MLCSCZ, EHPCZ, MRPCZ, NTCZ, TMPC, OTHER). Legacy HPA values may remain. Not client-writable.';
comment on column public.users.regulatory_body_other is
  'Required when registering_body is OTHER. Never treated as registry corroboration.';
comment on column public.users.practising_certificate_expiry is
  'Expiry date from the supplied/reviewed practising certificate. Currency is derived from this date. Null on legacy verified accounts is unable_to_confirm, not expired.';
comment on column public.users.practising_certificate_status is
  'Derived certificate currency: current, expired, pending_review, unable_to_confirm. Null on legacy accounts is not a de-verify signal.';

-- Professionals may submit claimed profession/registration only through
-- controlled server paths. Client JWT updates cannot set verification results.
create or replace function public.prevent_user_self_privilege_update()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.app_user_is_admin()
     and auth.uid() = old.id
     and (
       new.role is distinct from old.role
       or new.facility_id is distinct from old.facility_id
       or new.verified is distinct from old.verified
       or new.profession is distinct from old.profession
       or new.registering_body is distinct from old.registering_body
       or new.registration_number is distinct from old.registration_number
       or new.regulatory_body_other is distinct from old.regulatory_body_other
       or new.identity_verification_status is distinct from old.identity_verification_status
       or new.credential_status is distinct from old.credential_status
       or new.credential_verified_at is distinct from old.credential_verified_at
       or new.credential_verification_method is distinct from old.credential_verification_method
       or new.practising_certificate_expiry is distinct from old.practising_certificate_expiry
       or new.practising_certificate_status is distinct from old.practising_certificate_status
       or new.last_verification_review_at is distinct from old.last_verification_review_at
     ) then
    raise exception 'Only administrators may update protected user fields'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

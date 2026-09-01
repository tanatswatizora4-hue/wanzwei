-- Guard facilities.verified the same way users.verified is guarded:
-- authenticated non-admins (including facility owners) cannot flip it
-- through PostgREST. Server/seed connections with no JWT are unchanged.
--
-- Depends on 0003_phase4_rls.sql (app_user_is_admin) and
-- 0005_rls_gap_hardening.sql (facilities RLS). Do not edit those files.

create or replace function public.prevent_facility_self_verify()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if public.app_user_is_admin() then
    return new;
  end if;

  -- Client JWT present: never allow inserting verified=true or changing verified.
  if auth.uid() is not null then
    if tg_op = 'INSERT' and new.verified is true then
      raise exception 'Only administrators may set facility verification'
        using errcode = '42501';
    end if;
    if tg_op = 'UPDATE' and new.verified is distinct from old.verified then
      raise exception 'Only administrators may update facility verification'
        using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_facilities_prevent_self_verify on public.facilities;
create trigger trg_facilities_prevent_self_verify
  before insert or update on public.facilities
  for each row execute function public.prevent_facility_self_verify();

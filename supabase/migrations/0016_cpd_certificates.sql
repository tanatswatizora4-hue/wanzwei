-- =====================================================================
-- 0016_cpd_certificates.sql
-- Additive Wanzwei Certificates of Completion plus optional accreditation
-- metadata on courses. Does not fabricate council CPD points.
-- QR codes, when added, encode the public verify URL at render time from
-- certificate_id. No QR column is required.
--
-- Reverse (manual, not applied):
--   drop table if exists public.cpd_certificates;
--   alter table public.courses drop column if exists cpd_points;
--   alter table public.courses drop column if exists accrediting_body;
--   alter table public.courses drop column if exists accreditation_reference;
-- =====================================================================

alter table public.courses
  add column if not exists cpd_points numeric(6, 2);

alter table public.courses
  add column if not exists accrediting_body text;

alter table public.courses
  add column if not exists accreditation_reference text;

alter table public.courses
  drop constraint if exists courses_cpd_points_chk;
alter table public.courses
  add constraint courses_cpd_points_chk check (
    cpd_points is null or (cpd_points >= 0 and cpd_points <= 1000)
  );

create table if not exists public.cpd_certificates (
  id uuid primary key default gen_random_uuid(),
  certificate_id text not null,
  enrolment_id uuid not null references public.course_enrolments(id) on delete restrict,
  user_id uuid not null references public.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete restrict,
  recipient_display_name text not null,
  course_title text not null,
  provider_name text not null,
  completion_date date not null,
  cpd_points numeric(6, 2),
  accrediting_body text,
  accreditation_reference text,
  issued_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint cpd_certificates_certificate_id_uniq unique (certificate_id),
  constraint cpd_certificates_enrolment_id_uniq unique (enrolment_id)
);

create index if not exists cpd_certificates_user_id_idx
  on public.cpd_certificates (user_id);
create index if not exists cpd_certificates_course_id_idx
  on public.cpd_certificates (course_id);

alter table public.cpd_certificates enable row level security;

revoke all on public.cpd_certificates from anon;
revoke insert, update, delete on public.cpd_certificates from authenticated;
grant select on public.cpd_certificates to authenticated;
grant all on public.cpd_certificates to service_role;

-- Learners may read their own certificate snapshots. Public verify uses
-- the server (service role / DB URL) and never exposes private fields.
drop policy if exists cpd_certificates_select_own_or_admin
  on public.cpd_certificates;
create policy cpd_certificates_select_own_or_admin
  on public.cpd_certificates
  for select
  to authenticated
  using (
    public.app_user_is_admin()
    or user_id = auth.uid()
  );

drop policy if exists cpd_certificates_no_client_insert
  on public.cpd_certificates;
create policy cpd_certificates_no_client_insert
  on public.cpd_certificates
  for insert
  to authenticated
  with check (false);

drop policy if exists cpd_certificates_no_client_update
  on public.cpd_certificates;
create policy cpd_certificates_no_client_update
  on public.cpd_certificates
  for update
  to authenticated
  using (false)
  with check (false);

drop policy if exists cpd_certificates_no_client_delete
  on public.cpd_certificates;
create policy cpd_certificates_no_client_delete
  on public.cpd_certificates
  for delete
  to authenticated
  using (false);

-- Enrolment writes: allow active professional membership, not only signup role.
drop policy if exists course_enrolments_insert_own_professional
  on public.course_enrolments;
create policy course_enrolments_insert_own_professional
  on public.course_enrolments
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and (
      public.app_user_is_professional()
      or public.app_user_has_professional_membership()
    )
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
      user_id = auth.uid()
      and (
        public.app_user_is_professional()
        or public.app_user_has_professional_membership()
      )
    )
  )
  with check (
    public.app_user_is_admin()
    or (
      user_id = auth.uid()
      and (
        public.app_user_is_professional()
        or public.app_user_has_professional_membership()
      )
    )
  );

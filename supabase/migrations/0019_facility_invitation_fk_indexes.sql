create index if not exists facility_invitations_invited_by_idx
  on public.facility_invitations (invited_by);

create index if not exists facility_invitations_accepted_by_idx
  on public.facility_invitations (accepted_by);

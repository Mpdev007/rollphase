-- Deleting an account must always work (app stores require it, and so does the privacy policy).
-- Before this, auth.users could not be deleted for anyone who had added a gym or a slot, confirmed a slot,
-- added gym staff or verified a family: those columns pointed at auth.users with no delete rule.
-- Shared rows stay (the timetable belongs to the community); only the author link is cleared.
-- Proven on rollphase-staging; applied live on 2026-09-27 ~21:14 CDT by the owner (SQL editor).

alter table public.gyms drop constraint if exists gyms_created_by_fkey;
alter table public.gyms add constraint gyms_created_by_fkey
  foreign key (created_by) references auth.users (id) on delete set null;

alter table public.slots drop constraint if exists slots_created_by_fkey;
alter table public.slots add constraint slots_created_by_fkey
  foreign key (created_by) references auth.users (id) on delete set null;

alter table public.slots drop constraint if exists slots_confirmed_by_fkey;
alter table public.slots add constraint slots_confirmed_by_fkey
  foreign key (confirmed_by) references auth.users (id) on delete set null;

-- A member row needs its author when it is added (the "add slot" policy checks created_by = auth.uid());
-- after the member deletes their account the row keeps no author.
alter table public.slots drop constraint if exists slots_member_has_author;

alter table public.gym_staff drop constraint if exists gym_staff_added_by_fkey;
alter table public.gym_staff add constraint gym_staff_added_by_fkey
  foreign key (added_by) references auth.users (id) on delete set null;

-- A verification outlives the staff member who made it; the method column still says how it was made.
alter table public.family_verifications alter column verified_by drop not null;
alter table public.family_verifications drop constraint if exists family_verifications_verified_by_fkey;
alter table public.family_verifications add constraint family_verifications_verified_by_fkey
  foreign key (verified_by) references auth.users (id) on delete set null;

-- FAMILY ACCESS: kids and teen class times are public like any gym timetable; who is coming to them is not.
-- Enforced by row-level security. First version applied live 2026-09-27 (it hid kids/teen class times from
-- non-families). This corrected version (public class times, two kids per class, travel-mode audience) is NOT
-- live yet: it waits on the owner's go. Live state until then = the first version.
--
-- Rules (owner, 2026-09-27):
--   * Anyone can see a gym's kids/teen class times (a parent may be looking for a place to bring a kid).
--   * Kids never have accounts. A parent adds a child to their own account: first initial + age band only.
--   * Verified family = a permanent (non-anonymous) account + at least one child + verification by that gym's
--     staff (or, until the gym has staff here, a platform admin). Verification is per gym.
--   * Only a verified family signs up a child for a kids/teen class, only their own child. How many are coming is
--     shown to verified families, staff and admins only; nobody but the parent sees which child is coming.
--   * No pairing with kids: the belt handshake refuses check-ins tied to kids/teen classes. Kid-to-kid training
--     matches are a separate, parent-to-parent, consent-gated feature (see docs/mat-board/LEVELS-AND-MATCH.md).

-- ---------- the class audience ----------
alter table public.slots
  add column if not exists audience text not null default 'adult' check (audience in ('adult', 'kids', 'teens'));

-- ---------- roles ----------
create table if not exists public.app_admins (
  user_id  uuid primary key references auth.users (id) on delete cascade,
  added_at timestamptz not null default now()
);
create table if not exists public.gym_staff (
  gym_id   text not null references public.gyms (id) on delete cascade,
  user_id  uuid not null references auth.users (id) on delete cascade,
  role     text not null check (role in ('owner', 'coach', 'desk')),
  added_by uuid references auth.users (id),
  added_at timestamptz not null default now(),
  primary key (gym_id, user_id)
);

-- ---------- families ----------
create table if not exists public.children (
  id          bigint generated always as identity primary key,
  guardian_id uuid not null references auth.users (id) on delete cascade,
  initial     text not null check (initial ~ '^[A-Za-z]{1,2}$'),
  age_band    text not null check (age_band in ('4-7', '7-12', '13-17')),
  created_at  timestamptz not null default now()
);
create index if not exists children_guardian_idx on public.children (guardian_id);

create table if not exists public.family_requests (
  guardian_id  uuid not null references auth.users (id) on delete cascade,
  gym_id       text not null references public.gyms (id) on delete cascade,
  requested_at timestamptz not null default now(),
  primary key (guardian_id, gym_id)
);
create table if not exists public.family_verifications (
  guardian_id uuid not null references auth.users (id) on delete cascade,
  gym_id      text not null references public.gyms (id) on delete cascade,
  verified_by uuid not null references auth.users (id),
  method      text not null check (method in ('gym-staff', 'platform-admin')),
  verified_at timestamptz not null default now(),
  primary key (guardian_id, gym_id)
);

-- ---------- checks (definer functions so policies can call them without recursion) ----------
create or replace function public.is_permanent_user() returns boolean
language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
$$;
create or replace function public.is_app_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_permanent_user() and exists (select 1 from public.app_admins where user_id = auth.uid())
$$;
create or replace function public.is_gym_staff(p_gym text) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_permanent_user() and exists (select 1 from public.gym_staff where gym_id = p_gym and user_id = auth.uid())
$$;
create or replace function public.is_verified_family(p_gym text) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_permanent_user()
     and exists (select 1 from public.children where guardian_id = auth.uid())
     and exists (select 1 from public.family_verifications where guardian_id = auth.uid() and gym_id = p_gym)
$$;
create or replace function public.can_see_kids(p_gym text) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_verified_family(p_gym) or public.is_gym_staff(p_gym) or public.is_app_admin()
$$;

-- ---------- slots: every class time is public; only staff add or edit kids/teen classes ----------
drop policy if exists "read slots" on public.slots;
create policy "read slots" on public.slots for select using (true);

drop policy if exists "add slot" on public.slots;
create policy "add slot" on public.slots for insert
  with check (created_by = auth.uid() and source = 'member'
              and (audience = 'adult' or public.is_gym_staff(gym_id)));

drop policy if exists "edit slot" on public.slots;
create policy "edit slot" on public.slots for update
  using (auth.uid() is not null and (audience = 'adult' or public.is_gym_staff(gym_id)))
  with check (audience = 'adult' or public.is_gym_staff(gym_id));

-- ---------- intents: a kids/teen sign-up is a parent signing up their own child ----------
alter table public.intents add column if not exists child_id bigint references public.children (id) on delete cascade;
-- One row per person per child per occurrence, so a parent can sign up two kids for the same class.
-- The table is in the realtime publication, so it keeps a primary key (the replica identity for deletes):
-- a surrogate id, with the old key widened into a unique index.
alter table public.intents drop constraint if exists intents_pkey;
alter table public.intents add column if not exists id bigint generated always as identity;
alter table public.intents add primary key (id);
grant usage, select on sequence public.intents_id_seq to authenticated;
create unique index if not exists intents_one_per_child on public.intents (slot_id, user_id, on_date, child_id) nulls not distinct;

drop policy if exists "own intent" on public.intents;
drop policy if exists "read intents" on public.intents;
create policy "read intents" on public.intents for select using (
  user_id = auth.uid()
  or exists (select 1 from public.slots s where s.id = intents.slot_id and s.audience = 'adult')
);
create policy "write own intent" on public.intents for insert with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.slots s where s.id = intents.slot_id and (
      (s.audience = 'adult' and intents.child_id is null)
      or (s.audience <> 'adult'
          and public.is_verified_family(s.gym_id)
          and intents.child_id in (select c.id from public.children c where c.guardian_id = auth.uid()))
    ))
);
create policy "delete own intent" on public.intents for delete using (user_id = auth.uid());

-- counts: adult classes for everyone; kids/teen classes only for those who may see them
create or replace function public.slot_in_count(p_slot bigint, p_from date)
returns bigint language sql stable security definer set search_path = public as $$
  select case
           when s.audience = 'adult' or public.can_see_kids(s.gym_id)
           then (select count(*) from public.intents i where i.slot_id = s.id and i.on_date >= p_from)
         end
  from public.slots s where s.id = p_slot
$$;
revoke execute on function public.slot_in_count(bigint, date) from public;
grant execute on function public.slot_in_count(bigint, date) to anon, authenticated;

drop view if exists public.board_slots;
create view public.board_slots with (security_invoker = true) as
  select s.*, g.name as gym_name, public.slot_in_count(s.id, current_date) as in_count
  from public.slots s join public.gyms g on g.id = s.gym_id
  where s.removed_at is null;
grant select on public.board_slots to anon, authenticated;

-- Nyx / travel mode: adult classes by default; a parent travelling with a kid asks for 'kids', 'teens' or 'all'.
drop function if exists public.open_mats_near(double precision, double precision, double precision);
create or replace function public.open_mats_near(p_lat double precision, p_lng double precision, p_km double precision default 25,
                                                 p_audience text default 'adult')
returns table (gym_id text, gym_name text, slot_id bigint, start_min smallint, kind text, sport text, audience text,
               in_count bigint, km double precision)
language sql stable set search_path = public, extensions as $$
  select g.id, g.name, s.id, s.start_min, s.kind, s.sport, s.audience,
         public.slot_in_count(s.id, current_date),
         st_distance(g.loc, st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography) / 1000
  from public.slots s join public.gyms g on g.id = s.gym_id
  where s.removed_at is null and (p_audience = 'all' or s.audience = p_audience)
    and s.weekday = extract(dow from now())::smallint
    and st_dwithin(g.loc, st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography, p_km * 1000)
  order by 9, s.start_min
$$;
grant execute on function public.open_mats_near(double precision, double precision, double precision, text) to anon, authenticated;

-- ---------- no pairing with kids: the handshake refuses kids/teen check-ins ----------
create or replace function public.attest_belt(p_subject uuid, p_belt text)
returns void
language plpgsql security definer set search_path = public, extensions as $$
declare my_checkin public.checkins; n int;
begin
  if auth.uid() is null then raise exception 'sign in first'; end if;
  select c.* into my_checkin from public.checkins c
    where c.user_id = auth.uid() and c.at > now() - interval '24 hours'
      and not exists (select 1 from public.slots k where k.id = c.slot_id and k.audience <> 'adult')
      and exists (select 1 from public.checkins s where s.user_id = p_subject and s.gym_id = c.gym_id
                  and s.at between c.at - interval '3 hours' and c.at + interval '3 hours'
                  and not exists (select 1 from public.slots k2 where k2.id = s.slot_id and k2.audience <> 'adult'))
    order by c.at desc limit 1;
  if not found then raise exception 'you have to have trained at the same adult class, same place and time'; end if;
  insert into public.attestations (attester, subject, belt, checkin_id) values (auth.uid(), p_subject, p_belt, my_checkin.id)
    on conflict (attester, subject) do update set belt = excluded.belt, checkin_id = excluded.checkin_id, created_at = now();
  select count(*) into n from public.attestations a where a.subject = p_subject and a.belt = p_belt;
  update public.profiles set belt_verified = (n >= 3), belt = case when n >= 3 then p_belt else belt end where id = p_subject;
end $$;

-- ---------- family and staff actions (only through these functions) ----------
create or replace function public.request_family_verification(p_gym text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_permanent_user() then raise exception 'family access needs a full account (add your email first)'; end if;
  if not exists (select 1 from public.children where guardian_id = auth.uid()) then raise exception 'add your child first'; end if;
  insert into public.family_requests (guardian_id, gym_id) values (auth.uid(), p_gym) on conflict do nothing;
end $$;

create or replace function public.verify_family(p_guardian uuid, p_gym text)
returns void language plpgsql security definer set search_path = public as $$
declare m text;
begin
  if public.is_gym_staff(p_gym) then m := 'gym-staff';
  elsif public.is_app_admin() then m := 'platform-admin';
  else raise exception 'only this gym''s staff can verify families'; end if;
  if p_guardian = auth.uid() and m = 'gym-staff' then raise exception 'staff cannot verify their own family'; end if;
  if not exists (select 1 from public.family_requests where guardian_id = p_guardian and gym_id = p_gym) then
    raise exception 'no request from this family at this gym';
  end if;
  insert into public.family_verifications (guardian_id, gym_id, verified_by, method)
    values (p_guardian, p_gym, auth.uid(), m)
    on conflict (guardian_id, gym_id) do update set verified_by = excluded.verified_by, method = excluded.method, verified_at = now();
  delete from public.family_requests where guardian_id = p_guardian and gym_id = p_gym;
end $$;

create or replace function public.revoke_family(p_guardian uuid, p_gym text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not (public.is_gym_staff(p_gym) or public.is_app_admin()) then raise exception 'only this gym''s staff can do that'; end if;
  delete from public.family_verifications where guardian_id = p_guardian and gym_id = p_gym;
  delete from public.intents i using public.slots s
    where i.slot_id = s.id and s.gym_id = p_gym and s.audience <> 'adult' and i.user_id = p_guardian;
end $$;

create or replace function public.add_gym_staff(p_gym text, p_user uuid, p_role text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_app_admin() then raise exception 'only a platform admin can add gym staff'; end if;
  insert into public.gym_staff (gym_id, user_id, role, added_by) values (p_gym, p_user, p_role, auth.uid())
    on conflict (gym_id, user_id) do update set role = excluded.role;
end $$;

-- ---------- RLS on the new tables ----------
alter table public.app_admins            enable row level security;   -- no policies: not reachable through the API
alter table public.gym_staff             enable row level security;
alter table public.children              enable row level security;
alter table public.family_requests       enable row level security;
alter table public.family_verifications  enable row level security;

create policy "staff see their gym's staff" on public.gym_staff for select
  using (user_id = auth.uid() or public.is_gym_staff(gym_id) or public.is_app_admin());

create policy "parent manages own children" on public.children for all
  using (guardian_id = auth.uid()) with check (guardian_id = auth.uid() and public.is_permanent_user());
create policy "staff see requesting families' children" on public.children for select using (
  exists (select 1 from public.family_requests r where r.guardian_id = children.guardian_id
          and (public.is_gym_staff(r.gym_id) or public.is_app_admin()))
  or exists (select 1 from public.family_verifications v where v.guardian_id = children.guardian_id
             and (public.is_gym_staff(v.gym_id) or public.is_app_admin()))
);

create policy "see own or your gym's requests" on public.family_requests for select
  using (guardian_id = auth.uid() or public.is_gym_staff(gym_id) or public.is_app_admin());
create policy "cancel own request" on public.family_requests for delete using (guardian_id = auth.uid());

create policy "see own or your gym's verifications" on public.family_verifications for select
  using (guardian_id = auth.uid() or public.is_gym_staff(gym_id) or public.is_app_admin());

-- ---------- grants ----------
grant select on public.gym_staff, public.family_requests, public.family_verifications to authenticated;
grant select, insert, update, delete on public.children to authenticated;
grant delete on public.family_requests to authenticated;
revoke insert, update on public.intents from authenticated;
grant insert, delete on public.intents to authenticated;
grant usage, select on all sequences in schema public to authenticated;
revoke execute on function public.is_permanent_user(), public.is_app_admin(), public.is_gym_staff(text),
                           public.is_verified_family(text), public.can_see_kids(text) from public;
-- anon needs can_see_kids (the slots read policy calls it; it returns false for anyone signed out)
grant execute on function public.can_see_kids(text) to anon;
grant execute on function public.is_permanent_user(), public.is_app_admin(), public.is_gym_staff(text),
                          public.is_verified_family(text), public.can_see_kids(text) to authenticated;
revoke execute on function public.request_family_verification(text), public.verify_family(uuid, text),
                           public.revoke_family(uuid, text), public.add_gym_staff(text, uuid, text) from public, anon;
grant execute on function public.request_family_verification(text), public.verify_family(uuid, text),
                          public.revoke_family(uuid, text), public.add_gym_staff(text, uuid, text) to authenticated;

-- The Mat Board: one schema for timetable, presence, verified visits and belt attestation.
-- Runs on the Supabase free plan. Every table has RLS on. Anonymous users (auth.jwt()->>'is_anonymous' = 'true')
-- can read everything and write their own rows; nobody can write another user's rows.

create extension if not exists postgis with schema extensions;
create extension if not exists pg_cron with schema pg_catalog;

-- ---------- profiles: one per auth user (anonymous or not) ----------
create table if not exists public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  display_name  text not null check (char_length(display_name) between 1 and 40),
  sport         text,                         -- primary sport id, e.g. 'bjj'
  belt          text,                         -- self-declared rank label, e.g. 'blue'
  belt_verified boolean not null default false,
  created_at    timestamptz not null default now()
);

-- ---------- gyms: the OSM venue, keyed by the app's existing id ('osm-node-123' / 'nom-way-456') ----------
create table if not exists public.gyms (
  id           text primary key,             -- app venue id
  name         text not null,
  loc          geography(point, 4326) not null,
  city         text,
  dropin_fee   text,                          -- free text a member typed, e.g. '$25 / free with a gi'
  created_by   uuid references auth.users (id),
  created_at   timestamptz not null default now()
);
create index if not exists gyms_loc_idx on public.gyms using gist (loc);

-- ---------- slots: the shared timetable ----------
create table if not exists public.slots (
  id           bigint generated always as identity primary key,
  gym_id       text not null references public.gyms (id) on delete cascade,
  weekday      smallint not null check (weekday between 0 and 6),   -- 0 = Sunday
  start_min    smallint not null check (start_min between 0 and 1439), -- minutes after midnight, gym local time
  duration_min smallint not null default 90 check (duration_min between 15 and 360),
  sport        text not null,                 -- 'bjj', 'boxing', ...
  kind         text not null default 'class', -- 'class' | 'open-mat' | 'competition-class' | 'kids'
  gear         text[] not null default '{}',  -- 'gi', 'no-gi', 'gloves', 'shin-guards', ...
  note         text check (char_length(note) <= 140),
  confirmed_by uuid references auth.users (id),
  confirmed_at timestamptz not null default now(),
  created_by   uuid not null references auth.users (id),
  removed_at   timestamptz                   -- soft delete; anyone can restore
);
create index if not exists slots_gym_idx on public.slots (gym_id, weekday, start_min) where removed_at is null;

-- ---------- intents: "I'm in" for one occurrence of a slot ----------
create table if not exists public.intents (
  slot_id    bigint not null references public.slots (id) on delete cascade,
  user_id    uuid   not null references auth.users (id) on delete cascade,
  on_date    date   not null,                 -- the occurrence
  created_at timestamptz not null default now(),
  primary key (slot_id, user_id, on_date)
);
create index if not exists intents_date_idx on public.intents (on_date);

-- ---------- checkins: at the door, geofenced server-side. Stores a yes/no, never raw coordinates ----------
create table if not exists public.checkins (
  id         bigint generated always as identity primary key,
  gym_id     text not null references public.gyms (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  slot_id    bigint references public.slots (id) on delete set null,
  at         timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '3 hours'
);
create index if not exists checkins_live_idx on public.checkins (gym_id, expires_at);
create index if not exists checkins_user_idx on public.checkins (user_id, at desc);

-- ---------- attestations: "Rolled with X, blue belt" ----------
create table if not exists public.attestations (
  attester   uuid not null references auth.users (id) on delete cascade,
  subject    uuid not null references auth.users (id) on delete cascade,
  belt       text not null,
  checkin_id bigint not null references public.checkins (id) on delete cascade, -- the attester's own check-in
  created_at timestamptz not null default now(),
  primary key (attester, subject),
  check (attester <> subject)
);

-- ---------- helpers ----------
create or replace function public.current_uid() returns uuid
  language sql stable set search_path = public as $$ select auth.uid() $$;

-- Check in only when the phone is within 150 m of the gym. The caller sends its position once;
-- the function stores only the fact of a valid check-in.
create or replace function public.check_in(p_gym_id text, p_lat double precision, p_lng double precision, p_slot_id bigint default null)
returns public.checkins
language plpgsql security definer set search_path = public, extensions as $$
declare g public.gyms; c public.checkins;
begin
  if auth.uid() is null then raise exception 'sign in first'; end if;
  select * into g from public.gyms where id = p_gym_id;
  if not found then raise exception 'unknown gym'; end if;
  if st_distance(g.loc, st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography) > 150 then
    raise exception 'too far from the venue (needs to be within 150 m)';
  end if;
  if exists (select 1 from public.checkins where user_id = auth.uid() and gym_id = p_gym_id and expires_at > now()) then
    select * into c from public.checkins where user_id = auth.uid() and gym_id = p_gym_id and expires_at > now() limit 1;
    return c;
  end if;
  insert into public.checkins (gym_id, user_id, slot_id) values (p_gym_id, auth.uid(), p_slot_id) returning * into c;
  return c;
end $$;

-- Attest a belt: only for someone checked in at the same gym while you were, and never twice for the same person.
create or replace function public.attest_belt(p_subject uuid, p_belt text)
returns void
language plpgsql security definer set search_path = public, extensions as $$
declare my_checkin public.checkins; n int;
begin
  if auth.uid() is null then raise exception 'sign in first'; end if;
  select c.* into my_checkin from public.checkins c
    where c.user_id = auth.uid() and c.at > now() - interval '24 hours'
      and exists (select 1 from public.checkins s where s.user_id = p_subject and s.gym_id = c.gym_id
                  and s.at between c.at - interval '3 hours' and c.at + interval '3 hours')
    order by c.at desc limit 1;
  if not found then raise exception 'you have to have trained at the same place and time'; end if;
  insert into public.attestations (attester, subject, belt, checkin_id) values (auth.uid(), p_subject, p_belt, my_checkin.id)
    on conflict (attester, subject) do update set belt = excluded.belt, checkin_id = excluded.checkin_id, created_at = now();
  select count(*) into n from public.attestations a where a.subject = p_subject and a.belt = p_belt;
  update public.profiles set belt_verified = (n >= 3), belt = case when n >= 3 then p_belt else belt end where id = p_subject;
end $$;

-- What the board reads: this week's slots with "I'm in" counts and names.
create or replace view public.board_slots with (security_invoker = true) as
  select s.*, g.name as gym_name,
         (select count(*) from public.intents i where i.slot_id = s.id and i.on_date >= current_date) as in_count
  from public.slots s join public.gyms g on g.id = s.gym_id
  where s.removed_at is null;

-- Nyx / travel mode: nearest open mats today.
create or replace function public.open_mats_near(p_lat double precision, p_lng double precision, p_km double precision default 25)
returns table (gym_id text, gym_name text, slot_id bigint, start_min smallint, kind text, sport text, in_count bigint, km double precision)
language sql stable set search_path = public, extensions as $$
  select g.id, g.name, s.id, s.start_min, s.kind, s.sport,
         (select count(*) from public.intents i where i.slot_id = s.id and i.on_date = current_date),
         st_distance(g.loc, st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography) / 1000
  from public.slots s join public.gyms g on g.id = s.gym_id
  where s.removed_at is null and s.weekday = extract(dow from now())::smallint
    and st_dwithin(g.loc, st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography, p_km * 1000)
  order by 8, s.start_min
$$;

-- ---------- row-level security ----------
alter table public.profiles     enable row level security;
alter table public.gyms         enable row level security;
alter table public.slots        enable row level security;
alter table public.intents      enable row level security;
alter table public.checkins     enable row level security;
alter table public.attestations enable row level security;

-- everyone (even signed-out readers) can read boards
create policy "read profiles"     on public.profiles     for select using (true);
create policy "read gyms"         on public.gyms         for select using (true);
create policy "read slots"        on public.slots        for select using (true);
create policy "read intents"      on public.intents      for select using (true);
create policy "read checkins"     on public.checkins     for select using (expires_at > now() or user_id = auth.uid());
create policy "read attestations" on public.attestations for select using (true);

-- signed-in users (anonymous included) write their own rows
create policy "own profile"   on public.profiles for all    using (id = auth.uid()) with check (id = auth.uid());
create policy "add gym"       on public.gyms     for insert with check (auth.uid() is not null);
create policy "edit gym"      on public.gyms     for update using (auth.uid() is not null);
create policy "add slot"      on public.slots    for insert with check (created_by = auth.uid());
create policy "edit slot"     on public.slots    for update using (auth.uid() is not null);   -- shared timetable: anyone signed in may correct
create policy "own intent"    on public.intents  for all    using (user_id = auth.uid()) with check (user_id = auth.uid());
-- checkins and attestations are written only through the functions above (security definer)

-- ---------- housekeeping ----------
-- Expired check-ins go away after 30 days; intents after 30 days.
select cron.schedule('matboard-prune', '17 4 * * *', $$
  delete from public.checkins where expires_at < now() - interval '30 days';
  delete from public.intents  where on_date   < current_date - 30;
$$);
-- Keep the free project active: one tiny query a day counts as activity.
select cron.schedule('matboard-keepalive', '0 6 * * *', $$ select count(*) from public.gyms $$);

-- ---------- I5: the app-owned venue cache, searched before any OSM call ----------
create or replace function public.gyms_near(p_lat double precision, p_lng double precision, p_km double precision default 12)
returns table (id text, name text, city text, dropin_fee text, km double precision, lat double precision, lng double precision, slot_count bigint)
language sql stable set search_path = public, extensions as $$
  select g.id, g.name, g.city, g.dropin_fee,
         st_distance(g.loc, st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography) / 1000,
         st_y(g.loc::geometry), st_x(g.loc::geometry),
         (select count(*) from public.slots s where s.gym_id = g.id and s.removed_at is null)
  from public.gyms g
  where st_dwithin(g.loc, st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography, p_km * 1000)
  order by 5
$$;

-- Members report a venue as closed or wrong; two reports hide it from search until re-seeded.
create table if not exists public.venue_reports (
  gym_id     text not null references public.gyms (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  reason     text not null check (reason in ('closed', 'moved', 'wrong-sport', 'duplicate', 'other')),
  note       text check (char_length(note) <= 140),
  created_at timestamptz not null default now(),
  primary key (gym_id, user_id)
);
alter table public.venue_reports enable row level security;
create policy "read reports" on public.venue_reports for select using (true);
create policy "own report"   on public.venue_reports for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- I6: Web Push subscriptions (standard VAPID; sent by an edge function) ----------
create table if not exists public.push_subscriptions (
  user_id    uuid not null references auth.users (id) on delete cascade,
  gym_id     text not null references public.gyms (id) on delete cascade,
  endpoint   text not null,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, gym_id, endpoint)
);
alter table public.push_subscriptions enable row level security;
create policy "own subscription" on public.push_subscriptions for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- grants (the project was created with "automatically expose new tables" OFF) ----------
-- Anonymous sign-ins get the 'authenticated' role (with is_anonymous = true in the JWT).
grant usage on schema public to anon, authenticated;
grant select on public.profiles, public.gyms, public.slots, public.intents, public.checkins,
                public.attestations, public.venue_reports, public.board_slots to anon, authenticated;
grant insert, update, delete on public.profiles, public.intents, public.venue_reports, public.push_subscriptions to authenticated;
grant select on public.push_subscriptions to authenticated;
grant insert, update on public.gyms, public.slots to authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant execute on function public.check_in(text, double precision, double precision, bigint) to authenticated;
grant execute on function public.attest_belt(uuid, text) to authenticated;
grant execute on function public.gyms_near(double precision, double precision, double precision) to anon, authenticated;
grant execute on function public.open_mats_near(double precision, double precision, double precision) to anon, authenticated;
revoke execute on function public.check_in(text, double precision, double precision, bigint) from anon, public;
revoke execute on function public.attest_belt(uuid, text) from anon, public;

-- ---------- least privilege (applied live 2026-09-27 after the grant audit) ----------
revoke truncate, trigger, references on all tables in schema public from anon, authenticated;
revoke insert, update, delete on all tables in schema public from anon;
revoke delete on public.gyms, public.slots from authenticated;
alter default privileges in schema public revoke truncate, trigger, references on tables from anon, authenticated;

-- ---------- realtime: boards update live ----------
alter publication supabase_realtime add table public.slots, public.intents, public.checkins;

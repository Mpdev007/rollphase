-- Gyms that OpenStreetMap doesn't know (most fight gyms), and where every mat time came from.
-- Applied live 2026-09-27.

-- Venue facts for gyms that don't come from OSM (for OSM venues the app still reads OSM).
alter table public.gyms
  add column if not exists address    text,
  add column if not exists phone      text,
  add column if not exists website    text,
  add column if not exists source     text not null default 'osm' check (source in ('osm', 'member', 'gym-website')),
  add column if not exists source_url text;

-- A mat time is either typed by a member (created_by set) or taken from the gym's own published schedule.
alter table public.slots alter column created_by drop not null;
alter table public.slots
  add column if not exists source     text not null default 'member' check (source in ('member', 'gym-website')),
  add column if not exists source_url text;
alter table public.slots add constraint slots_member_has_author
  check (source <> 'member' or created_by is not null);

-- Members can only add member rows in their own name; website-sourced rows are added by the architect.
drop policy if exists "add slot" on public.slots;
create policy "add slot" on public.slots for insert
  with check (created_by = auth.uid() and source = 'member');

-- The board view picks up the new columns.
drop view if exists public.board_slots;
create view public.board_slots with (security_invoker = true) as
  select s.*, g.name as gym_name,
         (select count(*) from public.intents i where i.slot_id = s.id and i.on_date >= current_date) as in_count
  from public.slots s join public.gyms g on g.id = s.gym_id
  where s.removed_at is null;
grant select on public.board_slots to anon, authenticated;

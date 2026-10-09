-- Feedback inbox. Athletes may add a note. They may not read notes.
-- Not applied to the live project until this file is run there.
-- The phone shows "Sent" only after this table accepts the row.

create table if not exists public.feedback (
  id         bigint generated always as identity primary key,
  area       text not null check (char_length(area) between 1 and 40),
  rating     smallint not null check (rating between 1 and 5),
  body       text not null check (char_length(body) between 1 and 2000),
  contact    text check (contact is null or char_length(contact) <= 120),
  created_at timestamptz not null default now()
);

alter table public.feedback enable row level security;

revoke all on table public.feedback from public, anon, authenticated;
grant insert on table public.feedback to anon, authenticated;
grant usage on sequence public.feedback_id_seq to anon, authenticated;

drop policy if exists "feedback insert" on public.feedback;
create policy "feedback insert"
  on public.feedback
  for insert
  to anon, authenticated
  with check (
    char_length(body) between 1 and 2000
    and rating between 1 and 5
    and char_length(area) between 1 and 40
    and (contact is null or char_length(contact) <= 120)
  );

-- Check: insert as anon succeeds, select as anon returns permission denied.
-- insert into public.feedback (area, rating, body) values ('home', 4, 'check');

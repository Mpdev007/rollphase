-- Pure Brazilian Jiu Jitsu: kids and teen classes from the gym's published schedule (fetched 2026-09-27,
-- https://purebrazilianjiujitsu.com/schedule/). The times are public; who is coming is not, and counts are shown
-- only to verified families, staff and admins (see the Family Access migration).
-- Weekday: 0 = Sunday … 6 = Saturday. start_min = minutes after midnight (gym local time).

insert into public.slots (gym_id, weekday, start_min, duration_min, sport, kind, audience, gear, note, source, source_url, confirmed_at)
select 'rp-pure-bjj-norwood-park', d, s, m, 'bjj', k, a, '{}'::text[], n, 'gym-website', 'https://purebrazilianjiujitsu.com/schedule/', now()
from (values
  -- Monday
  (1,  930, 45, 'kids',     'kids',  'Smurf Crew 1 (ages 4-7)'),
  (1,  975, 45, 'kids',     'kids',  'Smurf Crew 3 (ages 4-7)'),
  (1, 1020, 60, 'kids',     'kids',  'Kids Beginner (ages 7-12)'),
  (1, 1080, 60, 'kids',     'teens', 'Kids Advance (teens, invite only)'),
  -- Tuesday
  (2,  705, 45, 'kids',     'kids',  'Toddler Class'),
  (2,  930, 45, 'kids',     'kids',  'Smurf Crew 2 (ages 4-7)'),
  (2,  975, 45, 'kids',     'kids',  'Smurf Crew 4 (ages 4-7)'),
  (2, 1020, 60, 'kids',     'kids',  'Kids Beginners (ages 7-12)'),
  (2, 1080, 60, 'kids',     'teens', 'Kids Advance (teens, invite only)'),
  -- Wednesday
  (3,  930, 45, 'kids',     'kids',  'Smurf Crew 1 (ages 4-7)'),
  (3,  975, 45, 'kids',     'kids',  'Smurf Crew 3 (ages 4-7)'),
  (3, 1020, 60, 'kids',     'kids',  'Kids Beginner (ages 7-12)'),
  (3, 1080, 60, 'kids',     'teens', 'Kids Advance (teens, invite only)'),
  -- Thursday
  (4,  705, 45, 'kids',     'kids',  'Toddler Class'),
  (4,  930, 45, 'kids',     'kids',  'Smurf Crew 2 (ages 4-7)'),
  (4,  975, 45, 'kids',     'kids',  'Kids Beginner 2 (ages 7-12)'),
  (4,  975, 45, 'kids',     'kids',  'Smurf Crew 4 (ages 4-7)'),
  (4, 1020, 60, 'kids',     'kids',  'Kids Beginner (ages 7-12)'),
  (4, 1080, 60, 'kids',     'teens', 'Kids Advance (teens, invite only)'),
  -- Friday
  (5,  930, 45, 'kids',     'kids',  'Smurf Crew 2 (ages 4-7)'),
  (5,  975, 45, 'kids',     'kids',  'Smurf Crew 4 (ages 4-7)'),
  (5, 1020, 60, 'kids',     'teens', 'Youth Comp Class (invite only)'),
  (5, 1050, 60, 'kids',     'kids',  'Kids Comp Class'),
  -- Saturday
  (6,  540, 45, 'kids',     'kids',  'Smurf Crew 1 (ages 4-7)'),
  (6,  585, 45, 'kids',     'kids',  'Smurf Crew 3 (ages 4-7)'),
  (6,  630, 60, 'open-mat', 'kids',  'Kids Open Mat')
) as t(d, s, m, k, a, n)
where not exists (select 1 from public.slots where gym_id = 'rp-pure-bjj-norwood-park' and audience <> 'adult');

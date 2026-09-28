-- The first Mat Board: Pure Brazilian Jiu Jitsu, Norwood Park, Chicago.
-- Not in OpenStreetMap (the building at this address is tagged as a toy shop, way 163331058), so this is a
-- RollPhase-native venue. Location = the address geocoded by Nominatim (41.9907870, -87.7958372).
-- Mat times = ADULT classes from the gym's own published schedule, fetched 2026-09-27:
--   https://purebrazilianjiujitsu.com/schedule/
-- Kids/teen classes are in seed/first_gym_kids.sql (times public; who is coming is not: see the Family Access migration).
-- Weekday: 0 = Sunday … 6 = Saturday. start_min = minutes after midnight (gym local time).

insert into public.gyms (id, name, loc, city, address, phone, website, source, source_url)
values ('rp-pure-bjj-norwood-park', 'Pure Brazilian Jiu Jitsu',
        extensions.st_setsrid(extensions.st_makepoint(-87.7958372, 41.9907870), 4326)::extensions.geography,
        'Chicago, IL', '6017 N Northwest Hwy, Chicago, IL 60631', '(773) 413-8211',
        'https://purebrazilianjiujitsu.com/', 'gym-website', 'https://purebrazilianjiujitsu.com/contact-us/')
on conflict (id) do nothing;

insert into public.slots (gym_id, weekday, start_min, duration_min, sport, kind, gear, note, source, source_url, confirmed_at)
select 'rp-pure-bjj-norwood-park', d, s, m, 'bjj', k, g, n, 'gym-website', 'https://purebrazilianjiujitsu.com/schedule/', now()
from (values
  (1,  360, 60, 'class',             '{}'::text[],      'Adult BJJ'),
  (1, 1140, 90, 'class',             '{}'::text[],      'Adult Fundamentals'),
  (2,  540, 90, 'competition-class', '{}'::text[],      'Adult Comp Class'),
  (2, 1140, 90, 'class',             '{}'::text[],      'Adult Fundamentals'),
  (3,  360, 60, 'class',             '{}'::text[],      'Adult BJJ'),
  (3,  540, 90, 'competition-class', '{}'::text[],      'Adult Comp Class'),
  (3, 1140, 90, 'class',             '{}'::text[],      'Adult Fundamentals'),
  (4,  540, 90, 'competition-class', '{}'::text[],      'Adult Comp Class'),
  (4, 1140, 90, 'class',             '{}'::text[],      'Adult Fundamentals'),
  (5,  360, 60, 'class',             '{}'::text[],      'Adult BJJ'),
  (5,  540, 90, 'class',             '{no-gi}'::text[], 'Adult No-Gi'),
  (5, 1080, 60, 'open-mat',          '{}'::text[],      'Adult Open Mat'),
  (6,  690, 60, 'open-mat',          '{}'::text[],      'Adults Open Mat')
) as t(d, s, m, k, g, n)
where not exists (select 1 from public.slots where gym_id = 'rp-pure-bjj-norwood-park');

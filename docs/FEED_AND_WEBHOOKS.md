# Events feed, social graph & webhooks

## Product intent

When you train a sport (e.g. BJJ), you care about:

1. **When are the tournaments?** (IBJJF, NAGA, local)
2. **What’s live right now?** (open mat in progress, smoker tonight)
3. **What did my gym / federation just post?** (IG, FB)
4. **Notify me** before registration closes or when a session starts

Same pattern per sport — different sources.

## Depth model (prototype)

| Depth | Sports | What you get |
|-------|--------|--------------|
| **full** | BJJ, Pickleball, Muay Thai, HYROX | Rich events, live pulse, multi-source mock webhooks, pro ROI surfaces |
| **template** | All others | Same UI shell + light event seeds; calendars/socials not fully wired |

## Feed tab segments

- **Events** — tournaments, races, leagues, open play, class series  
- **Live** — check-in driven + “in progress” sessions  
- **Social** — posts from **followed** gyms/athletes (linked socials)

## Profile

- Social handles: Instagram, Facebook, X, TikTok, Strava, YouTube  
- **Following** list (gyms/orgs)  
- **Webhook endpoints** (mock) showing ingest sources  

## Production architecture (not built yet)

```
External sources          Ingest                     App
─────────────────         ──────                     ───
IBJJF / NAGA / HYROX  →   Edge Function cron     →   events table
Gym IG Graph / FB     →   webhook + OAuth        →   social_posts
Club calendars (ICS)  →   calendar sync          →   events
Check-ins Realtime    →   Supabase Realtime      →   live feed
User notify prefs     →   push (APNs/FCM)        →   “Notify me”
```

- All rows sport-scoped + PostGIS where location matters  
- RLS: users only get feeds for sports they care about / follows  
- Teen rules still apply to social matching (not public event discovery)

## Notify me

Per-event toggle stores preference → production job sends push N days / N hours before start and on registration deadline.

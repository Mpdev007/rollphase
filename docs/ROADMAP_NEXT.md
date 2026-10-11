# RollPhase — what to do next (priority advice)

## Left off — 2026-10-11

Nothing needs to be built right now to keep the app up. The public phone app is already live at https://mpdev007.github.io/rollphase-beta/ on GitHub Pages. That address does not use a port on this laptop. The Python preview on port 8876 is only for local checks and is allowed to stop.

Do not add Cloudflare. Do not move the app onto Supabase to keep it online. Do not pay for hosting while the local ecosystem is unfinished. When that ecosystem can host it, the app moves there. Until then, testers use the GitHub Pages link.

### Already on the phone

Source `Mpdev007/rollphase` master `0b8a17c`. Phone beta `Mpdev007/rollphase-beta` master `7bfdc8e`. Live build `20261011-0315-0ea1ea1`, version 0.8.0. Once a sport is chosen, Home is that sport. The only sport switcher is the top menu. The map lists only places for that sport. Do not redo this.

Place search, map pins, filters, per-sport level ladders, and the official doors are on that build. A new sport starts unset. Adult matching stays within one step of that sport’s ladder. Youth and adults stay separate. Proven on the live site, phone size, Chicago at 41.8781, -87.6298 within 12 km: 329 tennis places and 329 pins, ≤ 5 mi cut them to 151 pins, four TITLE Boxing Club locations, Open now cleared the pins and Show the full list restored them, and Brazilian Jiu-Jitsu returned Double Five, Supreme, Renzo Gracie Chicago, and Vianna Brothers. The tennis, boxing, and jiu-jitsu doors on that pass were USTA, USA Boxing Webpoint, and IBJJF plus Smoothcomp. No Planet Fitness, LA Fitness, or Gold's Gym appeared on boxing or jiu-jitsu.

| Sport | Door | Final page |
|---|---|---|
| Soccer | U.S. Soccer schedule | https://www.ussoccer.com/all-matches |
| Running | USATF events | https://www.usatf.org/events |
| Wrestling | USA Wrestling events | https://usawrestlingevents.com/events |
| Boxing | USA Boxing events | https://usaboxing.webpoint.us/wp15/Events2/Events-wp.php?evt_CategoryID=4,1,2,11,10 |
| Climbing | World Climbing calendar | https://www.worldclimbing.com/calendar |
| Cycling | USA Cycling events | https://usacycling.sport80.com/pub/e_locator/events/find?from_date=today |
| Swimming | U.S. Masters meets | https://www.usms.org/events |
| Basketball | FIBA 3x3 events | https://play.fiba3x3.com/events |

Combat sports also keep Smoothcomp. Pickleball also keeps DUPR. The other doors that already opened and were left in place: IBJJF, UFC, WAKO, IJF, CrossFit Games, HYROX, pickleball tournaments, USA Volleyball, IFMA, USA Weightlifting, USTA, Yoga Alliance, and the Pilates workshop calendar.

### Saved locally, not on the phone yet

Do not use `ship.ps1` `git add -A`. Do not commit `config.js`, `.enrich-cache.json`, `__pycache__`, `visual/assets`, `prototype/glyph-preview/`, `bridge.token`, `accounts.json`, or `links.json`.

- [ ] Studio 3D glyph pack, kept beside Fight night, Neon, Chalk, Ice, and Bright. Sport objects live in `prototype/packs/studio/` and `prototype/assets/sports/studio/`. Recolor is a thin rim. First Studio tab paint can hitch. The phone picker does not offer Studio.

| Sport | Door | Final page |
|---|---|---|
| Soccer | U.S. Soccer schedule | https://www.ussoccer.com/all-matches |
| Running | USATF events | https://www.usatf.org/events |
| Wrestling | USA Wrestling events | https://usawrestlingevents.com/events |
| Boxing | USA Boxing events | https://usaboxing.webpoint.us/wp15/Events2/Events-wp.php?evt_CategoryID=4,1,2,11,10 |
| Climbing | World Climbing calendar | https://www.worldclimbing.com/calendar |
| Cycling | USA Cycling events | https://usacycling.sport80.com/pub/e_locator/events/find?from_date=today |
| Swimming | U.S. Masters meets | https://www.usms.org/events |
| Basketball | FIBA 3x3 events | https://play.fiba3x3.com/events |

Combat sports also keep Smoothcomp. Pickleball also keeps DUPR. The other doors that already opened and were left in place: IBJJF, UFC, WAKO, IJF, CrossFit Games, HYROX, pickleball tournaments, USA Volleyball, IFMA, USA Weightlifting, USTA, Yoga Alliance, and the Pilates workshop calendar.

### Known limits to revisit later, not to invent around

- [ ] Soccer is the national-team schedule. U.S. Soccer does not publish an adult rec-league calendar. The old `/calendar` URL is a soft 404.
- [ ] Basketball is FIBA 3x3, including a recreational filter. USA Basketball Play is a national-team scoreboard. Open Court is ages 6–17. Do not attach the NBA schedule or a youth-club directory.
- [ ] USA Boxing’s education events page is an empty script shell. The Webpoint search is the real list. `www.usawrestlingevents.com` fails TLS; the bare host is the one that opens. United World Wrestling’s calendar still opens and is not the wired door.
- [ ] USA Climbing “Find a Local Event” is a menu of series, and the recreational series is a youth page. The World Climbing calendar is the list of real comps.
- [ ] Partner filters do not draw a bar. Do not mark every sport fully built.
- [ ] Feedback notes stay on the phone until the owner applies `supabase/migrations/20261009000000_feedback_inbox.sql` on staging. Do not apply it to prod (`rollphase-prod`). Do not put a personal email in public `beta.js`.
- [ ] Accounts, the live partner board, and cross-phone sync wait for the ecosystem. Staging Supabase may be used for tests. Prod stays read-only. The free Supabase project pauses after about a week idle, so it is not the always-on host.
- [ ] A custom domain through Cloudflare’s free plan can wait. It does not change uptime.
- [ ] The public map has no record for several real Chicago academies, including 10th Planet, Gracie Barra, and Carlson Gracie. The app lists the places that map has. It does not invent the missing ones, and it does not use a paid places key.
- [ ] Open now only matches places that publish hours the map can read. The four Chicago boxing clubs did not, so that filter correctly came up empty.
- [ ] A full-city scan can still stop early when the public map server is busy. The status then says some places may be missing and keeps the places already confirmed.
- [ ] No card checkout, no public Muse host, and no invented gyms, people, or events.

The checklist below is older advice. The left-off section above is the current resume point.

## Done in this beta prototype

- Sport-first IA + optional focus (not forced)
- Multi-sport profile rail
- Feed (events / live / social mock)
- Represent: logo, crop, free colors, Nix client stub
- Beta gate + feedback + About

## Highest ROI next (recommended order)

### 1. Shareable beta ops (this week)
- [x] Persistent public URL (static host)
- [ ] Set `feedbackEmail` in `beta.js` so FormSubmit delivers to you
- [ ] Short tester invite message (copy below)
- [ ] Spreadsheet of testers + themes of feedback

### 2. Real data foundation
- [ ] Supabase project + migrations (sports, profiles, gyms PostGIS, RLS)
- [ ] Seed 1 city seriously (e.g. Austin or Chicago) for 3 sports
- [ ] Auth (email magic link) so multi-device profiles work

### 3. Native shell
- [ ] iOS SwiftUI skeleton + Android Compose skeleton
- [ ] Shared API contracts (OpenAPI / Supabase types)
- [ ] MapKit / Google Maps wired to PostGIS RPCs

### 4. Partner safety (before any real matching)
- [ ] Server-side age bands (teen ≠ adult)
- [ ] Block / report + moderation queue
- [ ] Privacy: approximate distance only

### 5. Feed intelligence
- [ ] Calendar ICS + org webhooks (IBJJF-style, races)
- [ ] Follow gym → Realtime/social posts
- [ ] Push: “Notify me” on tournaments

### 6. Nix on device
- [ ] Ship Nix local HTTP on phone
- [ ] Wire `NixClient` endpoint from settings
- [ ] Optional generative strip textures (still profile-only)

### 7. Legal / brand
- [ ] Terms + Privacy for production
- [ ] Club logo upload ToS (rights attestation checkbox)
- [ ] Never ship third-party marks as default sport skins

## Invite blurb (paste to friends)

> Hey — I’m testing **RollPhase**, a multi-sport training app prototype (find gyms, partners, events, personalize your club vibe). It’s a **clickable beta**, not the final app. Open the link on your phone, accept the disclaimer, click around 10 minutes, then hit **Feedback** top-right. Honest critique welcome:
>
> **https://mpdev007.github.io/rollphase-beta/**

## What *not* to overbuild yet

- Full e-commerce gear
- Federation official integrations before seed city works
- Perfect every sport to “full” depth — keep template + 3–4 flagships

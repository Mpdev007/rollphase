# The Mat Board

RollPhase answers one question: **"Where can I train tonight, and will anyone be there?"**

Everything in this design sits on one object, the gym. That is deliberate: the data, the presence, the trust and the growth loop all bound to the same place, so one schema carries all four.

## The seat: one page per gym

`#/gym/<id>` becomes the Mat Board. Anyone can read it without an account. It shows:

1. **Mat times this week**: a plain grid. Mon 7pm gi · Tue 7pm no-gi · Sat 11am open mat.
2. **Who's in**: under each slot, the first names and belts of people who tapped "I'm in".
3. **Here now**: who checked in at the door in the last 3 hours.
4. The venue facts the app already has from OpenStreetMap (address, phone, site, directions), plus the drop-in fee if a member typed it.

## The four legs

### 1. The QR poster (growth)
Any member prints a one-page poster from the board: the QR on top, the mat-time grid below, the gym's name. It hangs by the mats. Scanning it opens the board; one tap says "I'm in" or "I'm here". The person who hangs it is the most invested user the app can have, and the poster lives where athletes already gather.

- The QR encodes `https://<origin>/#/gym/<id>?src=poster`. It carries no user data.
- The QR is drawn on the phone (a vendored MIT QR encoder), no third-party image service.
- "Share" uses the phone's own share sheet (`navigator.share`, with `canShare` first), with a copy-link fallback and a visible toast. Never `alert()`.

### 2. The shared timetable (data, without a scraper)
The first member to open a board types the mat times once. Anyone can correct a slot. Every slot shows "confirmed by Ana, 3 days ago". A slot nobody has confirmed for 60 days is shown greyed with "unconfirmed" until someone taps confirm.

This replaces website scraping and the laptop-only enrich server. Members already hold this schedule in their heads and will type it when it is the only thing between them and "who's coming Thursday".

### 3. "I'm in" on a slot (presence)
Under every slot: one button, **I'm in**, for this week's occurrence. Tap it and your name and belt appear under the slot. Tap again to leave. The board shows "4 in: Mike (blue), Ana (purple), …". An empty slot says "nobody's in yet", which is honest and is itself the reason to tap.

**Here now** is the door check-in the app already has, made real: it requires the phone to be within 150 m of the venue, it expires after 3 hours, and it is what turns an "I'm in" into a verified visit.

### 4. The belt handshake (trust without an authority)
After two people were checked in at the same slot, each can tap **"Rolled with Mike, blue belt ✓"**. Three confirmations from three different accounts, each at a real check-in, mark the belt **verified**. Anyone can spot a wrong belt in one round, so peer attestation is the fastest reliable check available, and it is a natural thing to tap after training.

The same rows give the **training passport**: the gyms where you have been confirmed, which is what a visiting athlete shows a new gym.

## Two pieces that sit on the same seat
- **Travel mode**: search a city and get every gym's next open mat and drop-in fee. Traveling athletes are the most motivated users, and the fee is the number they want first.
- **Gear on the slot**: a slot tagged gi / no-gi / gloves tells a first-timer what to bring. That makes the gear tab real.

## Why this shape
- One schema: `gyms`, `slots`, `intents`, `checkins`, `attestations`, `profiles`. See `SCHEMA.sql`.
- Nothing pretends. Every count is real taps. Empty states say so.
- It works at **one gym with two people**. It does not need a crowd.
- $0/month: the Supabase free plan, plus a scheduled keep-alive so the project never pauses. **Unverified (checked 2026-09-27):** Supabase's docs don't say what counts as "activity" for the 1-week pause, or whether pg_cron runs on the free plan. Both get tested on the real project in wave M1; if a database-side cron doesn't count, the fallback is a GitHub Actions cron that hits one public read endpoint daily.
- No account to read a board or to tap "I'm in": Supabase anonymous sign-in gives every phone a stable user id; a member can add an email later and keep the same id and history.
- Nyx (the owner's on-device assistant) plugs in with one query: "where can I roll tonight" = `slots` for today joined with `intents` counts, nearest first.

## What is honest about identity
- An "I'm in" from an anonymous user shows the display name they typed and their **self-declared** belt, marked as such, until three handshakes verify it.
- Nobody's location is stored raw: check-ins store a 150-m yes/no, not coordinates. Boards never show who is at home.
- Teens: until a real age check exists, the board shows no ages and no DMs. The board is a schedule, not a chat.

## What this replaces in the fix plan
- The enrich server (M24) and its Local Network prompt: gone. Hours come from the timetable.
- "Partners" as a matching tab: becomes "who's in" on real slots. The empty Partners tab and its fake filters go away.
- "Feed › Live": becomes Here now on each board, and a home card "3 people in at Gracie Barra tonight".
- The self-granted "Visit verified" badge: replaced by the geofenced check-in.
- The venue share blurb + `alert()`: replaced by the share sheet + QR + poster.

## Launch order
1. **Wave M1 (backend)**: `SCHEMA.sql`, RLS policies, the keep-alive cron, anonymous sign-in enabled. Needs the owner's `supabase login` and one project.
2. **Wave M2 (board)**: the board page on `#/gym/<id>`, timetable editing, "I'm in", Here now with the geofence, share sheet + QR + poster print view.
3. **Wave M3 (trust)**: handshake, passport, travel mode, gear on slots.
4. The existing fix lanes (A1, B, C, D, F, G, K, Q…) run in parallel; the board replaces lanes H (backend) and the Partners/Live/Feed parts of E and A3.

## Acceptance (runs, not greps)
- Two phones (or two browser profiles): A types a slot, B sees it within 2 s. B taps "I'm in", A sees "1 in: B (white)" within 2 s (Supabase Realtime).
- A check-in from 5 km away is refused with a plain message; from 50 m it is accepted and expires after 3 h.
- The QR decodes on a phone camera to the board URL and opens the installed app.
- With the network off, the board shows the last cached timetable and says so.
- The free project stays unpaused for 14 days with no human traffic (the cron ping).

## Kids, levels and matching
Kids and teen class times are public on the board like any timetable; who is coming to them is not (Family Access, `supabase/migrations/20260927020000_kids_classes_counts_only.sql`). Levels for every sport, adult matching and the parent-to-parent, consent-gated **Kids Match** are designed in `LEVELS-AND-MATCH.md`.

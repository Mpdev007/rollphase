# RollPhase invent-max, 2026-09-27

What the app is today, where its limits really are, what the world offers as of today (primary sources, dated), the inventions, how each one is killed or proven, and what ships first.

## 1. What exists, in numbers (measured, not believed)

From the two max-deep QA passes (`docs/qa/QA-MAXDEEP-2026-09-26.md`) and the baseline (`docs/qa/BASELINE-2026-09-26.md`):
- 34% of 203 checks pass. 9 blockers.
- The only real data is OpenStreetMap venues. Partners, events, live, updates, gear, reviews and feedback are local-only or empty.
- Sport search returns generic gyms: 0 of 55 pickleball results and 0 of 43 boxing results were relevant.
- Venues appear 2.4 s after open; 2.2 s of that is deliberate `setTimeout` sleeps.
- Lighthouse mobile perf 68, LCP 9.8 s. Sport art (1024-px JPEGs) is 85% of a session's bytes.
- The first visit loads the whole app twice (service-worker self-reload).

Where it is already best-in-class: honest empty states (no fake gyms or partners), OSM as the venue source (free, global, correctable), a static host that costs nothing, an installable PWA, real canvas colour extraction for the club crest, and the icon-pack recolour engine (0 pixels change outside the mask on 25 icons × 33 settings).

## 2. The limits (physics first)

| Pain, in the owner's words | What bounds it | Today | The bound | Gap |
|---|---|---|---|---|
| "The maps got to deploy… sport search returns generic gyms" | **The data.** OSM has no `sport=` value for BJJ, MMA, kickboxing or Muay Thai. Globally: `sport=jiu-jitsu` 392 objects, `brazilian_jiu-jitsu` 37, `boxing` 1,443, `kickboxing` 317, `martial_arts` 1,329, `amenity=dojo` 9,679; `mma` and `muay_thai` absent from the top values (taginfo, 2026-09-27). Compare `tennis` 599,053 and `pickleball` 31,079. | The app queries `leisure=fitness_centre/sports_centre/dojo` and `amenity=gym` (places-live.js:505-508), then guesses sports from names. | For fight sports, OSM will never be enough: the tag values barely exist. Only people who train there know. | The whole answer for fight sports. |
| "Who is on mats now" | **Attention and network effects.** Presence exists only if athletes state it. | Nothing collects it. | One tap per athlete per session, at the place they already are. | 100%. |
| "Trusted reviews", belts | **Trust.** No authority publishes belt rolls. | Self-typed belt; a "Visit verified" badge from one tap anywhere. | Peer confirmation at a real co-located visit. | 100%. |
| "Make sure everything is real… production ready" | **Free-API budget.** Overpass fair use for a regular app ≈ 100 queries/day and 10 MB/day (overpass-api.de policy: "divide those numbers by 100"); Nominatim 1 req/s, no autocomplete, must cache (OSMF policy). | 6 queries per open, each sent twice; 20-s version polls. | ~100 venue queries a day for the whole user base. | One busy gym would exhaust it in a day. The app must own its venue data. |
| "The links got to be usable… share" | **Growth loop.** Nobody finds a gym app on their own. | One buried "copy blurb" button, `alert()`. | A poster on the wall of every gym. | 100%. |
| "No glitches… mobile first" | **Device.** 360-px, DPR 2.6-4 Android; 4x CPU throttle. | Tab switch 491 ms, sport switch 535 ms at 4x. | 16 ms frames. | 30x. |
| "$0" | **Cost.** Supabase free: 2 active projects, pause after 7 days of "low activity" (activity undefined in the docs), 500 MB DB, 200 realtime connections, 100 msg/s, 2 auth emails/hour on the built-in sender, 30 anonymous sign-ins/hour/IP, edge functions 150 s wall / 2 s CPU / 256 MB. | Nothing uses it yet. | A closed beta of hundreds fits. Email login does not (2/hour). | Design around anonymous-first auth and a keep-alive. |

## 3. Research findings (live web, 2026-09-27, primary sources)

| Topic | Finding | Source |
|---|---|---|
| OSM sport tagging | `sport=*` documented values include judo, boxing, wrestling, yoga, pilates, crossfit, fitness, tennis, climbing, swimming, running, cycling. **No dedicated value for BJJ, MMA, kickboxing, Muay Thai, pickleball on the key page** (pickleball exists in use: 31,079). Martial-arts facilities: `amenity=dojo`; sport clubs: `club=sport` + `sport=*`. | wiki.openstreetmap.org/wiki/Key:sport; Key:club; taginfo API |
| taginfo counts | jiu-jitsu 392; brazilian_jiu-jitsu 37; boxing 1,443; kickboxing 317; martial_arts 1,329; amenity=dojo 9,679; mma/muay_thai not in the top values. | taginfo.openstreetmap.org/api/4 |
| Overpass fair use | "less than 10,000 queries per day and 1 GB… if you set something up that uses the Overpass API regularly, divide those numbers by 100." Alternative public instances with no stated limit: overpass.private.coffee, maps.mail.ru. | wiki.openstreetmap.org/wiki/Overpass_API |
| Nominatim policy | Max 1 request/second; identifying User-Agent or Referer required; autocomplete forbidden; results must be cached; attribution required. | operations.osmfoundation.org/policies/nominatim |
| OSM tiles policy | Unique User-Agent; attribution visible, never hidden; cache tiles ≥ 7 days; no bulk pre-seeding or offline city downloads. | operations.osmfoundation.org/policies/tiles |
| OSM Notes API | `POST /api/0.6/notes` (lat, lon, text) **requires authentication**; 429 rate limiting exists. So an app cannot file notes anonymously; a user with an OSM account can, or the app links to the note form. | wiki.openstreetmap.org/wiki/API_v0.6 |
| Supabase anonymous auth | `signInAnonymously()`; later `updateUser()` / `linkIdentity()` keep the same user id; RLS via `auth.jwt()->>'is_anonymous'`; 30 requests/hour/IP; must be enabled in the dashboard. | supabase.com/docs/guides/auth/auth-anonymous |
| Supabase auth email | Built-in sender: **2 emails per hour**; custom SMTP needed for more. | supabase.com/docs/guides/platform/going-into-prod; auth/rate-limits |
| Supabase pause rule | "We may pause applications on the Free Plan that exhibit low activity in a 7-day period." **What counts as activity is not stated anywhere I could find.** | going-into-prod |
| Supabase Realtime, free | 200 concurrent connections, 100 messages/s, 100 channel joins/s, presence 20 msg/s and 5 calls per client per 30 s. | supabase.com/docs/guides/realtime/limits |
| Supabase edge functions | Free: 150 s wall clock, 2 s CPU, 256 MB, 100 functions per project. | supabase.com/docs/guides/functions/limits |
| Supabase Cron | pg_cron; jobs from every second to yearly; ≤ 8 concurrent, 10-min max per job. Plan availability not stated. | supabase.com/docs/guides/cron |
| Web Push | Standard on Chrome Android; on iOS 16.4+ for Home-Screen web apps, standard VAPID, no Apple developer membership. Supabase's push example covers FCM/Expo only. `web-push` (npm) is Node-only (engines ≥ 16). **`@negrel/webpush` 0.5.0 (MIT, JSR) uses only SubtleCrypto and runs on Deno**, so it fits an edge function. | webkit.org/blog/13878; MDN Push API; supabase functions example; jsr.io/@negrel/webpush |
| Web Share / Share Target | `navigator.share({title,text,url,files})` needs a user gesture and HTTPS, check `canShare()`; supported on Chrome Android and Safari iOS. `share_target` in the manifest works on Chrome Android 76+ **only when the PWA is installed**. | MDN Navigator.share; developer.chrome.com web-share-target |
| QR encoding | `lean-qr` 2.7.4, MIT, no dependencies, < 4 kB gzipped (nano ~2 kB), `generate(text).toCanvas(el)` / `toSvgSource()`. | cdn.jsdelivr.net/npm/lean-qr package.json + README |
| View transitions | `document.startViewTransition()`; Chrome 111+, Safari 18+, Firefox 144+; respect `prefers-reduced-motion`. | developer.chrome.com view-transitions |
| Badging on Android | No direct Badging API; Android badges the installed web app's icon automatically when a notification is unread. | developer.chrome.com badging-api |
| Periodic background sync | Installed PWA only; Chrome decides the interval from site engagement (~12 h typical). | developer.chrome.com periodic-background-sync |
| Play Store | A PWA can ship on Google Play as a Trusted Web Activity (Digital Asset Links), packaged with Bubblewrap or PWABuilder. | developer.chrome.com trusted-web-activity |
| Geolocation | `enableHighAccuracy` (default false), `timeout` (∞), `maximumAge` (0); `coords.accuracy` in metres. | MDN getCurrentPosition |

**Unknowns (not guessed):** what Supabase counts as free-plan "activity"; whether pg_cron is available on the free plan; GitHub Actions cron delays on quiet repos (the docs page returned 404 today); the exact Push API version table on MDN (page content not returned).

## 4. Inventions

Each: the mechanism, why here, expected gain (range, against the bound), risks, the cheapest prototype, the kill test, what it touches. Labels: NEW / NEW COMBINATION / KNOWN.

### I1. The Mat Board — one page per gym, no account to read it (NEW COMBINATION)
- **Mechanism:** `#/gym/<id>` becomes a board: this week's mat times, who's in per slot, who's here now, venue facts. Members type and correct the timetable ("confirmed by Ana, 3 days ago"). Design and schema: `DESIGN.md`, `supabase/migrations/…_mat_board.sql`.
- **Why here:** the data bound says no query will ever find fight gyms' schedules; the people who train there hold them. Correctable data with attribution beats scraping, and it is the one thing an athlete will type because it stands between them and "who's coming Thursday".
- **Gain:** sport-relevant results for fight sports go from ~0% (measured) to 100% of boards that have one member. Hours coverage: today "Hours not listed" on most venues (from the S25 walk); with a board, every slot is a known time.
- **Risks:** cold start (empty boards). Mitigation: the poster (I2) and the owner seeding his own gym first; empty slots are honest and are themselves the prompt.
- **Cheapest prototype:** one gym, two phones, the schema applied, a static board page reading `board_slots`.
- **Kill test:** two browser profiles: A types a slot, B sees it in ≤ 2 s; B taps "I'm in", A sees "1 in" in ≤ 2 s (Realtime). If either exceeds 5 s on the free plan, the design changes to polling.
- **Touches:** new `board.js`, `supabase-client.js`, `#screen-gym-detail` markup; the schema. Builder: Cursor lane M2.

### I2. The QR poster — the gym wall is the app store (NEW COMBINATION)
- **Mechanism:** a print view of any board: QR (drawn on the phone with lean-qr, 4 kB, no third party) + the timetable grid + the gym name. Scan → board → "I'm in" or "I'm here". The QR carries only `#/gym/<id>?src=poster`.
- **Why here:** the growth bound: nobody discovers a gym app online; they discover it at the gym, and the member who hangs it is the most invested user. It costs one sheet of paper.
- **Gain:** the only zero-cost acquisition channel that points at the exact place the product is about. Estimate: each poster reaches every regular of that gym within a week (unproven; the kill test measures it).
- **Risks:** posters go up and nobody scans. Mitigation: the poster carries the schedule itself, so it's useful even unscanned; `src=poster` tells us which posters work.
- **Cheapest prototype:** the print view + QR on the existing detail page.
- **Kill test:** a phone camera decodes the printed QR at 10 cm and opens the installed app on the right board (Android intent → WebAPK); ≥ 1 real scan-to-"I'm in" from a poster at the owner's gym within 14 days of hanging it.
- **Touches:** `share.js` (Q lane), `board.js`, a print stylesheet.

### I3. "I'm in" on a slot, and "Here now" at the door (NEW COMBINATION)
- **Mechanism:** one button per slot occurrence writes an `intents` row; the board shows names and belts under the slot. Door check-in calls `check_in()`, which the database refuses beyond 150 m and expires after 3 h; only the fact of the visit is stored, never coordinates.
- **Why here:** presence is the product's reason to exist, and one tap at the place you already are is the minimum possible attention cost. Geofencing in the database (PostGIS `st_distance`) makes "Visit verified" true instead of self-granted (QA B8).
- **Gain:** "who is on mats now" from 0 to real. Realtime free limits (200 connections, 100 msg/s) cover a closed beta with margin: a board is one channel, an "I'm in" is one message.
- **Risks:** GPS accuracy indoors is often 20-60 m; 150 m keeps false rejections rare while excluding the next street. Anonymous sign-in is capped at 30/hour/IP, which a whole gym on one Wi-Fi could hit on poster day. Mitigation: sign in once, persist the session; the cap is per new sign-in, not per tap.
- **Cheapest prototype:** the schema's `check_in()` called from a page with the phone's GPS.
- **Kill test:** a check-in from 5 km away is refused with a plain message; from 50 m accepted; a second tap within 3 h returns the same row (no duplicates); 40 concurrent "I'm in" taps from one IP all land (the anon cap applies to sign-in, not writes: verify).
- **Touches:** `board.js`, the schema (done).

### I4. The belt handshake and the training passport (NEW)
- **Mechanism:** after two people were checked in at the same gym within 3 h of each other, each can tap "Rolled with Mike, blue belt ✓". `attest_belt()` enforces co-location from the check-in rows. Three confirmations from three accounts mark the belt verified. The same rows give a passport: gyms where you were confirmed.
- **Why here:** no authority publishes belts; any athlete can spot a wrong belt in one round; the tap is natural after training. It converts presence (I3) into trust with zero extra data entry.
- **Gain:** verified rank from 0% to a majority of active members within a few sessions (estimate; kill test below). No documented app does peer belt attestation tied to geofenced co-presence, hence NEW.
- **Risks:** collusion (three friends). Mitigation: the three must be distinct accounts each with their own valid check-in, and the count is per belt value, so a contested belt never verifies. Rank inflation over time: a later, higher belt needs three fresh confirmations.
- **Cheapest prototype:** the schema function + one button on the board's "Here now" list.
- **Kill test:** with two accounts only, verified stays false; with three distinct co-located accounts it flips true; an attestation without a co-located check-in raises the function's error.
- **Touches:** `board.js`, profile card.

### I5. Own the venue data: a `gyms` cache fed by the app, with OSM as the seed (NEW COMBINATION)
- **Mechanism:** the first time anyone opens a venue, the app writes the OSM record into `gyms` (id, name, location, city). From then on, search hits Supabase first (PostGIS `open_mats_near()` / a nearby-gyms RPC) and Overpass only for areas nobody has opened. Members can mark "closed or wrong", which hides the venue after two reports and offers the OSM note link (notes need an OSM login, so the app can't file them itself).
- **Why here:** the Overpass fair-use bound (~100 queries/day for a regular app) means the current design fails at the first busy gym. Owning the cache turns each Overpass call into a one-time seed. It also fixes the "permanently closed" venue the S25 found.
- **Gain:** venue queries against OSM drop from 6 per open to ~0 for known areas; time-to-venues from 2.4 s to the Supabase round trip (~150-300 ms) plus render.
- **Risks:** stale copies. Mitigation: re-seed a venue from Overpass when its row is > 90 days old; show "last checked" (QA N43).
- **Cheapest prototype:** the `gyms` table (done) + a `gyms_near(lat,lng,km)` RPC + one line in `places-live.js` that tries it first.
- **Kill test:** on a city with 20 seeded venues, a warm open makes 0 Overpass/Nominatim requests and paints venues in < 400 ms at CPU 1x (baseline today: 2.44 s).
- **Touches:** `places-live.js` (lane C), the schema (+1 RPC).

### I6. Open-mat push, sent from the free tier (NEW COMBINATION)
- **Mechanism:** an athlete subscribes to a gym ("tell me when people are in"). When a slot reaches N "I'm in" taps, or someone checks in, an edge function sends a Web Push. VAPID signing with `@negrel/webpush` (MIT, SubtleCrypto-only, runs on Deno) inside a Supabase edge function, triggered by a database webhook on `intents`/`checkins`. Works on Chrome Android and on iOS 16.4+ once the app is on the Home Screen.
- **Why here:** the attention bound: the athlete decides in 10 s, so the app has to come to them at the right moment. Supabase's own example covers only FCM/Expo; the standard-Web-Push route is the one that costs nothing and needs no Google project.
- **Gain:** the only re-engagement channel available at $0. Estimate: a notification lands within seconds of the trigger (edge cold start + push service); the kill test measures it.
- **Risks:** notification fatigue. Mitigation: per-gym opt-in, one push per slot occurrence, quiet hours. iOS requires Home-Screen install (state it in the UI).
- **Cheapest prototype:** one edge function, one `push_subscriptions` table, one subscribe button.
- **Kill test:** a push arrives on an Android phone within 10 s of the third "I'm in"; unsubscribing stops it; the edge function's CPU time stays under the 2-s free limit (log it).
- **Touches:** new `supabase/functions/push/`, `sw.js` (push handler), a subscribe control on the board.

### I7. Ask Nyx "where can I roll tonight" (NEW COMBINATION)
- **Mechanism:** `open_mats_near(lat,lng,km)` (in the schema) is exposed as one read-only RPC. Nyx, the owner's on-device assistant, calls it through its local OpenAI-compatible socket and answers in words: "Gracie Barra at 7, 4 people in, 6 km." RollPhase plugs into Nyx, not the other way round (the owner's rule).
- **Why here:** the same table serves the board and the assistant; no second data model.
- **Gain:** a voice/text path to the single most-asked question, with zero new backend.
- **Risks:** location handling: Nyx passes rounded coordinates (3 decimals ≈ 100 m) and never stores them.
- **Cheapest prototype:** a curl to the RPC with the anon key.
- **Kill test:** the RPC returns today's slots sorted by distance in < 300 ms for a 25-km radius on the free plan; a Nyx tool call round-trips in < 2 s.
- **Touches:** a Nyx tool definition (in the Nyx repo, owner's other lane); nothing in RollPhase beyond the RPC.

### I8. Travel mode and drop-in fee (KNOWN, applied)
- **Mechanism:** city search → boards' next open mats + the drop-in fee a member typed. `gyms.dropin_fee` exists in the schema.
- **Why here:** travelling athletes are the most motivated visitors and the fee is their first question.
- **Gain:** turns the existing city search into a decision tool. Small effort.
- **Kill test:** searching a city with one seeded board shows its next open mat and fee in the list within 1 s.

### I9. Venues without a click: ship sport art at the right size (KNOWN, measured)
Not an invention, but the biggest measured performance win: 288/672-px WebP exports (baseline W3: −1,056 KiB, LCP −4.0 s estimated), plus removing the 2.2-s sleeps (W1) and the first-visit reload (W2). These stay in lanes F, C and B.

### Killed in reasoning (so they aren't re-proposed)
- **Scrape gym websites for schedules (the enrich server):** violates the "no laptop-only" rule, needs SSRF hardening, and websites rarely publish mat times in parseable form. Replaced by I1.
- **OSM Notes filed by the app:** the Notes API requires authentication; the app has no OSM identity. Replaced by a "report" row + a link to the note form for users with OSM accounts.
- **Offline city tile packs:** the OSM tile policy forbids pre-seeding areas. If offline maps are ever wanted, it's PMTiles on the app's own host, not OSM tiles.
- **Email magic-link as the front door:** 2 emails/hour on the free sender kills it. Anonymous-first, link an email later.
- **Firebase/FCM push:** needs a Google project and Firebase config; standard Web Push does the job with no account.
- **A Play Store listing now (TWA):** real and free (Bubblewrap/PWABuilder), but it multiplies the surface before the board exists. Staged for after I1-I3 pass.

## 5. Ranking and staging

| Rank | Invention | Owner-visible gain | Effort | Risk | Stage | Proof status |
|---|---|---|---|---|---|---|
| 1 | I1 Mat Board | Answers the core question; fixes sport relevance for fight sports | M | Low (schema written) | ship-now | promising-unproven (kill test runs on the free plan) |
| 2 | I3 I'm in + Here now | Presence, and honest "Visit verified" | S-M | Low | ship-now | proven pattern (Foursquare-style check-ins), new geofence-in-DB |
| 3 | I2 QR poster | The growth loop | S | Low | ship-now | promising-unproven (scan rate) |
| 4 | I5 Own venue cache | 2.4 s → <0.4 s, and survives the Overpass budget | S | Low | ship-now | proven (PostGIS nearby) |
| 5 | I9 W1/W2/W3 perf wins | Measured −4 s LCP class | S | Low | ship-now (existing lanes) | measured |
| 6 | I4 Belt handshake + passport | Trust; unique | M | Medium (collusion) | prototype-first | unproven |
| 7 | I6 Open-mat push | Re-engagement at $0 | M | Medium (fatigue, iOS install) | prototype-first | proven tech, unproven fit |
| 8 | I8 Travel mode | Small, real | S | Low | ship-now | known |
| 9 | I7 Nyx tool | One RPC | S | Low | wait-for-device (needs the Nyx lane) | known |

## 6. Dispatch briefs (launch order)

Owner's safety rules, verbatim, in every brief: *never touch a phone; never send anything to a real person or service from a lane; no mocks, no fake passes, no loosened assertions; every "works" claim needs a run with evidence; push only to your own branch; nothing to master.*

**M1 backend (needs `supabase login` from the owner first):** create project `rollphase-prod` (free), apply `supabase/migrations/20260927000000_mat_board.sql`, enable anonymous sign-in, add `gyms_near(lat,lng,km)` RPC, create `push_subscriptions` table, verify pg_cron runs on free (else GitHub Actions daily ping), run the RLS tests (user A cannot write user B's rows; anonymous can read boards; check_in refuses 5 km). Deliver the project URL + anon key into `prototype/config.public.js` (anon key only; never service_role).

**M2 board (Cursor lane, files: `prototype/board.js`, `prototype/supabase-client.js`, `prototype/board.css`, the `#screen-gym-detail` block in index.html):** the board page per DESIGN.md; timetable add/edit/confirm; "I'm in"; Here now via `check_in()`; share sheet + copy + QR + poster print view (uses lane Q's `share.js`/lean-qr); Realtime subscription per board; offline: last board cached in Cache Storage with a "last synced" line. Acceptance = the kill tests of I1, I2, I3 run in Chrome at 360x740 DPR 4 with two browser contexts.

**M3 trust (after M2 passes):** handshake button on Here now, passport on Profile, travel mode in city search, gear tags on slots. Acceptance = the I4 and I8 kill tests.

**M4 push (prototype):** edge function with `@negrel/webpush`, `push_subscriptions`, subscribe control, `sw.js` push handler. Acceptance = the I6 kill test on an Android phone (owner-run; no agent touches a phone).

The existing fix lanes (A1, B, C, D, F, G, K, Q, image lanes) run unchanged in parallel, except: lane H is replaced by M1; the Partners/Live/Feed parts of E and A3 are replaced by the board; the enrich server is deleted (lane A1 removes the call).

## 7. Scorecard (as of this report)
- Understanding: 100% (two QA passes, S25 walk, code read).
- Limits: 100% (table above).
- Research: 90%: every claim has a dated primary source; four unknowns are listed as unknown.
- Inventions: 9 proposed, 6 killed in reasoning, 9 staged.
- Built: the schema and the design (branch `mat-board`); 0% of the board UI; 0% of M1 (blocked on the owner's Supabase login).
- Verified by running: nothing yet. Every kill test above is still to run.

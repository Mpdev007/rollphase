# Mat Board playbook

For the implementing model (Sonnet 5). Read this whole file first, then `DESIGN.md`, then `INVENT-MAX-2026-09-27.md` section 4 (the kill tests). Do the steps in order. Every step ends with a check that you must **run**, not read. If a check fails, fix it before moving on. If you cannot make a check pass, stop and report exactly what failed and what you saw.

## 0. Rules (from the owner; not negotiable)

1. **No fake greens.** Never show "saved", "sent", "verified" or a count unless the database confirmed it. Never loosen a check to make it pass. A skipped check is reported as skipped.
2. **Prove by running.** "It works" means: you ran it in a real browser (Playwright, real Chrome, phone size) and have a screenshot or a log. A grep or a 200 status is not proof.
3. **Never touch a phone.** No adb, no device commands. Phone-size emulation only (360x740, device_scale_factor 4, touch, Chrome Android user agent).
4. **Never send anything to a real person or service** from a test. Feedback endpoints, mail and push are route-blocked in tests, and you inspect the request instead.
5. **Free tier only.** Never propose or enable a paid plan.
6. **Privacy:** never store raw coordinates for a person. Check-ins store the fact of a valid visit only. Share links carry no user data. Location is rounded to 3 decimals before any third-party request.
7. **Branch discipline:** work on `mat-board` (from `fix/base`). Push after every step. Never push to `master`, never run `scripts/ship.ps1`, never open a PR unless told.
8. **Secrets:** only the Supabase **anon** key goes into the app. The service_role key never appears in any file, log or commit. `config.js` stays gitignored; the anon key goes in `prototype/config.public.js` (committed; it is public by design).
9. **Files you own** are listed per step. Touch nothing else. If you need a change elsewhere, write it in your report as a request.
10. **Style:** vanilla JS like the rest of `prototype/` (no build step, no framework). Match app.js idioms: `$()`, `escapeHtml()`, `buzz()`, `state`, `switchTab()`. Every string from the database or the network goes through `escapeHtml()` before `innerHTML`.

## 1. What you are building (one paragraph)

`#/gym/<id>` becomes the **Mat Board**: one page per gym that anyone can read without an account. It shows this week's mat times (typed and corrected by members), who tapped "I'm in" under each slot, who checked in at the door in the last 3 hours, the venue facts the app already has, and a share sheet with a QR code and a printable poster. Rank gets verified by a peer handshake tied to co-located check-ins. The backend is Supabase (free plan) with the schema in `supabase/migrations/20260927000000_mat_board.sql`. Every count on the board is a real row.

## 2. Test harness (build this first, use it in every step)

Create `tests/matboard/` with:
- `harness.mjs`: Playwright (real Chrome, `channel: "chrome"`, headless), a helper that opens `http://127.0.0.1:8880/` at 360x740 / DPR 4 / touch / Android UA, grants geolocation to a fixed point (use the coordinates of the seeded test gym, see step 4), accepts the beta gate (`#betaAgree` then `#betaEnter`), and route-blocks `**/formsubmit.co/**`, `**/enrich`, `**127.0.0.1:8877**`, `**127.0.0.1:8878**`.
- One spec file per step (`s3-supabase.spec.mjs`, `s5-board.spec.mjs`, …). Each spec writes screenshots to `tests/matboard/out/<step>/`.
- `run.mjs` that runs all specs and prints PASS/FAIL per check and exits non-zero on any FAIL or any `pageerror`.
- Every spec listens to `page.on('pageerror')` and fails on any.

Serve the app for tests with `python -m http.server 8880 --bind 127.0.0.1` from `prototype/` (run it yourself in a background process; stop it at the end).

**Check 2:** `node tests/matboard/run.mjs` runs, opens the app, gets past the gate, and fails with a clear message if you insert `throw new Error("x")` at the top of `app.js` temporarily (then remove it). Screenshot of Home at `out/s2/home.png`.

## 3. Backend (files: `supabase/**`, `prototype/config.public.js`, `prototype/supabase-client.js`)

The owner runs `supabase login` and creates (or names) the project. You get the project ref, the URL and the **anon** key. If you do not have them, stop here and ask; do not invent placeholder keys that look real.

1. `supabase link --project-ref <ref>` from the repo root, then `supabase db push` to apply `supabase/migrations/20260927000000_mat_board.sql`. If the migration errors, fix the SQL (keep the intent) and record what changed.
2. In the dashboard (owner does clicks; you tell him which): Authentication → Sign In / Providers → **enable Anonymous sign-ins**. Nothing else.
3. Add `prototype/config.public.js`:
   ```js
   window.ROLLPHASE_PUBLIC = { supabaseUrl: "https://<ref>.supabase.co", supabaseAnonKey: "<anon key>" };
   ```
   and a `<script src="config.public.js">` tag before `supabase-client.js` (this one line in index.html is allowed).
4. `prototype/supabase-client.js`: load `https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js` (add the script tag; record the exact version the CDN served in your report), create the client, and expose:
   - `RP.db` (the client),
   - `RP.user()` → the current user, signing in anonymously on first call (`signInAnonymously()`), session persisted (the client's default localStorage),
   - `RP.ensureProfile(displayName, sport, belt)` → upserts `profiles` for the current user,
   - `RP.online` boolean (from `navigator.onLine` + a failed request flag).
   The anonymous sign-in limit is 30/hour/IP: sign in once, reuse the session, never sign in on every load.
5. **pg_cron on free:** after `db push`, run `select * from cron.job;` through `supabase db query` (or the SQL editor). If the two jobs exist and `cron.job_run_details` shows a run within 24 h, cron works on free. If it does not, add `.github/workflows/keepalive.yml`: a daily cron that does one `GET <url>/rest/v1/gyms?select=id&limit=1` with the anon key as `apikey`. Report which path you used.

**Check 3 (run these with the anon key against the live project; a small Node script under `tests/matboard/s3-supabase.spec.mjs`):**
- `select` on `gyms`, `slots`, `intents`, `profiles` as an anonymous user returns 200 (RLS read policies).
- Insert a `profiles` row as user A; try to update it as user B → **rejected**.
- Insert a `slots` row as A; update it as B → **allowed** (shared timetable).
- Insert an `intents` row as A; insert one for A's user_id as B → **rejected**.
- Call `check_in('<test gym>', <lat 5 km away>, <lng>)` → error mentions "150 m". Call it from ≤ 50 m → returns a row; call again → the **same** row id (no duplicate).
- Call `attest_belt(<B>, 'blue')` as A with no co-located check-ins → error. (Full handshake test is in step 8.)
- `gyms_near(lat, lng, 25)` returns the test gym with `km` < 1.
Print each result. All must pass.

## 4. Seed the first gym (files: `supabase/seed/first_gym.sql`)

The owner names his gym. Find it in the app's own search (its id is `osm-<type>-<id>` or `nom-<type>-<id>` from places-live.js) and insert one `gyms` row with that id, name, `st_setsrid(st_makepoint(lng, lat), 4326)::geography`, city. Do not invent a schedule: leave `slots` empty. Commit the seed file.

**Check 4:** `gyms_near()` around the gym returns it; opening the app at that location lists it.

## 5. The board page (files: `prototype/board.js`, `prototype/board.css`, the `#screen-gym-detail` block in `index.html` (lines 174-177 today), one `<link>` and one `<script>` tag)

Replace the inside of `#screen-gym-detail` with a host: keep `#gymBack`, keep `#gymDetailBody` for the venue facts app.js already renders, and add `<div id="matBoard"></div>` **above** `#gymDetailBody`. `board.js` renders into `#matBoard` when `openGymDetail(id)` runs (app.js:1674). Do not rewrite `openGymDetail`; hook it: at its end app.js sets `#gymDetailBody`; you add one call `window.MatBoard?.mount(g)` (this one line in app.js is allowed) where `g` is the venue object (`id`, `name`, `lat`, `lng`, `sports`, `address`, `city`).

`MatBoard.mount(g)`:
1. **Ensure the gym row exists** (`gyms` upsert by id from `g`; this is the I5 seed: any venue anyone opens becomes a row).
2. **Load** `board_slots` for this gym, `intents` for this week, `checkins` with `expires_at > now()`, and the `profiles` of everyone referenced (one query each; render as they land).
3. **Render** (mobile first, 360 wide, all text through `escapeHtml`):
   - Header: "This week at <name>" and a "Share" button (step 7).
   - The week grid: seven day rows, today first, each slot as a card: time, kind (Class / Open mat / Kids / Comp class), sport, gear chips, "confirmed by <name> · <n> days ago" (grey + "unconfirmed" if `confirmed_at` > 60 days), a **Confirm** link that updates `confirmed_by/at`, an **Edit** link, and the **I'm in** button with the count and the names + belts under it ("Mike (blue, self-declared)" until `belt_verified`).
   - Empty state when there are no slots: "No mat times yet. Know the schedule? Add the first one." with an **Add mat time** button. Never show fake slots.
   - **Here now**: names from live check-ins (last 3 h), or "Nobody has checked in yet."
   - **I'm here** button: calls `RP.db.rpc('check_in', {p_gym_id, p_lat, p_lng, p_slot_id})` with the phone's position (`getCurrentPosition({enableHighAccuracy:true, timeout:10000, maximumAge:0})`); on the 150 m error show the plain message; on success show "You're here until <time>". No optimistic UI: the button changes only after the row comes back.
   - **Add / Edit mat time** sheet: weekday, start time, duration, sport (from `SPORTS` in data.js), kind, gear chips, note. Writes `slots`. Requires a display name: if the profile has none, ask for it in the same sheet (first name only) and belt (optional), then `RP.ensureProfile`.
4. **Realtime**: subscribe to `postgres_changes` on `slots`, `intents`, `checkins` filtered by `gym_id` (intents via slot ids), and re-render the changed part. Unsubscribe when the screen leaves.
5. **Offline**: cache the last rendered board data in `localStorage` under `rollphase.board.<id>`; if a load fails, render it with a line "Showing the board from <time>; you're offline." Writes while offline are refused with a plain message (no queue in this step).
6. **Share button** is wired in step 7; until then it may be hidden.

Update the profile screen only to store `displayName`/`belt` in `profiles` when the user edits them (a request to lane A3 if you can't reach it; note it).

**Check 5 (`s5-board.spec.mjs`, two browser contexts A and B on the seeded gym):**
- A opens the board: empty state shows, no fake slots. Screenshot.
- A adds "Tue 19:00, 90 min, bjj, open-mat, gi". B's board shows it within **2 s** without reload. Screenshot both.
- B taps "I'm in": A sees "1 in · <B's name> (white, self-declared)" within 2 s. B taps again: A sees 0.
- B taps "Confirm" on A's slot: the "confirmed by" line changes to B.
- A taps "I'm here" from the gym's coordinates: "You're here until …" appears and B's Here-now shows A. From 5 km away (change the context's geolocation): the plain refusal message appears and nothing is shown as checked in.
- Kill the network (`context.set_offline(true)`), reload: the board renders from cache with the offline line. Screenshot.
- `pageerror` count is 0 across all of it. No sideways scroll at 360.

## 6. Search the app's own venues first (files: `prototype/places-live.js` only)

In `fetchNearby` (places-live.js), before any Overpass/Nominatim call: call `RP.db.rpc('gyms_near', {p_lat, p_lng, p_km: radius})` (coordinates rounded to 3 decimals). Render those immediately with the existing place shape (id, name, lat/lng, `mi`, `sports` from the board's slots if any, `boardSlots: slot_count`). Then call OSM only if the app-owned result count is < 5 **and** the area has not been queried in the last 7 days (keep a `localStorage` key `rollphase.osmArea.<geohash5>` with the timestamp). Remove the two `setTimeout(1100)` sleeps at places-live.js:395/408: Nominatim calls go through one queue that spaces requests ≥ 1,000 ms apart but does **not** block rendering of what already arrived. Keep the identifying `User-Agent`/Referer as the app already sets.

**Check 6 (`s6-search.spec.mjs`):** with the seeded gym and `page.route` logging all requests: a warm open of Home makes **0** requests to overpass/nominatim/photon when the area was queried < 7 days ago, and venues paint in < 400 ms after the page's own boot (measure with `performance.now()` around the first venue card). First open of a new area: venues from `gyms_near` appear before any OSM response arrives (log timestamps).

## 7. Share, QR and the poster (files: `prototype/share.js`, `prototype/toast.js`, `prototype/vendor/lean-qr/**`, `prototype/poster.css`)

1. Vendor `lean-qr` 2.7.4 (MIT): download `https://cdn.jsdelivr.net/npm/lean-qr@2.7.4/index.js` and the LICENSE into `prototype/vendor/lean-qr/`. Record the file hashes in your report.
2. `toast.js`: `RollToast.show(msg)`: a small, accessible (`role="status"`) toast at the bottom above the tab bar, 2.5 s. Replace the venue-share `alert()` in app.js (~line 1667) with it (this one call in app.js is allowed).
3. `share.js`: `RollShare.open({title, text, url})` opens a bottom sheet (`role="dialog"`, focus moved inside, Escape and Back close it) with: **Share…** (`navigator.share` when `navigator.canShare(data)`; hidden otherwise), **Copy link** (clipboard, then toast "Link copied"; on failure show the URL selectable), the **QR** (lean-qr `toCanvas`, ≥ 200 px, high contrast), **Save QR image** (canvas → PNG download), and **Print poster**.
4. The board's URL for a gym: `${location.origin}${location.pathname}#/gym/<id>?src=share` (poster uses `src=poster`). No user data in the URL.
5. **Poster**: `poster.css` is a `@media print` layout for the board page: gym name, "Scan to see who's in" + the QR at ≥ 60 mm, the week grid, "RollPhase" small at the bottom. "Print poster" calls `window.print()` after adding a `.poster` class to `body`.
6. `og:title`, `og:description`, `og:image` (a 1200x630 PNG in `assets/share/og.png`, make one from the logo) and `twitter:card` in `index.html` (`<head>` only).

**Check 7 (`s7-share.spec.mjs`):** the sheet opens as a dialog with focus inside; a `navigator.share` spy receives `{title, text, url}` with the board URL and no coordinates; with clipboard denied the URL is shown selectable; the QR canvas decodes to the board URL (decode it in the test with `jsQR` from jsdelivr, loaded in the test page only) at DPR 4 and at DPR 1; opening that URL in a **new** context lands on the board (after the gate); `window.print` is called by "Print poster" and the print stylesheet hides the tab bar and controls (emulate `media: print` and screenshot).

## 8. The handshake and the passport (files: `prototype/board.js`, `prototype/passport.js`, the Profile "Your sports" card host only via `window.Passport?.mount()` one-liner in app.js)

1. On Here now, next to each other person checked in within your window, a button "Rolled with <name> · confirm <belt>" → `RP.db.rpc('attest_belt', {p_subject, p_belt})`. Show the database's own error text on failure. When `profiles.belt_verified` flips, the name shows "(blue ✓ verified)".
2. `passport.js`: on Profile, a "Training passport" card: the gyms where you have valid check-ins (count and last date), and your belt with its status. Read-only. Empty state: "Check in at a gym to start your passport."

**Check 8 (`s8-trust.spec.mjs`, three contexts A, B, C all checked in at the gym within the window):** A attests B blue → B still "self-declared"; C attests B blue → still self-declared; a fourth context D that is **not** checked in attests → error shown; B's own attestation of B → error; then A, C and a checked-in E have attested → B shows "verified". A's passport lists the gym with 1 visit.

## 9. Travel mode and gear (files: `prototype/board.js`, `prototype/places-live.js` result rendering only through the `boardSlots` field, `data.js` gear list)

- In the venue list, a card with `boardSlots > 0` shows "Next open mat: <weekday time>" and the drop-in fee if set (from `gyms.dropin_fee`; editable on the board by any signed-in member, with the same "set by <name>" line).
- Slot gear chips render on the board and in the card's next-open-mat line ("gi").

**Check 9:** searching the seeded city shows the gym card with its next open mat and the fee; editing the fee on the board updates the card within 2 s.

## 10. Remove what the board replaces (files: `prototype/app.js` (only the listed lines), `index.html` Partners section)

- Delete the enrich call (`fetch("http://127.0.0.1:8877/enrich"…)`, app.js ~772-790) and the function around it. Hours now come from slots.
- Partners tab: replace its filters and empty text with one honest card: "Who's training is on each gym's board." + a button to Gyms. Remove the "All belts / My belt ±1 / ≤ 3 mi" pills.
- Feed › Live: show the user's own live check-in and, for saved gyms, their Here-now counts; otherwise the honest empty state.
- The check-in button in `openGymDetail` (`#checkInHere`, app.js ~1808) is removed; the board's "I'm here" replaces it. `ReviewSystem.recordVisit` is called only from a successful `check_in()` result.
- The "Visit verified" badge in reviews.js is shown only when a `checkins` row exists for that gym and user.

**Check 10:** a full walk (all five tabs, board, share sheet, settings, about) in the harness: 0 `pageerror`, 0 requests to `127.0.0.1:8877`/`8878`, Partners shows the honest card, the old check-in button is gone, and the smoke test from lane G (if present) passes.

## 11. Report

Write `docs/mat-board/REPORT.md`: per step, what changed (files), the check results with screenshot paths, anything skipped and why, anything you could not verify, the exact supabase-js version served by the CDN, the vendored lean-qr hashes, whether pg_cron worked on free, and a scorecard: % of checks passed (count them), % of steps done. Push `mat-board`. Do not merge. Do not ship.

## Appendix: the kill tests this playbook must satisfy (from INVENT-MAX section 4)
- I1: two profiles see each other's slot within 2 s; "I'm in" within 2 s.
- I2: the printed QR decodes to the board URL and opens the app on that board.
- I3: 5 km refused, 50 m accepted, no duplicate rows, 40 concurrent "I'm in" from one IP all land.
- I4: two attesters → not verified; three distinct co-located → verified; non-co-located → error.
- I5: warm open → 0 OSM requests, venues < 400 ms.
- I8: city search shows next open mat + fee.

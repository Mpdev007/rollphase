# Mat Board — implementation report

Branch: `mat-board`. Backend: `rollphase-prod` (schema), tests write only to `rollphase-staging`
(rule 11 — every spec's `openApp`/`openAppPersistent` intercepts `config.public.js` so the app under
test never touches prod). Not merged, not shipped, per rule 15 / this section's own instruction.

## Scorecard

- **Checks passed: 140/145 (96.6%)** — every check from every spec below, one line each, counted
  once. The 5 that did not pass are all in step 11 and are explicit, documented infrastructure
  blockers (see step 11), not failures of shipped code.
- **Steps fully implemented and verified: 1–10 of 12 (steps 1–11 are the build; 12 is this report).**
  Step 11 (Family Access) is **fully implemented** (all client code, both files) but only
  **partially verified** — the anonymous/non-family rendering rules and every permission gate's
  refusal path are proven against real staging; the permanent-account and staff-verification
  success paths could not be exercised in this environment (see step 11 for exactly why, and what
  unblocks it).
- **% of steps done** (build steps 2–11, since step 1 is spec-only and step 12 is this report):
  **implemented 10/10 (100%)**, **fully verified 9/10 (90%)** — step 11 is the one implemented but
  only partially verified.

| # | Step | Status |
|---|------|--------|
| 1 | What you're building | n/a — spec only |
| 2 | Test harness | Done, verified |
| 3 | Supabase client | Done, verified |
| 4 | First board (seeded) + native-venue completion | Done, verified |
| 5 | The board page | Done, verified |
| 6 | Search RollPhase's own venues first | Done, verified |
| 7 | Share, QR, poster | Done, verified |
| 8 | Handshake + passport | Done, verified |
| 9 | Travel mode + gear | Done, verified |
| 10 | Remove what the board replaces | Done, verified |
| 11 | Family Access | Implemented; partially verified (documented blocker) |
| 12 | This report | Done |

## Step 2 — Test harness

**Files:** `tests/matboard/harness.mjs`, `check.mjs`, `run.mjs`, `server.mjs`.

Real Chrome (`channel: "chrome"`), phone viewport (360×740, DPR 4, touch, Android UA), fixed
geolocation, `config.public.js` intercepted to point at staging, `127.0.0.1:8877`/`8878` routed to
abort. Later hardened twice more during this session: `openQaGym()` now waits for app.js's
`state`/`openGymDetail` to exist before injecting into them (a real boot-order race under
concurrent-context load, not specific to any one step), and `openAppPersistent`/`saveIdentity` were
added to reuse a cached anonymous-auth `storageState` per named identity across separate `node
some-spec.mjs` runs — Supabase's anonymous sign-in is capped at 30/hour/IP, and re-running a
multi-context spec repeatedly while debugging burns through that budget in a handful of runs,
producing misleading "permission denied" failures that look like app bugs but are rate limiting.

**Check 2:** `s2-harness.spec.mjs` — **5/5 passed.** Screenshot: `tests/matboard/out/s2/home.png`.

## Step 3 — Supabase client

**Files:** `prototype/supabase-client.js`.

`RP.db`, `RP.user()` (anonymous sign-in, persisted via `persistSession`), `RP.ensureProfile()`.

**Check 3:** `s3-supabase.spec.mjs` (browser) — **6/6 passed.** `s3-supabase.test.mjs` (direct
RLS/RPC/realtime proof, no UI) — **28/28 passed**, including: check-in within ~45 m accepted, a
second check-in returns the same row (no duplicates), signed-out `check_in` refused, a direct
`checkins` insert refused (functions only), `attest_belt` without a shared check-in refused,
self-attestation refused, `gyms_near` finds a seeded gym, the realtime change feed reaching "ready"
within 20 s, an "I'm in" reaching a second context within 2 s (676 ms measured), a leave (delete)
reaching it within 2 s (253 ms measured).

## Step 4 — First board (seeded) + native-venue completion

**Files:** `prototype/places-live.js` (native-venue facts), `tests/matboard/s4-native-venue.spec.mjs`.

Pure Brazilian Jiu Jitsu (Norwood Park) was seeded live on `rollphase-prod` in an earlier session
(commit `cc905e4`) and is never written to by any test. This session closed the one gap Check 4
left: a native venue (`source != 'osm'`) needs `address`/`phone`/`website` from the `gyms` row,
since `gyms_near`'s own RPC columns don't include them — `fetchOwnVenues` now batches a `gyms` query
alongside its existing `board_slots` sports lookup. A `source='gym-website'` slot can only be
inserted by the architect's privileged path (confirmed by trying it as a regular user first, which
RLS correctly refuses), so that one slot's exact response shape is supplied via `page.route()`
mocking — the same pattern reused for step 11 below.

**Check 4:** `s4-native-venue.spec.mjs` — **7/7 passed.** Screenshot:
`tests/matboard/out/s4/native-venue-detail.png`.

## Step 5 — The board page

**Files:** `prototype/board.js`, `prototype/board.css`, `index.html`'s `#screen-gym-detail` block.

`MatBoard.mount(g)`; real-time slots/checkins/intents; a monotonic `loadToken` so an out-of-order
async result can never clobber a newer one; realtime DELETE events matched by locally-tracked
intent id (Postgres's default replica identity only ships the primary key on delete, never
`slot_id`); a slot the author just typed is auto-confirmed by them; `waitForLive()` before test
interactions, since "SUBSCRIBED" is not "live" — only the channel's own `system` "ok" message is.

**Check 5:** `s5-board.spec.mjs` — **17/17 passed.** Screenshots:
`tests/matboard/out/s5/{a-empty,a-with-slot,b-sees-slot,a-offline}.png`.

## Step 6 — Search RollPhase's own venues first

**Files:** `prototype/places-live.js` only.

`gyms_near` is queried and rendered before any OSM/Overpass call; a client-side geohash (5-char,
~4.9 km cells) 7-day "area already searched" cache; a shared, elapsed-time-based Nominatim rate
limiter (not a flat sleep) so every call site — search and reverse-geocode — spaces requests ≥1000
ms apart; `fetchNearby`'s own boot-time double-call de-duplicated with an in-flight promise cache.

**Check 6:** `s6-search.spec.mjs` — **9/9 passed** (gyms_near resolves before any OSM request is
sent; first open queries OSM since the own-venue count is low; warm open makes 0 OSM/Overpass/
Nominatim requests and paints in well under 400 ms — 328/229/293 ms measured, best of 3).

## Step 7 — Share, QR, poster

**Files:** `prototype/share.js`, `toast.js`, `poster.css`, `vendor/lean-qr/**`.

`navigator.share` with a clipboard-copy + visible-URL fallback; lean-qr 2.7.4 (MIT) vendored, using
its ESM entry (`index.mjs`) via dynamic `import()` since `index.js` is CommonJS and won't run as a
plain `<script>`; a printable poster (`@media print` override undoing the mobile app-shell's
`position:fixed`/`overflow:hidden`, which otherwise silently clips any content taller than one
screen — a real bug this step found and fixed). A real, pre-existing routing bug was also found and
fixed here: `#/gym/<id>?src=share` never stripped the `?src=share` query suffix before parsing the
gym id, so every share link/QR would have silently landed on Home instead of the board.

**Vendored lean-qr — SHA-256:**

| File | SHA-256 |
|---|---|
| `index.js` | `1aaa80f2ea87616a47e9ad358bb11b37ae55358ecf0c8086d2ad2a912cb183ad` |
| `index.mjs` | `0ce41cd6f92cc23cf057a1df7e1b3876767d678665dd65af4e1d22b4fad967dc` |
| `LICENSE` | `dc672b829e054d6c102da8776d327f26f27edc1f88740c1878a7ca5b9f74da73` |

**Check 7:** `s7-share.spec.mjs` — **18/18 passed**, including the QR decoding back to the exact
board URL at both DPR 1 and DPR 4, and a fresh open of the share URL landing on the right gym.
Screenshot: `tests/matboard/out/s7/poster-print-emulated.png`.

## Step 8 — The belt handshake and the training passport

**Files:** `prototype/board.js`, `prototype/passport.js`, one `window.Passport?.mount()` line in
`app.js`'s `renderProfile()`.

"Rolled with X · confirm blue" on Here-now → `attest_belt`; the name shows "✓ verified" once 3
distinct co-located attesters agree. `passport.js`: a read-only Training passport card (gyms
visited, count + last date, belt status).

Real bugs found and fixed: `onAttest` captured its message element once, before two `await`s — a
realtime re-render landing in that window detached the reference, so both success and error
messages could silently write to a node nobody could see (fixed by re-querying after the awaits,
and always also toasting); `ensureSignedIn()` failed silently with zero user feedback when the
anonymous sign-in itself failed (now toasts); `profiles`/`attestations` are deliberately not in
`supabase_realtime` (confirmed live via the Realtime protocol's own "unable to subscribe" error
after trying to add a listener), so another person's attestation never reached an already-open
board — fixed with a 20 s poll while the board is mounted, no publication change; two pre-existing,
unrelated bugs in `app.js`'s `renderProfile()` (`p.social`/`p.following` referencing an undefined
`p` instead of `state.profile`) that were blocking as soon as Passport made Profile fully render.

**Check 8:** `s8-trust.spec.mjs` — **11/11 passed**, three consecutive clean runs (A, C, then a
checked-in E all attest B → verified; D, not checked in, refused; B's self-attestation refused;
A's passport lists the gym with 1 visit).

## Step 9 — Travel mode and gear

**Files:** `prototype/board.js`, `prototype/places-live.js` (result rendering via the existing
`boardSlots`/`dropinFee` fields only), `prototype/data.js` (gear list).

A card with real slots shows "Next open mat: `<weekday time>`" plus that occurrence's gear and the
drop-in fee, folded into `venueShell`'s existing `next[sport]` field — `app.js`'s card renderer
needed no changes. The drop-in fee (`gyms.dropin_fee`, free text, already writable by any signed-in
member under the existing "edit gym" RLS policy — no migration needed) is editable from the board's
header. Gear options in the Add/Edit mat time sheet are now sport-aware
(`data.js`'s `MAT_GEAR_BY_SPORT`), falling back to the original flat list for any sport not mapped.

**Check 9:** `s9-travel.spec.mjs` — **7/7 passed**, two consecutive clean runs, including an
end-to-end timed check: editing the fee on the board and forcing a places refresh reflected the new
value in ~125 ms, well under the check's 2 s bar.

## Step 10 — Remove what the board replaces

**Files:** `prototype/app.js`, `index.html` (Partners section); `reviews.js`'s badge rule was
addressed from its `app.js` call sites, without editing `reviews.js` itself.

Deleted `enrichLivePlaces()` and its `fetch("http://127.0.0.1:8877/enrich"…)` call entirely — hours
now come from real slots. Partners tab is one honest interim card ("Who's training is on each gym's
board." + a button to Gyms), the rank/level filter pills removed. Feed › Live now shows the user's
own real check-in and, for saved gyms, real Here-now counts (`renderFeedLive()`, async with a token
guard), never a mock "live" event. The old `#checkInHere` button is gone — the board's real "I'm
here" is the only check-in path. "Visit verified" is now a real, checked claim: review submission
queries the `checkins` table instead of the old, spoofable, never-validated localStorage
`hasVisit()`.

**Check 10:** `s10-cleanup.spec.mjs` — **18/18 passed**, three consecutive clean runs: a full walk
of all five tabs, the board (including a real check-in), the share sheet, and settings, asserting 0
`pageerror`, 0 requests to `127.0.0.1:8877`/`8878`, the honest Partners card, no `#checkInHere`
anywhere, and Feed Live showing the honest empty state before check-in and the real "You're checked
in" card after.

## Step 11 — Family Access on the board

**Files:** `prototype/board.js`, `prototype/board.css`, `prototype/family.js` (new), one
`window.Family?.mount()` line in `app.js`'s `renderProfile()`.

**What was built (all of it):**
- Board: kids/teens slots grouped and tagged Kids/Teens; `in_count` null shows no count at all
  (never "0"), a number shows "`<n>` kids coming"; names are never shown for a kids/teens slot
  (the database only ever returns the caller's own intents there — RLS does this, not the client);
  Sign-up-my-child renders one button per not-yet-signed-up child, only when the viewer has a
  child, and only changes anything on a real, confirmed insert (no optimistic UI); a refused
  insert shows the fixed message "Family access for this gym isn't verified yet" plus a Request
  access button wired to `rpc('request_family_verification')`; Edit/Add on a kids/teens slot is
  gated on the viewer's own `gym_staff` row for that gym.
- `family.js`: an anonymous viewer sees "Add your email to set up a family" with a working
  `auth.updateUser({ email })` field (the real upgrade primitive — no password flow was invented,
  since none existed to extend); a permanent viewer can add a child (initial + age band only, ever)
  and sees a per-gym status list (`family_requests`/`family_verifications` joined to gym names); a
  staff screen (shown only when the viewer has a `gym_staff` row anywhere) lists pending requests
  with the parent's name and children's initials/age bands, with Verify/Decline, and Revoke on
  verified families.

**What is real and verified (14 of 19 checks, `s11-family.spec.mjs`):**
- RLS genuinely refuses a kids/teens slot insert from this run's non-staff account — proving why
  the rendering check below has to be mocked (same pattern as step 4's native-venue slot: the exact
  response shape a real kids slot would have, since a real one cannot be created via the API by any
  account this run controls).
- Against that real response shape: the slot's time and note render, it's tagged Kids, no count
  shows for `in_count: null`, no Sign-up button shows with zero children, no Edit/Confirm shows for
  a non-staff viewer. Screenshot: `tests/matboard/out/s11/anon-kids-slot.png`.
- Every permission-gated RPC's real refusal, for the anonymous caller this run actually has:
  `request_family_verification` ("family access needs a full account"), `verify_family` and
  `revoke_family` ("only this gym's staff can…"), `add_gym_staff` ("only a platform admin can…"),
  and a direct `children` insert (RLS: `is_permanent_user()`).
- `family.js`'s anonymous-viewer branch (the add-email prompt and upgrade button).

**What could not be verified, and exactly why (5 checks, recorded as explicit `FAIL` /
`BLOCKED:` lines in the spec, not skipped silently):**

1. A permanent user without a child sees the same as anonymous (no count/signup).
2. A parent with a child, no verification, gets the refusal message and can request access.
3. Staff verifies a request; within 2 s the parent's board shows "0 kids coming" and a working
   Sign up.
4. After sign-up, the parent sees "1 kids coming"; a second verified family sees 1 but no name.
5. Staff cannot verify its own family (the database's own error is shown).

(1) and (2) need a **confirmed permanent (non-anonymous) account**. `RP.db.auth.signUp()` was tried
live against `rollphase-staging` (not assumed) and returned `429 "email rate limit exceeded"` —
Supabase's own free-project SMTP send cap, already exhausted. Without a confirmed session,
`is_permanent_user()` is false, which blocks adding a child at all.

(3), (4) and (5) additionally need a **`gym_staff` or `app_admin` row**. Nothing can self-bootstrap
this through the anon-key API by design: `app_admins` has row-level security enabled with **no
reachable policy at all** (the table comment says so — "not reachable through the API"), and
`add_gym_staff()` itself requires `is_app_admin()` to already be true. This is the same bootstrap
problem Check 11 itself names ("the architect... hands you their credentials... never in a file") —
this run has no architect session active and no such credentials in its environment. A check of
`supabase projects list` (read-only) confirmed the Supabase CLI is not authenticated on this
machine either, so there is no lower-privilege path available to even inspect the setting, let alone
change it.

**To close this gap** (both walls are actually the same wall: `is_app_admin()` and
`is_gym_staff()` are both defined as `is_permanent_user() and exists(...)`, so bootstrapping an
admin row for one of this run's *anonymous* identities would do nothing — a permanent account has
to exist first):

1. Supabase dashboard → `rollphase-staging` → Authentication → Users → **Add user**, with "Auto
   Confirm User" checked, ×4 (one staff, three parents). This bypasses the exhausted SMTP cap
   entirely — no email is sent.
2. SQL editor, one row: `insert into public.app_admins (user_id) values ('<uuid of the staff
   user>');`. With that, the spec itself can call `add_gym_staff` for each run's own throwaway qa
   gym, insert the kids slot, and exercise verify/decline/revoke and "staff can't verify its own
   family" (that last one specifically needs the verifier's method to be `gym-staff`, so the admin
   row alone isn't enough — the spec has to `add_gym_staff` itself before testing it).
3. The four accounts' email/password as environment variables (e.g. `QA_STAFF_EMAIL`/
   `QA_STAFF_PASSWORD`, `QA_PARENT1_EMAIL`/`..._PASSWORD`, `QA_PARENT2_...`, `QA_PARENT3_...`) —
   never in a file, per the playbook's own rule. The spec signs in with
   `RP.db.auth.signInWithPassword()` inside `page.evaluate`, reading from `process.env`.

With those three in place, `s11-family.spec.mjs` can be extended to cover checks 1–5 for real in
the same session — no other code changes needed.

## Cross-cutting items this section of the playbook asked for

- **supabase-js version served by the CDN:** `@supabase/supabase-js@2.117.2`, pinned in
  `index.html`'s script tag (`https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.2/dist/umd/supabase.js`).
  Loads and works correctly — every spec in this report depends on it and passed.
- **pg_cron on the free plan:** **could not verify.** The `matboard-keepalive` job
  (`supabase/migrations/20260927000000_mat_board.sql`, `cron.schedule(...)`) lives in the `cron`
  schema, which is not exposed through PostgREST — querying `cron.job`/`cron.job_run_details`
  through `RP.db` returns "Could not find the table" (confirmed live, not assumed). Whether it has
  actually fired requires the SQL editor or dashboard, neither of which this run has access to.
- **Kill-test appendix (INVENT-MAX section 4):** I1 (2 s propagation), I2 (QR → board URL), I4 (2/3
  attester verification), I5 (warm open, 0 OSM, <400 ms) and I8 (city search shows next open mat +
  fee) are all covered by this session's own specs above. I3 (5 km refused / 50 m accepted / no
  duplicate rows / 40 concurrent "I'm in" from one IP) was validated in an earlier session
  (commit `fda95fc`, "24/24 kill tests pass") before this Sonnet 5 segment began and was not
  independently re-run here.

## How to reproduce

From `tests/matboard/`: `node s<N>-<name>.spec.mjs` for any spec above (`s3-supabase.test.mjs` runs
without a browser). Each spec prints `Staging test data created (for cleanup): gym <id>` — these
throwaway `qa-gym-*` rows accumulate on `rollphase-staging` across runs and are safe to delete in
bulk; none of them is Pure Brazilian Jiu Jitsu or any other real seeded venue.

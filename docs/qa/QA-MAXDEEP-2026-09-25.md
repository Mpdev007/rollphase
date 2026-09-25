# RollPhase: max-deep QA, 2026-09-25

**Build tested:** version 0.6.6, buildId `20260924-1309-88d9bc5`. I tested it in two places:
- the local copy at http://127.0.0.1:8880/
- the public beta at https://mpdev007.github.io/rollphase-beta/

The public beta is byte-for-byte identical to git `master` 811929c. The local copy differs only by the uncommitted "Your Muse" card.

**How it was tested:** six QA passes:
1. Functional
2. Maps and live data
3. Links and deploy
4. Code and fakes
5. Visual
6. Icon packs

In each pass a finder reported problems and a separate verifier re-ran every claim in real Chrome (Playwright, 390x844 at DPR 1, Austin geolocation, plus the location-denied path). This report keeps only two kinds of finding: those the verifier confirmed, and the problems the verifiers found that the finders had missed. Nothing under `the project checkouts` was changed.

**Ids:** every row has a new id: **B** = blocker, **M** = major, **N** = minor. The original ids from the six passes are in brackets. The functional verifier's own missed items were also called M01-M03, so here they are written F-M01, F-M02 and F-M03 to avoid clashing with this report's M rows. When several passes found the same defect it is one row. The row takes the highest severity any verifier gave, and the row says when verifiers disagreed.

**Evidence paths** are relative to `<QA>` = `_audits/rollphase-qa-2026-09-25/qa (local evidence archive, not in the repo)/`. Code references are `file:line` inside `projects/rollphase/prototype/`.

**Plain-language key**
- **Blocker:** not production-ready until fixed.
- **Major:** a real function is broken, fake or missing.
- **Minor:** a rough edge.
- **Fake green:** the screen says something worked when it didn't.
- **Service worker (SW):** `sw.js`, the script that caches the app so it opens offline.
- **OSM:** OpenStreetMap. **Nominatim**, **Photon** and **Overpass** are the free OSM search services the app asks for venues.
- **CDN / edge cache:** the copy servers GitHub Pages puts in front of the site.
- **PWA:** the installable-web-app form of the site.
- **Hash route:** the part of the URL after `#` (for example `#/profile`) that tells the app which screen to open.
- **DPR 1:** a normal-density screen, which is how you judge blur.
- **Row-level security (RLS):** database rules that stop one user reading another user's private rows.
- **Web Push / VAPID:** the browser's standard way to deliver notifications; VAPID is the key pair that signs them.
- **Worker / OffscreenCanvas:** a background thread that can draw images, so recolouring icons doesn't freeze the screen.
- **SDF sidecar:** a small precomputed "distance to the edge" image shipped next to an icon, so the phone doesn't have to calculate it.

---

## 1. Scorecard

**How it's scored:** each area is a checklist of user-facing checks (listed in Appendix A). Each check scores 1 if it works, 0.5 if it partly works, and 0 if it's broken or missing.

| Area | Working | Checks | Why |
|---|---|---|---|
| Functional | **36%** | 12.5 of 35 | The sport picker, 22 skins, city search, text size and About work. But Profile crashes, edits don't save, feedback, reviews, follow, privacy and notifications are fake or missing, and Partners, Feed and Gear have no data. |
| Maps + live data | **45%** | 9 of 20 | The OSM map, tiles and venues are real on local and public. But results ignore the sport, the map covers the tab bar, Open now and Maps links are unreliable, and each open fires 2-4 duplicate searches. |
| Links | **50%** | 6 of 12 | All 25 outside URLs load and the phone/Go links are right. But the share link opens Home, the map credit is hidden, some Maps links hit the wrong branch, and "events in Austin" isn't Austin. |
| Deploy pipeline | **41%** | 7 of 17 | Public = master and no secrets leak. But publishing is done by hand, a second host (Render) is frozen at 0.5.0, Chrome can't install the app, and the 20-45 s update promise can't hold on Pages (10-minute cache). |
| Code quality | **29%** | 4 of 14 | There are no seeded fake listings and the update loop works. But a main tab crashes, state doesn't save, searches race each other, storage is unguarded, and the smoke test passes on a crashing build. |
| Visual | **36%** | 6.5 of 18 | The 22 skins are consistent and nothing scrolls sideways. But the tab bar is hidden on the map, there are three unrelated icon styles, overlays ignore the skin, a dev chrome band sits on every screen, and cards are cluttered. |
| Icon packs | **17%** | 2 of 12 | Five packs have tab art and masks (5 of 29 slots each). There is no sport, Explore or pin art, nothing is wired into the app, and nothing is deployed. |
| **Overall** | **36%** | 47 of 128 | This is the mean of the seven areas (36.3%). The share of all checks passed is almost the same (36.7%). |

**Finding counts after merging:** 9 blockers, 40 majors, 42 minors (91 rows).
- The merged rows come from 163 source items: 136 verifier-confirmed findings plus 27 verifier "missed" items.
- None was refuted. Four had no verdict (see the end of section 2).

---

## 2. Findings

### 2a. Blockers (9)

| ID | What's wrong | What the user sees | Evidence | Fix |
|---|---|---|---|---|
| **B1** (F01, LD-01, CR-01, MAPS-V01, V3) | `renderProfile` reads `p.social` and `p.following`, but it never declares `p` (only `paintProfileHero` does). Opening Profile throws an error. Booting on `#/profile`, `#/profile/feedback` or `#/profile/about` shows a full-screen "RollPhase failed to start – p is not defined". That overlay covers the "Refresh app" button it tells you to use. Every refresh path keeps the `#/profile` hash, so the app crashes again, and no venues load behind it. The throw also skips `renderGear`, the app-height fix and the scroll reset. | Social shows 0 of 6 fields and Following is blank, so Unfollow can't be reached. After any reload while on Profile the app is bricked until you edit the URL by hand. The public beta does the same. | app.js:2546, 2597, 2779, 2792, 3383-3392; update-check.js:100-103. `functional-verify/logs/v1_F01.json`, `functional-verify/shots/F01_reload_on_profile.png`, `links-deploy-verify/live-run_b.json`, `links-deploy-verify/live-B-crash-profile.png`, `code-fakes-verify/v06-deployed-fresh-profile-link.png`, `maps-live-data-verify/V9-profile-boot/` | Add `const p = state.profile;` at the top of `renderProfile`. In `boot()`, wrap the first tab render and fall back to `#/home` so venues still load. Make `hardReload` drop the hash, and give the fatal overlay its own Reload link. (The V3 verifier rated this major; the other four rated it blocker.) |
| **B2** (F04, MAPS-03, MAPS-04, V1, IP-03, F22, part of V18) | `#screen-gyms.is-map .gym-stage { height: min(62vh, 520px) }` ends at about y=882 on an 844-px screen. The venue sheet (z-index 500) paints over the tab bar (z-index 40). Focusing a pin scrolls the screen 37 px and eats the first tap. The map credit ("Leaflet \| © OpenStreetMap") sits below the fold at y=863, and its links replace the app when tapped. | On Gyms, the default Map view, there is no tab bar at 360, 375, 390 and 393 px widths (it works at 412 and 430). Tapping where Home or Profile should be opens a gym. The Gyms spot opens Google Maps directions. Pins need two taps. The OSM credit that the tile policy requires is never visible. The public beta does the same. | skins.css:725-742, 2334-2345. `functional-verify/logs/v3_map.json`, `maps-live-data-verify/V1-base/02-gyms-map-dpr1.png`, `maps-live-data-verify/V2-map/touch-after-tap1.png`, `visual-verify/v1_local.json`, `visual-verify/shots/v1/local-gyms-map-390x844.png`, `icon-inventory-verify/v_tabcover.json` | Size the stage to the space left above the tab bar: `calc(var(--app-height) - header - controls - var(--tab-bar-height))`. Keep the tab bar above the sheet. Set `keyboard:false` on the map and the markers. Give the attribution links `target=_blank rel=noopener`. (MAPS-04 and IP-03 were rated major, F22 major, V18 minor.) |
| **B3** (F02, LD-02, CR-06, V2) | At boot the gate compares the stored acceptance to `BETA.version`, which is '0.4.0-beta'. About 0.5-4.5 s after load, `update-check.js:180` overwrites that value with '0.6.6'. Anyone who reads the terms for more than a second or two therefore stores '0.6.6', which never matches again. On a first visit, the service worker's self-reload can bring the gate straight back. | The full disclaimer on every open, reload, "Refresh app" and update "Restart", with its required checkbox hidden at the bottom of an inner scroll (N31). | beta.js:6, 18, 29; update-check.js:176-181, 385-389. `functional-verify/logs/v2_gate_timing.json`, `functional-verify/shots/v2_human_4s_reopen.png`, `links-deploy-verify/live-run_a.json`, `visual-verify/v2_public.json` | Give the acceptance its own `TERMS_VERSION` constant and never change it from version.json. Keep the build number in `window.ROLLPHASE_BUILD`. (The F02 verifier rated this blocker; LD-02, CR-06 and V2 rated it major. I kept blocker because every real tester hits it on every launch.) |
| **B4** (F03, CR-16) | `scheduleSave()` only runs from `safeRenderAll` and the age toggle. These edits change memory only and are never saved: name and area, photo, the represent studio, Save place, Follow, notification prefs, privacy, open-to-train and social fields. Switching tabs doesn't save either, and nothing saves on close. | Save place shows "✓ Saved place", yet after a reload nothing is saved. A typed name is gone. Edits only survive if some unrelated action happens first (tapping a sport, venues finishing loading), which is why it sometimes looks like it works. | app.js:586, 3306, 2627-2639, 1815-1826, 2145-2172, 2519-2521, 2784-2786. `functional-verify/logs/v1_F03.json`, `functional-verify/shots/F03_B_tab_home_then_reload.png`, `code-fakes-verify/v13-result.json`, `functional/logs/s13_persistence.json` | Route every change through one state setter that calls `scheduleSave()`, and flush `savePersisted()` on `pagehide` and `visibilitychange`. |
| **B5** (F06, CR-04) | `setDemoMode` replaces `state.profile` with an empty or sample profile and saves it. | "Just exploring" turns the name into "Guest", saved places into 0 and added sports into nothing. "My sports" then brings back the fake sample (Blue belt…). Both changes are permanent. | app.js:563-575, 586, 3188-3192. `functional-verify/shots/v4_F06_guest.png`, `functional-verify/shots/v4_F06_athlete_again.png`, `code-fakes-verify/v03-result.json` | Make browse mode a view flag (`state.mode`, saved with settings) that never touches `state.profile`. |
| **B6** (F06, CR-05, VV-M1, IP-16, MAPS-20) | `PROFILE_DEFAULT` seeds BJJ "Blue belt", Pickleball "DUPR 3.5", Yoga "Vinyasa", Boxing "Novice" and HYROX "Open", with BJJ as primary. It is written to storage before the gate is even accepted. | A brand-new user sees "Your sports: BJJ · Pickleball · Yoga · Boxing · HYROX" with ranks they never entered. They also get the BJJ skin, a BJJ map search and "Built around BJJ (first choice)" in Feed. | data.js:425-437; app.js:20, 3339-3340. `functional-verify/shots/v4_F06_fresh_home.png`, `code-fakes-verify/v01-result.json`, `icon-inventory-verify/shots/public-home-dpr1.png` | Start from `emptyProfile()` and add a first-run step to pick sports and levels. Migrate stored profiles that exactly equal the seed. (Rated blocker via F06; CR-05, VV-M1 and IP-16 rated it major, MAPS-20 minor. Your bar bans sample data posing as real.) |
| **B7** (F05, CR-02, LD-03, V10) | `feedbackEmail` is `''`, so FormSubmit is skipped and the app opens `mailto:?subject=…` with no recipient. The status reads "Opening your email… thank you!" and the sheet closes after 1.6 s regardless. The only copy is this device's localStorage. The clipboard fallback fails with an unhandled "Write permission denied". | A thank-you message. At best a mail draft with an empty To: field; on a phone with no mail app, nothing at all. The team never receives it. | beta.js:8, 245, 264-277. `functional-verify/shots/v4_F05_after_submit.png`, `links-deploy-verify/live-A4-feedback-sent.png`, `code-fakes-verify/v02-feedback-status.png`, `visual-verify/shots/v10/feedback-after-send.png` | POST to a real endpoint (a Supabase table or function, see M01) and show success only on a 2xx reply. Queue the report offline and retry. If mailto stays as a fallback, fill in the To: field. Add `.catch()` to the clipboard call, and close the sheet through `betaCloseOverlay` so history pops. (F05 and CR-02 were rated blocker; LD-03 and V10 major.) |
| **B8** (CR-03, F09, MAPS-06) | Reviews and visits are stored in localStorage only, yet the screens say "Post to RollPhase", "From athletes on RollPhase" and "athlete reviews". Check-in writes a *verified* visit with no location check. The rating form comes pre-filled (5 overall, 4 for everything else). One check-in plus check-out writes 2 visit rows. The share blurb advertises this device-only score. | "★★★★★ 5 · 1 athlete reviews" and a "Visit verified" badge on a venue 980 miles away (even a shuffleboard bar), from one tap and no input. Nobody else ever sees the review. | reviews.js:53-55, 62-67, 79; app.js:1396, 1570, 1608, 1611, 1664, 1702, 1808-1814. `code-fakes-verify/v13-self-verified.png`, `maps-live-data-verify/V5-checkin/05-remote-verified.png`, `functional-verify/shots/v5_F09_review_posted.png` | Store reviews and visits in the backend (M01). Show "Visit verified" only when GPS was within about 150 m and the user stayed a minimum time. Start with no stars and require Overall. Record one visit per check-in. Until the backend exists, the alternative is your call: label them "Your notes (this device)". (CR-03 was rated blocker; F09 and MAPS-06 major.) |
| **B9** (MAPS-01, CFV-M1, V14) | The Overpass query ignores the sport: it only asks for fitness_centre, sports_centre, dojo and similar. It keeps the first 40 results by id, not by distance. The tag value `tennis;pickleball` fails a plain equality test. Picking a sport only re-sorts the list, so every generic gym stays under the sport heading. The data does exist in OSM: 88 `sport=pickleball` elements within 12 km of Austin, including Austin Pickle Ranch, and VOW BJJ tagged `sport=jiu-jitsu`. None of them appear. | "Clubs & courts" and "Pickleball near you" are full of yoga studios and chain gyms: 0 of 55 venues are relevant. Boxing: 0 of 43. BJJ "Academies": 3-4 of 46, with Wanderlust Yoga under "Mats near you". | places-live.js:147-185, 162, 501-513; app.js:636-645. `maps-live-data-verify/V3-sports/pickleball-list.png`, `maps-live-data-verify/V3-sports/boxing-list.png`, `maps-live-data-verify/V4-live-api/`, `code-fakes-verify/v10-bjj-academies-list.png`, `visual-verify/shots/v10/pickle-gyms-list.png` | Build a sport-specific Overpass query (`sport=*` including `;` lists, and `leisure=pitch/sports_centre` with a sport tag). Sort by distance before capping. Use name guesses for ranking only. Filter the list to the sport and add an explicit "Other venues nearby" section. Give each sport an honest empty state: boxing has almost no OSM data, so it needs Google text search once N06 is fixed. (MAPS-01 was rated blocker; CFV-M1 and V14 major.) |

### 2b. Majors (40)

| ID | What's wrong | What the user sees | Evidence | Fix |
|---|---|---|---|---|
| **M01** (F07, F20, CR-11, CFV-M2, part of CR-28) | Partners, Events, Live, Updates, Gear shops and wants, and venue "Here now" have no data source. `PARTNERS`, `EVENTS`, `SOCIAL_POSTS`, `SHOPS` and `NEEDS` are empty constants that nothing ever fills. No user can publish themselves, an event, a want/have or their presence. "Request train" would relabel itself "Requested ✓" and send nothing (latent today). | Honest empty states ("No partners nearby yet", "No events listed here yet", "Nothing live right now", "No shops nearby yet"), with filter pills and badges drawn over lists that can never fill. Three of the four advertised pillars are shells. (The venue Links panel still offers Call, Website and Maps.) | data.js:410-422; app.js:1341, 1875-1880, 2094; places-live.js:272-275. `functional-verify/shots/v5_F18_teen_partners.png`, `code-fakes-verify/v09-result.json` | **This is the main thing still to implement.** Build the Supabase backend already chosen in `docs/BACKEND_DECISION.md`: auth, profiles with open-to-train, partner requests, an events table plus ingestion, check-ins and presence, follows, and gear wants/haves. Take shops from OSM `shop=sports`. Your alternative: a "coming soon" label on each surface until it's live. (F07 was downgraded from blocker because the gate discloses it.) |
| **M02** (F08, CR-21, MAPS-19) | Follow saves `{platform:'instagram'}` for every venue, including venues with no Instagram. It deduplicates by name, so following one "YMCA" counts for every YMCA. There is no update source, and the Following list can't render (B1). | "Following ✓", then Feed → Updates says "No updates yet". | app.js:1819-1826; data.js:416. `functional-verify/results.jsonl` (row v5 F08), `maps-live-data-verify/V9-follow/`, `code-fakes-verify/v02-result.json` | Key follows by venue id, never invent a platform, and back them with a real update source (venue posts in the backend). |
| **M03** (MAPS-07, CR-21, F-M03) | `state.checkedInGym` is never saved, and `setSport` clears it. `g.here` is always `{}`. | The Home bar says "● Live at Austin Jiu-Jitsu · check-in live", but that gym's Here now says "Nobody checked in yet". A reload or any sport tap silently ends the check-in and loses the Rate prompt. | app.js:101-120, 541, 1386-1407; places-live.js:273. `maps-live-data-verify/V5-checkin/01-home-checked-in.png`, `maps-live-data-verify/V5-checkin/02-here-now.png`, `functional-verify/logs/v7_minors.json` | Save `{gymId, sport, at}` with a ~6 h expiry and restore it on boot. Don't clear it on a sport change. Show the user in Here now, and publish presence through the backend. |
| **M04** (F10, CR-11, MAPS-19) | The three Privacy checkboxes have no listeners at all. "Open to train" flips a flag that is never saved, never read, and not synced with Settings. | Toggles that reset after a reload. | index.html:293-295; app.js:15, 3310-3315. `functional/logs/s11_clickall.json`, `code-fakes-verify/v03-result.json` | Bind all four controls to one saved `profile.privacy` object and use it when publishing presence and partner visibility. |
| **M05** (F11, CR-24) | There is no Notification or PushManager code anywhere. The Settings toggles only filter empty lists, and the copy promises "future push alerts". The Feed "Notify me" button is bound twice, so one tap cancels itself (latent). | Switches that do nothing. | app.js:1883-1957, 2042-2049, 3226-3233; index.html:287. `functional-verify/results.jsonl` (row v5 F11_after_one_tap) | Implement Web Push (VAPID keys, a service-worker push handler, a backend sender), or drop the promise. Keep only the delegated Notify handler. |
| **M06** (F12, CR-22) | With no Nix endpoint configured (and no UI to set one), `nix-client` returns the same colours with the pattern switched to "stripe". | "Look refined — keep editing colors if you want." Nothing but the pattern changed. | nix-client.js:28-34, 92-112; app.js:2392-2396. `functional-verify/shots/v5_F12_after_refine.png` | Make it a real local refinement (contrast fix, accent separation) that says what changed, or show the button only when a model endpoint answers. (CR-22 was rated minor.) |
| **M07** (F13, LD-11, CR-08) | `paintBuildLabel` hard-codes "You're up to date". | Settings says "You're up to date" while the "Update available" banner is on screen, after "Later", offline, and when the check failed. | update-check.js:47-54, 233. `functional-verify/shots/v5_F13_settings_label_with_update.png`, `links-deploy-verify/live-ld11-label-vs-banner.png`, `code-fakes-verify/v04-update-vs-uptodate.png` | Show the real result: "Update ready — Restart", "Up to date" or "Couldn't check". |
| **M08** (F14) | `hardReload` deletes every cache, unregisters the service worker and navigates, even when offline. The `getLatest` error path calls it too. | Tapping "Refresh app" offline leads to the browser's offline error page. The offline Gyms error even says "try Refresh". | update-check.js:57-107, 283-288. `functional-verify/shots/v5_F14_after_refresh_offline.png` | Hard-reload only when online and version.json fetched fine; otherwise show "You're offline". (For offline map and venues, see M30.) |
| **M09** (F15, MAPS-05, CR-09) | The share builder writes `#gym=<id>`, but the router only reads `#/gym/<id>`. Even the right format only works if the friend's own search returns the same source-specific id. Unknown ids fail silently: the Home screen shows with the Gyms tab lit. "Copied" shows even when the clipboard write failed. | A friend opens the link and lands on Home with no gym. | app.js:1664-1667, 1674-1677, 2899, 3021-3031. `functional-verify/shots/v4_F15_copied_link.png`, `functional-verify/shots/v4_F15_unknown_id.png`, `maps-live-data-verify/V5-checkin/07-open-copied_link.png` | Write `#/gym/<canonical-osm-id>?n=<name>&lat=&lng=` and open the venue from those params (or fetch that one OSM element). Show a clear "not found" with a Maps link. Await `writeText` inside try/catch. |
| **M10** (F16) | Adding a sport always stores level "—", and no control edits a level. | "Judo —". The partner filters "My belt ±1" and "My level" depend on levels that can't be set. | app.js:549, 1828, 3167. `functional/logs/s5_profile_clickables.json`, `functional-verify/results.jsonl` (row v5 F16) | Add a per-sport level list to SPORTS (belts, DUPR…) and a select on each profile sport row, and save it. |
| **M11** (F17, MAPS-02, CR-10) | The pills test tags and amenities that live places never carry: tags are only Phone, Website, Hours and Nearby, and amenities only mats or racks. So 13 pills are always 0: Open mat, Gi / No-Gi, Has cage, Spar night, Has ring, Heavy bags, Pad class, Fight team, Sled / stations, Indoor, Hosts events, Reformer and Platforms. "Classes", "Classes today" and "HYROX class" really mean "has a phone or website" (used by all 12 template sports). Pickleball "Open play" means "open now". | "No places in this area — search another city" while the header says "43 places · Austin". | app.js:1036-1075; data.js:6-11, 48-53, 237-242; places-live.js:187-195, 380-384, 552. `maps-live-data-verify/V3-sports/boxing-filter-ring.png`, `code-fakes-verify/v05-result.json`, `functional-verify/shots/v4_F17_last_pill.png` | Show only pills backed by data (map them to OSM `sport=*`, `indoor=yes`, `opening_hours`). Rename or remove "Classes". Word the empty state after the filter, not the area. |
| **M12** (F18, VV-M5) | Anyone can switch Settings → Teen safety to "Teen 16–17" (`#ageDemo`), while the gate promises youth and adult discovery "stay separated for safety". Latent today because no partners exist. | An adult can join the youth pool in one tap. | index.html:331-337; app.js:3301-3308; beta.js (~l.82). `functional-verify/shots/v5_F18_teen_partners.png` | Set the age band once at signup and verify it on the backend, and remove the switch. Until then, soften the safety claim. How ages get verified is your decision. |
| **M13** (F-M01, CR-17) | A full-size data URL of a camera photo (3–6 MB) goes over the ~5 MB storage limit. The quota fallback then silently saves *without* the photo and *without* the club logo. | The photo shows, then disappears after a reload, and the club crest is gone too. | app.js:110-121, 2613-2621. `functional-verify/results.jsonl` (v8 photo rows, script `functional-verify/v8_photo.py`), `code-fakes-verify/v04-result.json` | Downscale on a canvas (≤512 px JPEG, q≈0.85) for both the avatar and the crest. Show a message if saving fails. Move images to backend storage later. |
| **M14** (MAPS-09, LD-16, part of F26) | `mapsSearchUrl` ignores coordinates whenever the place has a name. 14 of 46 Austin and 8 of 40 Chicago links are name-only; two Austin YMCAs share `query=YMCA`. Nominatim addresses repeat the name ("Austin Jiu-Jitsu Austin Jiu-Jitsu, Hatley Drive…"). The detail page has no coordinate-based "Go" link. | Google Maps opens another branch of a chain, or one near the phone instead of the searched city. | places-live.js:109-118, 375; app.js:1119-1127, 1495-1513. `maps-live-data-verify/V2-map/result.json`, `links-deploy-verify/live-run_c.json` | Build the query from name + lat,lng and strip the name prefix from the address. Add Directions to the detail page. (LD-16 was rated minor.) |
| **M15** (MAPS-10, CR-12, CFV-M4) | Comma-joined OSM hours are mis-read ("Mo-Th 05:30-22:00, Fr 05:30-21:00" means closed all Friday), and so are overnight spans. The time zone is the viewer's, and the result is computed once at fetch time. | The YMCA shows "Closed now" on a Friday morning during its posted hours, and the "Open now" filter drops it. A viewer in the Tokyo time zone sees almost every Austin venue closed. | places-live.js:230-261, 351, 539. `maps-live-data-verify/V2-map/result.json`, `code-fakes-verify/v05-ymca-detail.png`, `code-fakes-verify/v12-result.json` | Vendor the `opening_hours.js` library (OSM's reference parser). Evaluate in the venue's time zone and again on each render. Show "Hours not confirmed" when a rule doesn't parse. |
| **M16** (MAPS-08) | The three Overpass mirrors are tried one after another, 14 s each, inside a `Promise.allSettled` that waits for every source. One mirror (kumi.systems) is dead and one returned 504. | "Finding real venues near you…" for up to 44 s, then a thin list presented as complete (Miami: 9 places), with no notice. | places-live.js:15-19, 475-498, 722-726. `maps-live-data-verify/V6-overpass_hang/`, `maps-live-data-verify/live-hits.jsonl` | Show Nominatim and Photon results immediately and merge Overpass when it lands. Race the mirrors in parallel with an ~8 s budget. Drop kumi.systems. Say "Some sources didn't respond". |
| **M17** (MAPS-15) | Review, favourite and visit rows store only a source-specific id (`nom-`/`osm-`/`pho-`), and `findGym` only looks in the current live list. | After a city search, or a load where Nominatim was rate-limited, "My reviews" shows "nom-node-998943894" as the title and tapping it does nothing. | app.js:628-630, 1645-1655, 1677, 2748-2760; places-live.js:364, 453, 534. `maps-live-data-verify/V5-checkin/06-profile-reviews.png` | Store name, lat, lng and the canonical OSM element (type+id) with every row. Open the detail from the stored data when the venue isn't in the list. |
| **M18** (LD-V2, CR-14, MAPS-11, V25) | `switchTab('home')` and `boot` both call `loadLivePlaces`, which has no in-flight guard, and on a first visit the service-worker takeover reloads the page mid-load. The custom User-Agent header is silently dropped by browsers. | A slower first load. The bigger risk: public Nominatim allows 1 request per second, and every user fires 9-11 Nominatim calls in ~3 s. That can get the app rate-limited or blocked for everyone. | app.js:815-839, 2983, 3378; update-check.js:385-389; sw.js:26. `links-deploy-verify/run_g.json`, `links-deploy-verify/live-run_c.json`, `code-fakes-verify/v07-result.json`, `visual-verify/v25.json`, `maps-live-data-verify/V1-base/ledger.jsonl` | Keep one in-flight promise (an AbortController for forced reloads) and drop the boot duplicate. Queue Nominatim at 1 request per second and cache reverse lookups. Reload on `controllerchange` only when a previous controller existed. (MAPS-11 and V25 were rated minor.) |
| **M19** (CR-15) | Results are written with no request id, so a late answer overwrites a newer search. | On a slow network, tapping Yoga while BJJ is loading ends with the BJJ list under the Yoga focus. | app.js:908-919. `code-fakes-verify/v08-race-final.png` | Use a request token and ignore stale results. |
| **M20** (CR-07) | Boot runs when app.js is parsed. Geolocation runs at ~0.7 s, and 19 requests carrying the exact lat/lng go to Nominatim, Photon and Overpass (plus 2 localhost POSTs) before the gate even renders. The gate says "preferences stay on this device unless you send feedback". | On a real phone the location prompt appears before or over the consent card. | app.js:3327-3378; beta.js:85. `code-fakes-verify/v01-result.json` | Start location and venue loading only after the `rollphase:beta-ready` event. Make the privacy text name the OSM services that receive location. |
| **M21** (CR-13, MAPS-21) | Unknown venues default to "Lifting". Real OSM `sport=baseball` and `sport=barre` get replaced with Lifting. `/ufc/` matches "UFCU". Any dojo counts as BJJ. Gracie Humaita becomes Lifting, and yoga, climbing and boxing gyms also get Lifting. | Sport chips the source data never said, sometimes the opposite of it. | places-live.js:147-185, 154, 269, 358-361, 379, 547. `code-fakes-verify/v05-result.json`, `maps-live-data-verify/V3-sports/result.json` | Use OSM `sport=*` when present and "Sport not listed" otherwise. Use name guesses for ranking only, with word boundaries. |
| **M22** (CR-20) | The Home "ROI" card renders roadmap strings as features: "belt match · open mat · IBJJF / local brackets · seminar alerts · who is on mats now". None of these exist. | Planning notes presented as features. | app.js:1307-1311; data.js:65-72. `code-fakes-verify/v01-home.png` | Remove the card, or replace it with real counts ("12 venues with hours"). |
| **M23** (CR-27) | `qa-smoke.mjs` checks that files exist, greps for function names and pings Nominatim from Node. It never loads the app. | Nothing user-facing, but it reports 3/3 PASS on the build where Profile crashes: a fake green in the pipeline. | qa-smoke.mjs:20-80. `code-fakes-verify/qa-smoke.log` | Replace it with a Playwright smoke test: boot, accept the gate, visit every tab (including Profile plus a reload), assert zero page errors and >0 venues from recorded answers. Make ship depend on it. |
| **M24** (LD-08, CR-18, F21, MAPS-16) | The public site POSTs every venue website to `http://127.0.0.1:8877/enrich` on every load, and it's refused. The server has no Private-Network header, and Chrome denies local network access. `enrich_server.py` sends `Access-Control-Allow-Origin: *`. Its blocklist lets `[::]`, `0:0:0:0:0:0:0:0`, `198.18.0.1`, `224.0.0.1`, `255.255.255.255` and `192.0.0.1` through. Its stealth-browser fallback runs site JavaScript with local network access. It caches failures forever. Its cache holds a phone number for a Chicago gym with a California area code (951-932-8400) whose label came from a URL path. `enrich_server.py` itself is downloadable from the public site. | "Phone: Not listed — open Maps" on most venues, and a failed request in the console on every load. | app.js:772, 920; enrich_server.py:17-18, 35-64, 144-163, 213-229, 258-264. `links-deploy-verify/live-run_c.json`, `code-fakes-verify/enrich-copy/`, `maps-live-data-verify/V7-beta/` | Host it (for example on Forge behind Tailscale Funnel, free) with an allow-listed origin, IP pinning, no stealth fallback, a failure TTL and an area-code sanity check, and call it only when configured. Your alternative: drop enrichment. (F21 and MAPS-16 were rated minor.) |
| **M25** (LD-04) | `ship.ps1` only commits and pushes Mpdev007/rollphase. rollphase-beta is updated by separate hand commits 10-40 s later, and neither repo has a workflow. | Nothing directly: the live site matches master only because someone copied the files each time. | scripts/ship.ps1:26-29. `links-deploy-verify/gh-deploy.txt` | Add a GitHub Actions workflow that builds a filtered artifact from `prototype/` and deploys it to Pages (or pushes it to rollphase-beta). |
| **M26** (LD-V1) | A second public copy, `https://rollphase.onrender.com/`, serves 0.5.0 (build `20260805-2209-b0c7f28`), 9 commits and 6 ships behind. Its update check polls its own stale version.json. The docs say Render auto-updates. | Anyone on that copy, such as an early home-screen install, never gets an update prompt. | `links-deploy-verify/render-probe.txt`; SESSION_HANDOFF.md:6; AGENTS.md:11; ship.ps1:1 | Pick one host: reconnect Render and redeploy, or retire it with a redirect to the Pages URL. Then fix the docs. |
| **M27** (LD-05, part of CR-31) | Pages sends `Cache-Control: max-age=600` for every file. Its edge ignores query strings, so the app's `?_rp=` and `?v=` tricks do nothing. `_headers` is a 404 and ignored. The meta no-cache tag never reaches the CDN. Pages builds alone take 33-71 s. | For up to ~10 minutes after a ship, About → Check for update can say "You're on the latest version", and Restart can load a mix of old and new files. The docs promise 20-45 s. | `links-deploy-verify/curl-cdn.txt`, `links-deploy-verify/curl-cdn-querykey.txt`, `links-deploy-verify/gh-deploy.txt`; update-check.js:9; docs/APP_UPDATES.md:16, 43; ship.ps1:30 | Generate content-hashed file names (`app.<hash>.js`) in the deploy workflow, or move to a host that honours headers. Change the promise to ~10 minutes. (The finder's "add hash queries" hint does *not* work on Pages.) |
| **M28** (LD-06) | Under Windows PowerShell 5.1, `$ErrorActionPreference='Stop'` doesn't stop native commands. The success line is also untrue even when the push works, because phones only see a ship after the separate hand publish (M25). `pwsh`, which the docs name, isn't installed. | With node exiting 3 and git exiting 128, the script still prints "Pushed. Phones with the app open will prompt…". | ship.ps1:11, 25-30. `links-deploy-verify/ps-test/` | Add `if ($LASTEXITCODE -ne 0) { throw }` after every native call and print an accurate message. |
| **M29** (LD-07, VV-M2, IP-11) | The manifest lists a single `image/jpeg` icon declared as 512 px that is really 1024 px. Chrome reports `manifest-missing-suitable-icon`, and a PNG icon clears it. | Chrome won't offer "Install app"; Android only gets a plain shortcut. | manifest.webmanifest; index.html:15. `links-deploy-verify/live-run_a.json`, `visual-verify/pwa.json`, `visual-verify/pwa2.json` | Add PNG icons: 192 and 512 "any", 512 maskable, a 180 apple-touch icon and a favicon (N41), each with its true size. |
| **M30** (VV-M3, MAPS-17, LD-14, part of F14) | Leaflet's JS, CSS and pin images come from unpkg with no fallback, and the service worker only caches same-origin files. There is no cached copy of the last venue list. The tile URL uses the deprecated `{s}` subdomains. | If unpkg is blocked, down, or the phone is offline, the map is a blank 520-px box with no message. | index.html:19, 381; app.js:672, 682, 1460; sw.js:40-44. `visual-verify/shots/m3/`, `links-deploy-verify/live-B-no-unpkg-map.png`, `maps-live-data-verify/V6-cdn/` | Vendor Leaflet 1.9.4 into `prototype/vendor/` so the service worker caches it. Show "Map unavailable — showing list" and switch to List when `L` is missing. Keep the last venue list. Use `https://tile.openstreetmap.org/{z}/{x}/{y}.png`. (MAPS-17 and LD-14 were rated minor.) |
| **M31** (V8) | Feedback, About, the update banner, the gate and the top chrome are attached to `<body>`, outside `#phoneRoot[data-sport]`, so they always use teal `#2ee6c5`. | Teal buttons on the lime, gold, pink and red skins alike. | beta.js:194, 303; update-check.js:137; skins.css:29, 204-209. `visual-verify/shots/v6/pickleball-feedback.png`, `visual-verify/shots/v6/boxing-feedback.png` | Copy `data-sport` onto `<html>` in `applySkin` so body-level overlays inherit the skin. |
| **M32** (V9) | The fixed beta chrome gets a 64-px top margin on every screen. With the header and tab bar that's about 200 of 844 px of chrome, and "Refresh app" appears three times in Settings. | A teal "Refresh app" pill plus two dark pills above the header on every screen, also floating over sheets. | skins.css:182, 2373; update-check.js (`injectRefreshChrome`). `visual-verify/v7.json`, `visual-verify/shots/v6/explore-home.png` | Replace the row with one small header button (Feedback, About and Refresh in a menu) and remove the 64-px margin. |
| **M33** (V12, CFV-M5, part of MAPS-21) | Contact availability is stored as sport tags and then drawn again as pills. "Nearby" is used as filler. The address is Nominatim's full `display_name`. | Pills like "Phone, Website, Phone, Website", "Nearby" as both meta and pill, and 3-4-line addresses such as "Austin Jiu-Jitsu, Hatley Drive, …, United States". | app.js:1161-1171, 1707-1711; places-live.js:187-195, 380. `visual-verify/shots/v10/bjj-gyms-list.png`, `code-fakes-verify/v10-result.json` | Use tags for real attributes only, drop the filler, and show a short "number street, city" address. |
| **M34** (V13) | The primary sport row's name block is 92 px wide. | "Brazilian Jiu-Jitsu · First choice" wraps onto 3-4 lines, and the level pill splits into 3-4 pieces at 390 and 360 px. | `visual-verify/shots/v10/profile-primary-row.png`, `visual-verify/v10.json` | On narrow screens, stack Primary and Remove under the name, make the pill `inline-flex; white-space:nowrap`, and put the note in muted text. |
| **M35** (V6, IP-05) | All 21 sport images and all 5 tab images are opaque 1024-px or 512-px JPGs, and a radial mask blurs their square backgrounds into dark blobs. RGBA cut-outs of all 21 sports exist on the laptop (`assets/sports/*.png`, 17 MB), but they are untracked and 404 on the public site. Unicode symbols (★ ✓ ☎ ‹ ▾ ↗ +) and "Mic"/"ALL" text tiles stand in for icons: five unrelated styles in all. | Grey or black squares behind sport icons on coloured cards, and dark objects that vanish on dark skins. | data.js:43-378; skins.css:1748-1759. `visual-verify/shots/v6/pilates-home.png`, `visual-verify/shots/m1/`, `icon-inventory-verify/shots/public-picker-dpr1.png` | Export the RGBA cut-outs (216 and 504 px) and deploy them as the "classic" pack. Use one monochrome SVG line set for the small system glyphs (Lucide fits your stack rule), tinted with `--accent`. |
| **M36** (F25, V5, IP-01, IP-02) | The tab bar hard-codes `assets/tabs/*.jpg`. There is no pack picker and no pack or hue code. The packs live on branch `glyph/contour` (f, n, k, i and r × 5 tabs, plus trim masks) and as a stale untracked copy in `prototype/glyph-preview` (no masks, 4 identical profile files). They return 404 on the public site. Pack-style sport art exists for only 5 of 21 sports, is shared rather than per pack, and there is no Explore or map-pin art. | One built-in icon set; the packs can't be chosen. | index.html:356-372; app.js:441, 480, 488, 1236, 1258, 1424, 2664, 2858, 2870. `icon-inventory-verify/v_settings.json`, `iconpacks/inventory.json` | See section 4. |
| **M37** (IP-04) | The mask, `object-position` and accent drop-shadow built to hide the JPG squares also fade the bottom of every pack icon. The glyph box is 32 px while the image is 36. | Pin tips, card bottoms and headgear chins fade out, so the contour doesn't take the hue all the way round. | skins.css:1748-1758, 2236-2244. `icon-inventory-verify/v_mask.json`, `icon-inventory-verify/shots/mask-compare-dpr3.png` | Apply the mask to classic JPG slots only; removing it everywhere today exposes black squares. Pack slots get no mask, no `object-position` and no glow. |
| **M38** (IP-06) | 28 image requests load 1024-px JPGs into 36-168 px slots. `bjj.jpg` downloads twice because index.html:70 omits `?v=7`. | Opening the sport picker downloads 4.95 MB. | index.html:70; data.js:35. `icon-inventory-verify/v_bytes.json` | Export at 216 px, plus 504 px loaded lazily for the focused hero. The 21 cut-outs at 216 px WebP total 324 KB. Drop the hard-coded src. |
| **M39** (IM-01) | `sw.js:47` uses `fetch(req, {cache:'no-store'})` for every same-origin request, so the HTTP cache is never used. The activate step also wipes every cache on each ship. | Every app open re-downloads every image: 12 of 12, 1.54 MB on Home alone. | sw.js:21-27, 47. `icon-inventory-verify/v_swcache.json` | Keep network-first only for HTML, JS, CSS and version.json. Serve images and pack files cache-first from a versioned image cache that activate keeps. |
| **M40** (IP-07) | The only recolour engine (mocks.html) repaints full-size art. It takes 136-154 ms per hue-slider event at normal CPU and 0.75-1.7 s at 4x throttle; a cold pack switch takes 1.1 s and 6.4 s. REPORT.md's "~37 ms" is per icon, not per event. At export size it is fast: 5 tabs in 4-5 ms, all 26 icons in 17-31 ms. | A slider that stutters (6-9 fps), and freezes on slower phones. | `icon-inventory-verify/v_perf.json`, `iconpacks/bench.json`, `iconpacks/bench2.json` | Recolour the 128- and 216-px exports in a Worker (OffscreenCanvas), optionally with an SDF sidecar, and coalesce slider events to `requestAnimationFrame`. |

### 2c. Minors (42)

| ID | What's wrong | What the user sees | Evidence | Fix |
|---|---|---|---|---|
| **N01** (F19, LD-09, CR-26, V24) | The local-only "Your Muse" card links to `http://127.0.0.1:8878` (nothing listens there). Off localhost it turns into a dead "Opens with the app premium" label, and its copy promises a paid tier that doesn't exist. It sits under the same buildId as public, so shipping it wouldn't trigger an update. **Correction:** the public site shows no premium teaser today. | Locally: a browser error page. | index.html:298-303; app.js:3331-3335. `links-deploy-verify/local127-muse-card.png`, `links-deploy-verify/rptest-muse-card.png` | Your call: ship it, hold it or drop it. It only ships if it has a public HTTPS connect endpoint, and the build id must change with the code. |
| **N02** (F23, V4, VV-M4) | Escape on a root tab calls `history.back()` and leaves the app. After sending feedback the URL stays `#/home/feedback`, and after picking a sport it stays `#/home/sports`. | The user leaves RollPhase; a reload reopens the Feedback sheet or the sport picker; one back press does nothing. | app.js:2925, 3095-3097, 3156-3160; beta.js:277. `functional-verify/logs/v7_minors.json`, `visual-verify/m1.json` | Go back only for in-app history entries, close sheets through `betaCloseOverlay`, and call `replaceNav` before setting `_navSilent`. |
| **N03** (F24, LD-V5) | 8 of 21 sports have no events link: boxing, weightlifting, tennis, basketball, pilates, yoga, running and swimming. | "No events listed here yet" with no link. | data.js:389-401; app.js:270-277. `functional-verify/logs/v7_minors.json` | Add official calendars and check each one in a browser. |
| **N04** (LD-V3; also MAPS-18, which had no verdict of its own) | Smoothcomp ignores `location=` and lists events near the viewer's IP address. | "BJJ events in Austin ↗" opens Bettendorf, Chicago and Milwaukee first. | app.js:270-283. `links-deploy-verify/run_f.json` | Relabel it "BJJ events on Smoothcomp", or use a location URL confirmed to work. |
| **N05** (LD-V4) | Three calendar links are permanent redirects: hyrox.com, USA Cycling (with an https→http hop) and IFSC (now World Climbing). | The pages still load, but the IFSC label is out of date. | data.js:396, 399, 400. `links-deploy-verify/links-calendars.txt` | Point at the final URLs and relabel the climbing link "World Climbing". |
| **N06** (MAPS-14, CR-23, part of F26, part of LD-15) | `fetchGoogleText` reads an undeclared `opts`, so it always throws. The docs advertise Geoapify, but nothing implements it. The Settings Google key is never read. | Nothing visible; sport text search silently never runs when a Google key is set. | places-live.js:94-96, 627-656; app.js:42, 108; config.example.js:10-17. `maps-live-data-verify/V6-google/`, `code-fakes-verify/v09-result.json` | Accept `opts`. Implement Geoapify or remove it from the docs. Proxy any Google key through a server. |
| **N07** (LD-15, CR-31) | config.js is gitignored but requested on every load. | A 404 console error on every public load. | index.html:382; .gitignore:27. `links-deploy-verify/curl-cdn.txt` | Commit an empty public config and keep secrets in a local-only file. |
| **N08** (F26, LD-18, MAPS-V04) | City search shows the raw error message. | "Failed to fetch", "Geocode 429", "Place not found". | app.js:1003; places-live.js:676-678. `maps-live-data-verify/V8-extra/` | Use plain wording ("City search is busy, try again in a minute"). |
| **N09** (MAPS-12) | 429 and 5xx errors all go down the network-error path. | "Check your connection" when the service is only busy. | app.js:943-944. `maps-live-data-verify/V6-all_429/` | Show a busy-service message with a retry. |
| **N10** (MAPS-13) | The dot is placed at the search centre. | "You are here" at the centre of Chicago while the user is in Austin. | `maps-live-data-verify/V6-youdot/` | Label the dot "Search area" after a city search. |
| **N11** (MAPS-V02) | `fitBounds` runs on every re-render. | Zoom and pan reset when a pill is tapped or on return from a detail page. | app.js:740-746. `maps-live-data-verify/V2-map/result.json`, `maps-live-data-verify/V8-extra/` | Fit the bounds only when the result set changes. |
| **N12** (MAPS-V03) | Refresh uses `regeo:true`. | After a Chicago search, Refresh jumps back to Austin. | app.js:3246-3251. `maps-live-data-verify/V8-extra/` | Re-query the current centre. |
| **N13** (MAPS-V05) | There's no `moveend` search. | The empty state says "move the map area", yet panning never searches. | app.js:668-748, 1479-1482. `maps-live-data-verify/V2-map/result.json` | Add a "Search this area" button, or change the copy. |
| **N14** (MAPS-V06) | Check-in calls `applySkin` with the venue's guessed sport. | The app's sport focus changes, and the review is filed under a guessed sport (a shuffleboard bar filed under "Lifting"). | app.js:1811. `maps-live-data-verify/V5-checkin/result.json` | Keep the focus and let the athlete confirm the sport. |
| **N15** (F27, V17) | The picker overlay (z-index 30) sits under the tab bar (z-index 40), and there's no empty-state line. | The bottom row is hidden behind the tabs, and searching "zzz" leaves only an "Explore all" tile. | app.js:2844-2876; skins.css:2114. `visual-verify/shots/v34/`, `functional-verify/shots/v7_F27_picker_curling.png` | Put the overlay above the tab bar, add bottom padding, and show "No sport matches". |
| **N16** (LD-12) | `hardReload` clears `swReloaded`, so the service-worker takeover reloads again. | Two page loads and a flash after "Refresh app". | update-check.js:57-103, 385-388. `links-deploy-verify/live-run_c.json` | Set the flag before navigating. |
| **N17** (LD-13, CR-19) | `normalizeUrl` passes `javascript:` links through. There's no CSP and no SRI on Leaflet. | Nothing today: the link opens a blank tab, because of `target=_blank noopener`. | places-live.js:123-131; index.html:19, 381. `links-deploy-verify/curl-cdn.txt` | Allow only http/https, add a CSP meta tag, and self-host Leaflet (M30). |
| **N18** (CR-30) | `escapeHtml` doesn't escape `'`, and a few templates skip escaping. Latent: the arrays behind them are empty. | Nothing today. | app.js:249-255, 1182, 1202, 1349, 1768, 1856, 1963, 1983, 2088, 3389 | Escape every value, or build the DOM with `textContent`. |
| **N19** (CR-29) | Stored JSON is spread without type checks, and `setItem` has no try/catch. | If `rollphase.reviews.user.v1` is `{}`, venue detail won't open; with full storage, posting a review throws. | app.js:78-97; reviews.js:45-55, 69. `code-fakes-verify/v09-result.json` | Add `Array.isArray` guards and wrap every write. |
| **N20** (CR-28) | Dead code: filter branches `wod`, `rig` and `rx`, a `.map-pin` handler, unused `osmUrl`, `sport.depth` and `fetchGoogleNearby`. | Nothing directly. | app.js:1059-1060, 1086, 3216-3220; places-live.js:376, 546 | Remove it. |
| **N21** (CR-25) | Reviews are keyed by author name, and "Vlad" is hard-coded. | "My venue reviews" empties after you set a display name; a real user named "Vlad" or "Guest" gets blanked. | app.js:90, 1272, 2741-2746; reviews.js:122-124. `code-fakes-verify/v09-result.json` | Use a stable local user id and remove the special-case names. |
| **N22** (LD-10, part of IP-12) | `ship.ps1` runs `git add -A`, which would sweep in ~35 MB of untracked work: glyph-preview (17 MB), sports/*.png (17 MB), visual/assets and the Muse card. | Nothing today; the next ship and mirror sync would publish it. | ship.ps1:26. `links-deploy-verify/` (git status evidence in the LD-10 verdict) | Stage explicit paths, and gitignore masters or move them out of `prototype/`. |
| **N23** (LD-17, part of CR-31) | The buildId is the minute plus the *previous* commit sha, so two bumps in one minute collide. The version is polled every 20 s in production. | Missed updates, and about 180 version checks per hour per open tab. | scripts/bump-version.js:21-40; update-check.js:9 | Use seconds plus a random suffix or a content hash, and poll every 60-120 s plus on visibility change. |
| **N24** (LD-19) | Dev tooling is on the public URL. | enrich_server.py, qa-smoke.mjs, README.md and config.example.js all return 200. | `links-deploy-verify/curl-cdn.txt` | Publish runtime files only (M25). |
| **N25** (F-M02) | The first update check compares against the stored previous build, not the build actually running. | "Update available" for the build already running, and Restart then brings back the gate. | update-check.js:212-224. `functional-verify/shots/v9_spurious_banner.png` | Compare against the build id embedded in the running page. |
| **N26** (V11) | MMA's accent `#e11d2e` gives 3.8-4.3:1 contrast for small text and button labels. | Hard-to-read red text on the MMA skin. | `visual-verify/v6.json` | Use a lighter text accent and white text on crimson buttons. |
| **N27** (V7) | Tab icons are 512-px JPGs on black behind a mask. Labels are 9.86 px (8.7 px at Small text). | Dim grey tab icons. | skins.css:2214, 2236-2244. `visual-verify/shots/v7/` | Replace with pack art (M36, M37) and put an 11-px floor on labels at Small. |
| **N28** (V15) | There is no type scale (23 font sizes), and the segment control lacks nowrap. | At Large text, "For you" wraps and the Feed segment grows to 52 px. | `visual-verify/shots/m2/`, `visual-verify/m2.json` | Add size tokens and `white-space:nowrap`. |
| **N29** (V21) | `.row-line` has no gap, and the detail tabs overflow with no fade. | "HoursMo-Th…" runs together, and the "Links" tab is clipped at 390 and gone at 360. | skins.css:1982-2000. `visual-verify/shots/v10/bjj-gym-detail.png` | Add a gap, right-align values and add an edge fade. |
| **N30** (V22) | Sheets are mounted on `<body>`, and swatch labels are cut with `slice(0,4)`. | On desktop (1280x900) the feedback panel straddles the phone and the page scrolls 8 px. Labels read "HYRO", "Runn" and "Clim" (the label part was not re-checked by the verifier). | app.js:528. `visual-verify/shots/m2/`, `iconpacks/extras.json` | Mount sheets inside the phone frame and use short names. |
| **N31** (V23) | The checkbox sits at the bottom of a 380-px inner scroll (scrollHeight 1154). | On first view only a disabled "Enter" button, with no hint why; with B3 this happens on every launch. | `visual-verify/v2_local.json`, `visual-verify/shots/v2/` | Pin the checkbox next to Enter. |
| **N32** (V26) | Feed "For you" always uses the primary sport. | "Built around BJJ (first choice)" even in Explore. (The "Explore accent looks disabled" part wasn't verified.) | app.js:1997-2001 | Build it from all profile sports when no focus is set (the root cause is B6). |
| **N33** (IP-08) | The only pattern CSS rule is empty. | Tapping rings, stripe, mesh or solid changes 0 pixels. | skins.css:372-375; app.js:392. `icon-inventory-verify/shots/pattern-*.png` | Implement the 4 backgrounds, or remove the control. |
| **N34** (IP-09, V18) | Pins, the "you" dot and the popup button are hard-coded (default blue Leaflet pin, teal `#2ee6c5`), loaded from a CDN, with no clustering. | Blue pins piled downtown on every skin. | app.js:703-718; skins.css:793-800. `icon-inventory-verify/shots/local-austin-gyms-top.png` | Draw pins from the pack's gyms art, read `--accent` for the dot and button, and add clustering. |
| **N35** (IP-10) | Explore has no icon art: an "ALL" text tile, and logo.jpg reused as its hero. | A text box where every other sport has an icon. | app.js:441, 522, 2858. `icon-inventory-verify/shots/public-picker-dpr1.png` | Add Explore slots to every pack (section 4). |
| **N36** (IP-12) | Unreferenced files are deployed: styles.css, sports-grid.jpg, tab-strip.jpg, tab-strip-alt.jpg, and the `metalGrad`/`glyphDepth` SVG defs. | Nothing; dead weight. | index.html:23-34. `links-deploy-verify/curl-cdn.txt` | Delete them. |
| **N37** (IP-13) | There's no precache, no `onerror` fallback, and each ship wipes the cache. **Correction:** after one load under the current build, the service worker does serve icons offline. | A broken-image glyph if a first fetch fails. | sw.js:21-27, 37-68. `icon-inventory-verify/v_swcache.json` | Precache the active pack in a kept cache and fall back to classic art on error. |
| **N38** (IP-14) | Partners is people with faces in every pack, in two render styles (photoreal in f and n, cartoon in k, i and r). Chalk's partners art has green key residue. | Faces about 9 px wide at tab size. | `icon-inventory-verify/shots/pack-sheet.png` | Your call (section 4, Q5). Re-key the Chalk partners art in any case. |
| **N39** (IP-15) | The sport-accent tile and glow would stack with the pack contour hue. | Two colour systems on one icon (for example a blue contour inside a gold glow). | skins.css:2231-2244. `icon-inventory-verify/shots/mask-compare-dpr3.png` | Your call (section 4, Q1 and Q2). |
| **N40** (IM-02) | The pack Profile icon (headgear) is the same object as today's Wrestling sport icon. | A Wrestling fan sees the same object meaning "profile" and "wrestling". | `icon-inventory-verify/shots/wrestling-vs-profile.png` | Your call (section 4, Q6). |
| **N41** (IM-03) | No `rel="icon"` is declared. | A generic browser-tab icon (`/favicon.ico` is a 404). | index.html:14-15 | Export a 32/48-px PNG favicon (with M29). |
| **N42** (CFV-M3) | The gate's name and email ("Only if you want a follow-up") are stored in localStorage only. | Nobody can ever follow up. | beta.js:24-35, 88-92. `code-fakes-verify/v02-result.json` | Send them to the same backend as feedback (B7), or remove the promise. |

### 2d. Refuted, unverified and corrected

- **Refuted: none.** Every verifier verdict in all six passes was `confirmed: true`.
- **No verdict, so dropped from the counts:**
  - V16 (mixed button sizes)
  - V19 (secondary-text contrast on several skins)
  - V20 (the represent studio looks like a dev tool)

  MAPS-18 also had no verdict of its own, but LD-V3 confirmed the same defect, so it is kept as N04.
- **Sub-claims the verifiers corrected (the rest of each finding stands):**
  - LD-04 "no Render URL exists" is wrong: rollphase.onrender.com is live at 0.5.0 (now M26).
  - CR-26: the "premium" text is not on the public site.
  - IP-13 "no fallback when a fetch fails" is overstated: once a page has loaded under the current build, the service worker serves icons offline.
  - MAPS-21: the "Waterfront Outdoor Gym listed twice" duplicate was not reproduced.
  - LD-05's fix hint (query-string cache-busting) doesn't work on Pages.
  - LD-02's "300 ms" timing isn't universal. The poll landed between 2 and 4.5 s, and the mechanism doesn't depend on timing.
  - F25: the packs are also in the main copy's `glyph-preview`, untracked and stale.
  - IP-04's fix hint: the mask is still needed for today's JPGs.
  - V10: the feedback bug is a missing recipient plus an unconditional close, not invented text.
  - V18: the attribution is below the fold, not under the sheet.
  - MAPS-13: the stale-cache notice part was not re-run.

---

## 3. Everything that pretends (fake, mock, sample, local-only)

**A. Says it worked when it didn't (fake greens)**
1. Feedback "Opening your email… thank you!" when there is no recipient and nothing is sent (B7).
2. "Post to RollPhase", "From athletes on RollPhase" and "N athlete reviews", when the review stays on this device (B8).
3. A "Visit verified" badge from one tap, anywhere on earth (B8).
4. "✓ Saved place", which isn't saved (B4).
5. "Following ✓" with an invented Instagram platform (M02).
6. "● Live at … · check-in live", which nobody sees and a reload or sport tap ends (M03).
7. "Requested ✓" on Request train, with nothing sent (M01, latent).
8. "Look refined", where only the pattern changed (M06).
9. "You're up to date", which is hard-coded and also shown offline (M07).
10. "Copied share blurb", shown even when the copy failed, for a link that opens Home (M09).
11. The Privacy checkboxes, Open to train and the Notifications toggles, which have no effect (M04, M05).
12. The pattern pills, which change 0 pixels (N33).
13. `ship.ps1` printing "Pushed. Phones with the app open will prompt…" after a failed push (M28).
14. `qa-smoke.mjs` reporting 3/3 PASS on a build whose Profile tab crashes (M23).
15. About → "You're on the latest version" during the 10-minute CDN window after a ship (M27).

**B. Sample or invented data shown as real**
1. The seeded profile (Blue belt, DUPR 3.5, Vinyasa, Novice, Open, BJJ as first choice) shown to every new user (B6).
2. "My sports" writing that seed over the user's real profile (B5).
3. Sport-titled lists padded with generic gyms (B9).
4. The "Lifting" default tag, and tags that contradict OSM (baseball, barre, UFCU → MMA) (M21).
5. The "Nearby" filler pill and meta line (M33).
6. The ROI card's roadmap strings shown as features (M22).
7. "Classes" meaning "has a phone", "Open play" meaning "open now", and 13 pills that are always empty (M11).
8. "Open now" / "Closed now" wrong for common hours formats and time zones (M15).
9. "You are here" placed at the searched city (N10).
10. A pre-filled 5-star rating (B8).
11. "BJJ events in Austin" that isn't filtered to Austin (N04).
12. On the laptop only, enrich-cache phone numbers taken from URL paths (M24).

**C. Local-only (works only on this laptop or in this one browser)**
1. The enrich POST to `127.0.0.1:8877`, shipped to every visitor (M24).
2. The "Your Muse" card pointing to `127.0.0.1:8878`, uncommitted, with paid-tier copy (N01).
3. Reviews, visits, favourites, feedback, gate contacts and check-ins stored in localStorage only (B7, B8, M03, N42).
4. Photo and crest stored as data URLs in localStorage (M13).
5. The RGBA sport cut-outs (untracked on the laptop) and the glyph packs (on a branch); both are 404 on the public site (M35, M36).

**D. Promises with nothing behind them**
1. Partners, Events, Live, Updates, Gear and Here now (M01).
2. "Future push alerts" (M05).
3. "Youth and adult partner discovery stay separated for safety" (M12).
4. "Preferences stay on this device", while coordinates go to OSM services before consent (M20).
5. "Post a want/have" with no control to do it (M01).
6. Doc promises that aren't true:
   - Render auto-updates (M26).
   - Updates arrive in 20-45 s (M27).
   - Geoapify works via config.js (N06).
   - `_headers` sets no-cache (M27).
7. "Move the map area", with no way to search a moved map (N13).

**Honest and real** (so it isn't lost in the list above):
- All listing arrays are empty; there are no fake gyms, partners, events or reviews.
- The venues are real OSM data, and phone, website and hours match the source exactly.
- The location-denied message is honest and city search recovers from it.
- Logo colour extraction is real canvas analysis.
- The update banner, Later and Restart work.
- All 25 outside URLs load.

---

## 4. Icon packs

### 4.1 What you asked, and how I read it
"All teams have complete packs" is read here as: **every theme pack (Fight night, Neon, Chalk, Ice, Bright) gets art for every icon slot the app draws.** That means 5 tabs, 21 sports, Explore and the map pin, plus any extra packs you want. Reading "teams" as the 21 sport skins lands on the same work: every sport needs art in every pack.

### 4.2 Where the art is today
- **Branch `glyph/contour`** (worktree `projects/rollphase-wt/contour`) holds:
  - `prototype/glyph-preview/`: the 5 packs × home, gyms, partners, feed and profile, each with a `-trim.png` recolour mask (50 files).
  - Pack-style sport previews for bjj, boxing, mma, pickle and yoga only. These are shared by all packs, not per pack.
  - Older rounds (a, b, c and tab-*), plus `mocks.html` (the recolour engine) and `index.html`.
  - The tools `docs/research/2026-09-24-contour/key_green.py` and `build_trim.py`, and the raw headgear generations in `gen/`.
- **Main working copy `prototype/glyph-preview/`:** untracked and stale. It has no masks, and `f/i/n/r-profile.png` are one identical old file (md5 `a74b31f7…`).
- **`prototype/assets/sports/*.png`:** RGBA cut-outs of all 21 current sport icons. They are untracked, 17 MB, and exist on this laptop only.
- **Public site:** all of the above return 404.

### 4.3 Slot inventory (the running app, 390x844 at DPR 1)

| Slot | Today's file | On-screen size (CSS px) | Where in the code | Export size |
|---|---|---|---|---|
| Tab × 5 | `assets/tabs/<tab>.jpg`, 512 px on black, 17-24 KB | 36 (38.2 when active) | index.html:356-372 | 128 |
| Sport × 21: header chip | `assets/sports/<id>.jpg`, 1024 px, baked background, 101-293 KB | 36 | index.html:70, app.js:480 | 216 |
| Sport: home rail | same | 72 | app.js:1236, 1258 | 216 |
| Sport: hero | same | 168x148 | app.js:488 | 504 (lazy) |
| Sport: picker tile | same | 72 | app.js:2870 | 216 |
| Sport: profile row | same | 44 | app.js:2664 | 216 |
| Sport: empty-state art | same | 140 | app.js:1421-1425 (via 1869, 2017, 2027) | 504 |
| Explore | none: an "ALL" text tile, with logo.jpg as the hero | 72 / 168 | app.js:441, 522, 2858 | 216 / 504 |
| Map venue pin | Leaflet default `marker-icon.png` from unpkg, 25x41 | 25x41 (→ 32x40) | app.js:716 | 96x120, drawn from tab.gyms |
| "You are here" dot | SVG circle, r=8, teal `#2ee6c5` | 16 | app.js:703-709 | optional pack slot |
| Brand logo | `assets/logo.jpg`, 1024 px | 36 header, 56 gate, 72 desktop; also the manifest and apple-touch icon | index.html:15, 39, 63; beta.js:61 | owner question Q7 |
| Avatar | initials, or an uploaded photo | 64 | app.js:2545 | not a pack slot |
| System glyphs | Unicode ★ ✓ ☎ ‹ ▾ ↗ + ●, and a "Mic" text button | 12-20 | index.html:72, 161, 175, 273; app.js:295, 718, 1149, 1244, 1265, 1388, 1599, 1704, 1743, 1817, 1825, 1877, 2669; reviews.js:117 | a monochrome SVG line set (not the 3D packs) |

### 4.4 Coverage per pack (29 art slots = 5 tabs + 21 sports + Explore + map pin + "you" dot)

| Pack | Tabs | Sports | Explore | Map pin | "You" dot | Recolour masks | Total | Notes |
|---|---|---|---|---|---|---|---|---|
| Fight night (f) | 5/5 | 0/21 | 0/1 | 0/1 | 0/1 | tabs only | **5/29 (17%)** | Partners art is photoreal people |
| Neon (n) | 5/5 | 0/21 | 0/1 | 0/1 | 0/1 | tabs only | **5/29 (17%)** | Partners art is photoreal people |
| Chalk (k) | 5/5 | 0/21 | 0/1 | 0/1 | 0/1 | tabs only (outline rule, no gold) | **5/29 (17%)** | Partners art has green key residue; the home icon has a blue door |
| Ice (i) | 5/5 | 0/21 | 0/1 | 0/1 | 0/1 | tabs only | **5/29 (17%)** | Partners art is semi-cartoon |
| Bright (r) | 5/5 | 0/21 | 0/1 | 0/1 | 0/1 | tabs only | **5/29 (17%)** | Partners art is chibi with motion lines |
| Classic (today's JPGs) | 5/5 (JPG on black) | 21/21 (JPG; RGBA PNGs on the laptop only) | 0/1 | 0/1 (Leaflet default) | 0/1 | none | 26/29 present, **0 export-ready** | needs the RGBA export, no new generation |

All five packs use the combat headgear as Profile. The shared pack-style sport previews cover 5 of 21 sports, not per pack.

### 4.5 Proposed `prototype/packs/manifest.json`
The full version, with every hero slot spelled out, is in `iconpacks/manifest-proposal.json`. Key rule: **a pack with `"complete": false` can't be selected.**

```json
{
  "schema": 1,
  "rev": "<sha1 of every pack file; also the service-worker cache key>",
  "sizes": {
    "tab":    { "css": [36, 36], "cssActive": 38.2, "px": 128 },
    "sport":  { "css": [72, 72], "alsoAt": [36, 44], "px": 216 },
    "hero":   { "css": [168, 148], "alsoAt": [140], "px": 504, "load": "lazy, focused sport only" },
    "marker": { "css": [32, 40], "px": [96, 120], "derivedFrom": "tab.gyms" }
  },
  "slots": {
    "required": ["tab.home", "tab.gyms", "tab.partners", "tab.feed", "tab.profile",
                 "sport.explore", "sport.bjj", "sport.mma", "sport.boxing", "sport.wrestling",
                 "sport.muaythai", "sport.kickboxing", "sport.judo", "sport.weightlifting",
                 "sport.crossfit", "sport.hyrox", "sport.pickleball", "sport.tennis",
                 "sport.basketball", "sport.soccer", "sport.volleyball", "sport.pilates",
                 "sport.yoga", "sport.running", "sport.cycling", "sport.climbing",
                 "sport.swimming", "map.venue"],
    "optional": ["map.you", "hero.explore", "hero.bjj", "hero.mma", "hero.boxing"],
    "fallback": { "hero.<id>": "sport.<id> drawn at 504", "map.venue": "tab.gyms drawn at 96x120" }
  },
  "naming": "packs/<packId>/<slot>@<px>.<ext>, e.g. packs/fight/tab-home@128.png, packs/fight/tab-home@128-trim.png, packs/fight/sport-bjj@216.png",
  "formats": {
    "art": "PNG or lossless WebP when the slot has a trim mask (recolour reads exact pixels); lossy WebP q90 only for unmasked slots",
    "trim": "8-bit grey PNG, same box as the art, 0 below 0.15",
    "sdf": "optional 8-bit grey outside-distance PNG, reach = 6*(w/104)+8 px; removes the runtime distance transform"
  },
  "packs": {
    "fight":   { "name": "Fight night", "art": "f", "trim": "gold", "hue": { "default": 43, "source": "OWNER DECIDES (Q1)" }, "vis": 46, "complete": false,
                 "files": {
                   "tab.home":  { "img": "tab-home@128.png", "trim": "tab-home@128-trim.png", "sdf": "tab-home@128-sdf.png" },
                   "sport.bjj": { "img": "sport-bjj@216.png", "trim": "sport-bjj@216-trim.png" }
                 } },
    "neon":    { "name": "Neon",    "art": "n", "trim": "gold",    "complete": false },
    "chalk":   { "name": "Chalk",   "art": "k", "trim": "outline", "complete": false },
    "ice":     { "name": "Ice",     "art": "i", "trim": "gold",    "complete": false },
    "bright":  { "name": "Bright",  "art": "r", "trim": "gold",    "complete": false },
    "classic": { "name": "Classic", "recolor": false,               "complete": false }
  }
}
```
(The `optional` list above is shortened. The real file lists `hero.<id>` for all 21 sports, and each pack's `files` holds every required slot.)

### 4.6 Asset budget (measured unless marked estimated; `iconpacks/budget.json`, `iconpacks/sdf.json`)

| Item | Today | Proposed per pack |
|---|---|---|
| 5 tabs | 512-px JPGs, ~100 KB total. The pack masters are 1.8-2.85 MB per 5-tab set (never ship these). | @128: PNG 94-119 KB, lossless WebP 67-88 KB, trims 16-23 KB |
| 21 sports | 1024-px JPGs, 4.42 MB total; opening the picker downloads 4.95 MB | @216: lossless ≈ 0.6 MB (*estimated*); lossy WebP 324 KB for unmasked classic art |
| 21 sport trims | none | ≈ 0.17 MB (*estimated* from the tab ratio) |
| Heroes @504 | the same 1024 JPGs | lossy WebP 1.11 MB for all 21, but only the focused sport's hero loads |
| SDF sidecars (optional) | none | 2.3-3.6 KB per tab, 7.7-9.4 KB per sport |
| **A complete pack** | n/a | **≈ 0.9 MB** (+ one ~50 KB hero at a time) |
| Pre-rendered colour variants (rejected) | n/a | 9 hues × 3 visibility levels = 662 KB of tabs + 8.7 MB of sports per pack, and it still can't give a free slider |
| Runtime memory | n/a | 23.6 MB for 21 sports @216 (evict off-screen art) |

### 4.7 Integration design
1. **Files:** `prototype/packs/manifest.json`, `prototype/packs/<pack>/…`, `prototype/pack-renderer.js` (the main-thread API) and `prototype/pack-worker.js`. The worker runs the `renderSheet`/`blit` math from mocks.html on an OffscreenCanvas.
2. **Rendering:** the worker recolours the *exports*, not the masters. It turns each result into a blob URL and puts it into the existing `<img>`, so layout and accessibility are unchanged.
   - Order: tabs first, then the visible sports (IntersectionObserver), then the focused sport's hero.
   - Slider events are coalesced to `requestAnimationFrame`.
   - Rendered blobs are cached in Cache Storage under the key `pack/hue/vis/slot`, so a cold start shows the last look with no flash.
   - Measured timings: 5 tabs repaint in 4-5 ms (13-35 ms at 4x throttle), all 26 icons in 17-31 ms, and 21 sports precompute once per pack in ~0.37 s.
3. **CSS:** pack slots get a class, `.is-pack`, with no mask, no `object-position` and no accent glow (see Q2), and the box matches the image size. Classic JPG slots keep the mask until they're replaced.
4. **Settings card "Look · Icon pack",** placed above "Look · I represent":
   - pack chips, each with a live 5-tab preview (16-25 ms per pack)
   - a Hue mode switch: "Match sport" / "My colour"
   - a 0-360 hue slider with the 9 jump chips from mocks.html
   - a Visibility slider (0-100) and Reset
   - only complete packs can be selected
5. **Saving:** store `{iconPack, iconHueMode, iconHue, iconVis}` in `rollphase.settings.v1`, next to the text-size and vibration prefs, and apply them before the first tab paint.
6. **Service worker:**
   - Keep a `rollphase-packs-<rev>` cache that the per-ship wipe leaves alone.
   - Precache the active pack, plus every pack's 5 tabs at 72 px for the picker previews.
   - Serve images cache-first.
   - Use content-hashed file names, because Pages ignores query strings.
7. **Map pin:** an `L.icon` built from the rendered tab.gyms blob (32x40, anchor 16,40). The "you" dot and the popup button read `--accent`.
8. **Fallback:** `img onerror` falls back to classic art.
9. **System glyphs:** a separate monochrome SVG line set (Lucide, vendored, which matches your front-end stack rule), tinted with `--accent`. It is not part of the 3D packs.
10. **App icon:** a PNG set (M29) exported from the brand logo, or from the chosen pack if that's your answer to Q7.

### 4.8 Extra packs (you said you'd like more)
The manifest takes any number of packs. **Each new pack costs 27 generated images** (5 tabs + 21 sports + Explore), plus masks. Candidates for you to choose from:
- **Carbon:** a carbon-fibre body with a brushed-steel edge that takes the hue. Suits the dark fight and lifting skins.
- **Clay:** soft matte clay in muted tones with a coloured rim. Made for the light, low-colour skins (Yoga, Pilates, Judo, Weightlifting), where gold looks muddy.
- **Chrome** (optional third): mirror chrome with a coloured rim.

### 4.9 Open design questions for you
1. **Q1 — Who owns the contour colour?** Proposed order: your fixed hue > club colour (when the "I represent" strip is on) > sport accent > the pack's default gold (43). The Explore, Judo, Weightlifting and Yoga accents are almost grey, so "Match sport" falls back to gold there.
2. **Q2 — The active tab:** keep either the sport-accent glow tile or the pack contour, not both.
3. **Q3 — Sport icons:** generate them per pack (110 new images for the five packs; I read "complete packs" as this), or use one shared cut-out set with only the contour treatment (0 new images, a weaker look)?
4. **Q4 — Sport skins vs icon packs:** these are separate dials. A skin sets the UI colours (22 of them); a pack sets the icon material. Should a sport skin suggest a default pack (for example Chalk on Yoga), or is the pack purely the user's choice?
5. **Q5 — Partners is still people with faces in every pack.** They're photoreal in Fight night and Neon and cartoon in Chalk, Ice and Bright, and each figure is about 9 px wide at tab size. Keep people, go faceless, or switch to an object (for example two gloves touching)? The live app also still uses a human bust (`tabs/profile.jpg`) and two silhouettes (`tabs/partners.jpg`).
6. **Q6 — The Profile headgear you picked is the same object as today's Wrestling icon.** Change Wrestling (singlet, wrestling shoes or mat) when the sport art is generated, or pick a different Profile object?
7. **Q7 — Should the brand logo and install icon follow the pack, or stay fixed?**
8. **Q8 — Which extra packs, and how many?** (Carbon, Clay, Chrome, or your own idea.)
9. **Q9 — OK to add a thin dark rim** to Chalk's white art on the light skins (Judo, Weightlifting) if the contrast check fails?

---

## 5. Build lanes (Cursor cloud agents, Grok 4.7, one branch per lane)

**Ground rules**
- Every lane runs as a Cursor **cloud** agent, not the Grok CLI.
- Each lane gets its own branch off `master`, except the image lanes (see below).
- **No two lanes in the same wave touch the same file.** A later wave starts from the merged result of the one before.
- app.js is touched by most fixes, so its work is split into four lanes in a row (A1 → A2 → A3 → A4).
- To keep it frugal, run the lanes in the listed order. Only lanes in the same wave may run in parallel.
- **Acceptance checks are runs, not greps:** Playwright in real Chrome, 390x844 at DPR 1, with Austin location and with location denied. No mocks and no loosened assertions. From wave 2 on, every lane also runs the smoke test that lane G adds.
- The Cursor cloud-agents key file is present on the laptop (checked 2026-09-25).

**Contracts between wave-1 lanes** (so they never need each other's files):
- **C → E:** places carry `osmSports[]`, `indoor` and `hoursKnown`. The data.js pills test only those fields, plus distance and open-now.
- **F → E:** sport images live at `assets/sports/<id>@216.webp` and `@504.webp`, and data.js points there.
- **B ↔ D:** B replaces the pill row with one header button; D removes the 64-px margin.
- **H → B:** the feedback endpoint URL comes from `window.ROLLPHASE_CONFIG.feedbackEndpoint` (F's public config). The payload is `{text, screen, build, contact?}`.
- **C → A2:** `fetchNearby` takes an `onPartial(places, sourceStatus)` callback.
- **A2 → D:** A2 sets `document.documentElement.dataset.sport`; D's overlay rules read `html[data-sport]`.

### 5a. Code lanes

| Wave | Lane | Files it owns | Goal | Acceptance checks (all run in Chrome) |
|---|---|---|---|---|
| 1 | **A1 app-stability** | `prototype/app.js` | B1, B4, B5, M18 (in-flight guard, drop the boot duplicate), M19 (request token), M20 (location only after consent), M13 (downscale photo and crest), the app.js part of N19, boot fallback to `#/home`, `keyboard:false` on the map and markers (B2). | 0 page errors across all tabs and Settings. Reload on `#/profile`, `#/profile/feedback` and `#/profile/about` shows no overlay and >0 venues. Social shows 6 inputs. Name, Save place, notify, privacy and represent survive a reload with no other action. Just exploring → My sports leaves name, sports and favourites unchanged. A cold boot makes 1 reverse geocode and 1 request per search term. With BJJ delayed 6 s, switching to Yoga keeps the Yoga results. 0 geolocation or third-party requests before the gate is accepted. A 6 MB photo is kept (<600 KB stored) and the crest survives. |
| 1 | **B beta-update** | `prototype/beta.js`, `prototype/update-check.js` | B3 (`TERMS_VERSION`). The client side of B7 (POST to the endpoint, success only on 2xx, offline queue, mailto with a recipient as fallback, clipboard catch, close via `betaCloseOverlay`). N42 (contacts go with feedback). M07 (real label states). M08 (online and version guard, drop the hash). N16, N25. N23 (60-120 s poll plus on visibility). N31 (checkbox next to Enter). M32 (one header button). Reload on first install only when a previous controller existed. | Accept at 10 s, then reload three times and open a new tab: the gate stays hidden. Feedback with the endpoint routed to 200 shows success; routed to 500 or offline it shows an error, is queued, and is sent when back online. The label reads "Update ready" with a newer version.json and "Couldn't check" offline. "Refresh app" offline keeps the app. Refresh online = 1 navigation. A fresh first visit = 1 document load. 0 unhandled rejections. |
| 1 | **C places-live** | `prototype/places-live.js`, `prototype/vendor/opening_hours/**` (new), `prototype/config.example.js` | The data side of B9 (sport-aware Overpass, distance sort before the cap). M15 (opening_hours library, venue time zone). M16 (parallel mirrors, 8 s budget, drop kumi, `onPartial`, per-source status). M21, M14. N17 (http/https only). N06. HTTP status carried on errors (N08, N09). A 1 request/s Nominatim queue and reverse-lookup cache, and no User-Agent header (M18). Canonical OSM keys (M17). No contact bits or "Nearby" in tags (M33). | Against recorded Austin answers plus one live run: the pickleball list includes Austin Pickle Ranch. Boxing reports an honest "no sport match". `openFromHours` passes 8 of 8 cases (commas, overnight), and a Tokyo-zone viewer gets Austin hours in Austin time. With Overpass hanging, first results arrive in <5 s with a source-failed flag. No two Nominatim calls <1 s apart. A `javascript:` website becomes `''`. UFCU is not MMA; baseball fields are not Lifting. |
| 1 | **D skins** | `prototype/skins.css` | The CSS side of B2 (stage height, tab bar above the sheet, credit visible). The CSS side of N15. N26, N28, N29, M34. M32 (remove the 64-px margin). N33 (4 patterns on `#representStrip[data-pattern]`). The popup button uses `--accent` (N34). The overlay rules read `html[data-sport]` (M31). | At 360x780, 375x667, 390x844, 393x852, 412x915 and 430x932, all 5 tab centres hit `.tab-bar` on the Gyms map. The first tap on a pin opens its popup. The attribution sits fully inside the viewport. The picker's last tile is above the tab bar. MMA text pairs ≥ 4.5:1. The primary profile name is ≤ 2 lines at 360. Each pattern changes ≥ 1% of the strip's pixels. No sideways scroll at any width. |
| 1 | **E data-reviews** | `prototype/data.js`, `prototype/reviews.js`, `prototype/nix-client.js` | B6 (empty default profile). M10 (level lists per sport). The data side of M11 (only data-backed pills, per the C contract). M22 (drop `roiSurfaces`). N03, N05. The reviews.js side of B8 (store venue name, lat, lng and OSM key; a stable local user id; one visit per check-in). N19, the reviews.js side of N21. M06 (a real local refine that describes its change, or "unavailable"). Icon paths per the F contract. | A fresh context has 0 sports and no level text anywhere. Every pill gives >0 on at least one recorded city, or it's gone. Every calendar URL returns GET 200 with no http hop. With `'{}'` in reviews storage, venue detail opens. Refine on a low-contrast logo changes ≥ 1 colour and says what changed. |
| 1 | **F shell-assets** | `prototype/index.html`, `prototype/sw.js`, `prototype/manifest.webmanifest`, `prototype/assets/**` (not packs), `prototype/vendor/leaflet/**` (new), `prototype/config.public.js` (new), `prototype/_headers`, `prototype/styles.css` | M30 (self-hosted Leaflet, precached). M29 and N41 (PNG icon set and favicon, exported from logo.jpg). M35 and M38 (216/504 WebP exports of the RGBA cut-outs; **needs the masters, see "waiting on you" item 6**), plus the index.html:70 fix. M39 and N37 (images cache-first in a kept cache, shell precache). N36 (delete dead files). N07. N17 (CSP meta). | Installability shows no icon error. With unpkg blocked, the map still renders. After the first visit, a reload makes 0 network image fetches. Opening the picker loads ≤ 0.6 MB of images. A clean load logs no 404. |
| 1 | **G pipeline-tests** | `scripts/**`, `.github/**` (new), `docs/**`, `.gitignore`, `AGENTS.md`, `SESSION_HANDOFF.md`, `README.md`, `prototype/qa-smoke.mjs`, `tests/**` (new) | M23 (a Playwright smoke test replaces qa-smoke). M25 (an Actions workflow deploys a runtime-only artifact to Pages) and M27 (content-hashed names in that artifact). M28 and N22 (exit codes, explicit staging). N23 (unique build ids, sha taken after the commit, message required). N24. Docs name one host (M26, per your answer) and honest update timing. Gitignore glyph-preview, the sports masters and visual/assets. | The smoke test **fails on current master** (it catches B1) and passes after A1. A workflow run publishes, and the served `app.<hash>.js` changes on each ship. `ship.ps1` with a failing push exits non-zero and prints no success line. Two bumps in one minute give different ids. On the published site, `enrich_server.py`, `qa-smoke.mjs` and `README.md` return 404. |
| 1 | **H backend** (new files only, plus the enrich server) | `supabase/**` (new), `prototype/backend-client.js` (new), `prototype/enrich_server.py` | M01, following `docs/BACKEND_DECISION.md` and `docs/SUPABASE_SETUP_RUNBOOK.md`: tables with row-level security for profiles (levels, open-to-train, privacy, age band), reviews, visits (proximity checked on the server), favourites, follows, check-ins/presence, partner requests, events, gear wants/haves, feedback and beta contacts. A feedback edge function. `backend-client.js` exposing the API that A3 will call. M24 hardening for hosting on Forge. **Needs a Supabase project and keys from you.** | Migrations apply to a fresh project. Row-level-security tests: user A can't read user B's private rows. A feedback POST returns 200 and stores a row. A visit more than 150 m from the venue is rejected. Enrich rejects `[::]`, `198.18.0.1`, `224.0.0.1` and origins not on the allow-list. |
| 2 | **A2 app-venues-map** | `prototype/app.js` | The app side of B9 (filter to the sport, an "Other venues nearby" section, honest headings and counts). M11 wiring. M14 (Directions on the detail page). M16 (progressive render plus "some sources didn't respond"). M17 (open the detail from stored data). M33 markup. M09. The app side of M30 ("map unavailable", auto List, cached last list). M31 (`html[data-sport]`). N02, N04, N08-N14, N15 (empty state and `replaceNav` order), N20, N30, N32. M22 (remove the card). Migrate profiles that equal the old seed (B6). | Pickleball in Austin lists only pickleball venues, with the rest under "Other venues nearby". The Home "Pickleball near you" module lists matches or says there are none. A share link opened in a fresh context with Chicago GPS opens the gym. An unknown id shows "not found" with a Maps link. After a Chicago search, Refresh stays on Chicago. Panning then "Search this area" returns new results. Zoom is kept after returning from a detail page. Feedback and About use the skin accent on 6 skins. With unpkg blocked, a notice shows and List opens. |
| 2 | **I1 pack-engine** (new files only) | `prototype/packs/manifest.json`, `prototype/pack-renderer.js`, `prototype/pack-worker.js` | Build the section-4 design on the existing f/n/k/i/r tab art, then pick up the image lanes' exports as they land. | A hue change on 5 tabs @128 repaints in <16 ms at CPU 1x and <50 ms at 4x. 21 sports precompute in <400 ms at 1x. No main-thread task >50 ms during a slider drag. At hue 218, ≥95% of trim pixels move and body pixels stay unchanged. A pack with `complete:false` is refused. |
| 3 | **A3 app-profile-social** | `prototype/app.js` | M10 (level editor). M03. M02 (follows by venue id through the backend). M04 (the `profile.privacy` object). M05 (a single Notify handler, plus Web Push if you approve it). M06 wiring. The app side of M12 (replace the teen switch per your answer to "waiting on you" item 8). The app side of B8 (no pre-filled stars; "verified" only from the backend). M01 wiring for partners, events, gear, presence, reviews and feedback. N21 (remove "Vlad"). N14. | Two browser profiles: a review posted in A appears in B. A check-in by A shows in B's Here now. A partner who is open to train appears for B within the same age band only. Follow, privacy, level and check-in all survive a reload. One tap on Notify turns it on. |
| 3 | **F2 shell-markup** | `prototype/index.html`, `prototype/sw.js` | Replace the teen self-service markup per your answer to "waiting on you" item 8. Add the pack-picker card markup. Add script tags for `backend-client.js` and `pack-renderer.js`. Add the Lucide SVG sprite for system glyphs. Precache the packs cache. | 0 page errors. The Settings card order matches section 4.7. Offline after one visit shows the chosen pack's tabs. |
| 3 | **D2 skins-packs** | `prototype/skins.css` | `.is-pack` slot rules (no mask or glow, box equals the image). Pack-picker card styles. Sizing for the SVG glyphs. | 0% contour loss on pack slots (repeat the `v_mask` pixel count). Classic slots show no black squares. |
| 4 | **A4 app-packs** | `prototype/app.js` | Save and apply the pack setting before first paint. Fill the tab, sport, Explore, hero and map-pin slots from the renderer. Hue modes per your answer to Q1. A map `L.icon` built from tab.gyms. An `onerror` fallback to classic art. | Switching packs changes all 26 visible art slots within 100 ms. A reload keeps the pack, hue and visibility. Offline shows the chosen pack. The public deploy shows the picker. Incomplete packs can't be selected. |

### 5b. Image-generation lanes (a separate track)
- **Base branch:** `master`, like the code lanes. Nobody merges `glyph/contour` wholesale, because it would drag in the 17 MB `glyph-preview/` and `docs/research/` that lane G gitignores. Instead, each image lane copies `key_green.py`, `build_trim.py` and its own pack's tab art and trims from `glyph/contour` into `packs-src/`.
- **Files each lane owns:** only `packs-src/<pack>/**` (raw generations, `PROMPTS.md` and the 1024-px keyed masters, kept outside `prototype/`) and `prototype/packs/<pack>/**` (exports, trims and a per-pack `pack.json` with its slot list and `complete` flag). The shared `prototype/packs/manifest.json` belongs to lane I1, which builds it from the `pack.json` files. No two lanes share a folder, so they can run in parallel with each other and with the code lanes.
- **Method:** the same as follow-up 6. Use the agent's image generator (Nano Banana Pro). Use a flat `#00B140` background, a 3/4 view filling about 80% of the frame, soft light from the upper right, and an **object only: no person, face, text or logo**. Match that pack's material using its `-home` and `-gyms` art as the style reference. Use the same object per sport as today's classic icons, except Wrestling, which follows your answer to Q6.
- **If the cloud environment has no image-generation tool, STOP:** write one line saying so and end the run.
- **Suggested start:** run IMG-1 alone as a pilot, review it, then start the rest.

| Lane | Pack | New images | Contents |
|---|---|---|---|
| IMG-1 | Fight night | **22** (+1 if Partners goes faceless) | 21 sports + Explore |
| IMG-2 | Neon | **22** (+1) | 21 sports + Explore |
| IMG-3 | Chalk | **22** (+1) | 21 sports + Explore; also re-key the Partners art to remove the green residue |
| IMG-4 | Ice | **22** (+1) | 21 sports + Explore |
| IMG-5 | Bright | **22** (+1) | 21 sports + Explore |
| | *Completing the five packs* | **110** (115 with faceless Partners) | |
| IMG-6 | Extra pack #1 (for example Carbon) | **27** | 5 tabs + 21 sports + Explore |
| IMG-7 | Extra pack #2 (for example Clay) | **27** | 5 tabs + 21 sports + Explore |
| | *Total with two extra packs* | **164** (169 with faceless Partners) | each further pack adds 27 |

- **Classic pack:** no generation needed. Lane F exports it from the existing RGBA cut-outs.
- **Map pin:** no generation needed. It's drawn from each pack's gyms art.

**Acceptance for every image lane:**
- Every required manifest slot exists.
- The 1024-px RGBA masters have no green fringe at 4x zoom: on the edge, the green channel is never above both neighbours.
- Trim masks follow the `build_trim.py` rules: for gold packs, only the gold piping; for Chalk, the outline rule.
- Exports exist at 216 (sports), 504 (heroes) and 128 (tabs, for new packs).
- A DPR-1 contact sheet at 36, 44 and 72 px, rendered at hues 43, 218 and 322 and visibility 0, 46 and 100.
- Every icon reads as its sport at 36 px, and the camera and framing are the same across the pack.
- Prompts are recorded in `PROMPTS.md`.
- The pack's own `pack.json` sets `"complete": true` only when all 28 required slots exist; lane I1 carries that into the manifest.

---

## 6. What this QA could not check, and why

- **Real phones and iOS:** every run was desktop Chrome headless, emulating 390x844. The tab-bar and first-tap problems (B2) were reproduced with emulated touch and mouse, not on a device. There was no Safari/iOS run and no adb (house rule).
- **Google Places with a real key:** only a stand-in key and routed responses were used; no request reached Google.
- **`enrich_server.py` in place:** running it writes `.enrich-cache.json` inside `projects/`, so only a scratch copy was run. Whether 951-932-8400 is a real number is unknown.
- **Chrome's local-network permission prompt** for the `127.0.0.1` POST on a real phone (headless reports it as denied).
- **Whether GitHub Pages clears its edge cache on deploy:** that needs a real publish, so the 10-minute window in M27 is the worst case. A cold open right after a real ship was not observed either.
- **Phone links and voice:** `tel:` links were checked for format, not dialled. The Mic button can't return speech results headless.
- **mailto:** it can't be intercepted. In the code-review pass the OS may have opened a blank mail draft on the laptop. Nothing was sent to anyone.
- **Claims that were read in code, not re-run by the verifiers:** LD-13, LD-17, LD-18, CR-19, CR-22, CR-24, CR-30, the clipboard and raw-text parts of F26, the V21 hours collision, the V22 swatch labels, and the MAPS-13 stale-cache notice. The PNG-icon install fix was shown by two passes but not re-run by the links verifier.
- **No verdict:** V16, V19 and V20 (dropped).
- **Not covered visually:** the gym-detail Reviews, Hours, Here now and Links panels per skin; the "Just exploring" screens; Gear Needs; the represent studio with an uploaded logo; live city geocoding.
- **Accessibility beyond contrast:** no screen-reader or keyboard-only audit.
- **Test-server flakiness:** under parallel QA load, the local 127.0.0.1:8880 server sometimes refused requests. The visual pass re-ran its yoga skin (the first run had no CSS), and the icon pass's `iconpacks/flaky-noroute-local.json` runs show broken tab icons for that reason. Those shots are harness artefacts, not app defects.
- **Performance on a real mid-range phone:** only CPU throttling in the icon benchmark.
- **Image generation in your Cursor cloud account:** follow-up 6 depended on it, but I didn't check it here.
- **API budget:** the ~25-request guideline was exceeded.
  - The finder passes alone made about 160 requests to Nominatim, Photon and Overpass, plus ~70 OSM tile fetches. The verifiers made more (live Overpass probes, public-beta runs) that were not all counted.
  - Much of it is the app's own duplicate traffic (M18).
  - Nominatim calls were spaced ≥ 1.1 s wherever the test harness controlled the replies.
  - Overpass read-only queries (POST) were allowed in some passes and blocked in others.
  - Nothing went to formsubmit, to mailto, or to any other third-party POST.

---

## 7. Waiting on you (one ordered list)

1. **Backend go-ahead.** Provision the Supabase project (free tier for build, per `docs/BACKEND_DECISION.md`; the paid Pro tier is your call) and share the keys through the runbook. Real fixes for B7, B8, M01-M05 and M12 depend on it. The alternative is a "coming soon" label per surface; which surfaces get it is your call.
2. **Feedback destination:** which inbox or endpoint receives reports.
3. **One public host:** reconnect Render and redeploy, or retire it with a redirect to the Pages URL (M26).
4. **Venue enrichment:** host it on Forge (free, behind Tailscale Funnel), or drop it (M24).
5. **Icon-pack answers Q1-Q9** (section 4.9). The most urgent are Q3 (per-pack sport art, 110 images), Q5 (Partners faces), Q6 (Wrestling vs the Profile headgear) and Q8 (which extra packs).
6. **The 21 RGBA sport cut-outs** (`prototype/assets/sports/*.png`, 17 MB) exist only on this laptop, untracked. Lane F needs them somewhere a cloud agent can reach, such as an assets branch or a separate repo.
7. **The "Your Muse" card:** ship it, hold it or drop it (it's uncommitted local work; N01).
8. **Teen safety:** how ages will be verified (M12).
9. **Lane order:** run wave 1 in the listed order (A1 and G first give the fastest proof). Start the image track with the IMG-1 pilot.

---

## Appendix A: scoring checklists (1 = works, 0.5 = partly, 0 = broken or missing)

**Functional (12.5 / 35):**
- Scored 1: sport picker and 22 skins; Home jumps and cards open detail; city search; location-denied path; add/remove/primary sport; text size and vibration; About sheet.
- Scored 0.5: tab navigation (B2); live venues near me (B9); filters (M11); venue detail panels (M01); check-in flow (M03, B8); deep link `#/gym/<id>` (M09); events outbound links (N03); represent studio (M06, N33, B4); update banner and Restart (M07); offline (M08, M30); back/history (N02).
- Scored 0: gate accepted once (B3); browse-mode toggle (B5); first-run profile (B6); Save place (B4); Follow (M02); reviews reach others (B8); share link (M09); Partners (M01); Feed Live/Updates (M01); Profile renders (B1); name/area/photo saved (B4, M13); level per sport (M10); notifications (M05); privacy/open to train (M04); teen safety (M12); Gear (M01); feedback (B7).

**Maps + live data (9 / 20):**
- Scored 1: real tiles on local and public; no invented venues; city search; denied path; phone/website/hours match the source; Go directions.
- Scored 0.5: pins and popup (B2); Open now (M15); Open in Google Maps (M14); sport tags (M21); filters (M11); degrading when a source fails (M16, N09).
- Scored 0: map layout leaves the tab bar and credit usable (B2); results match the sport (B9); polite request pattern (M18); enrichment on public (M24); Google path (N06); offline map / CDN outage (M30); pan, Refresh and search-this-area (N11-N13); reviews and places keep their venue (M17).

**Links (6 / 12):**
- Scored 1: 25 outside URLs return 200; tel: format; Go directions.
- Scored 0.5: calendar URLs current (N05); every sport has an events link (N03); Open in Google Maps (M14); canonical deep link (M09); OSM website links safe (N17); no dead local links (N01 is local-only).
- Scored 0: link labels match the destination (N04); share link (M09); map attribution links (B2).

**Deploy pipeline (7 / 17):**
- Scored 1: public = master; map deploys; no secrets; manifest scope; service worker plus offline shell; update detection.
- Scored 0.5: unique build ids (N23); same buildId = same code (N01).
- Scored 0: update arrives within the promised time (M27); automated publish (M25); honest ship script (M28); one current host (M26); installable (M29); no 404s on load (N07); CSP/headers/SRI (N17); runtime-only publish (N24); a pre-ship test that runs the app (M23).

**Code quality (4 / 14):**
- Scored 1: no seeded fake listings; no secrets in history; update mechanism.
- Scored 0.5: live data escaped (N18 is latent); hours parser (M15).
- Scored 0: main paths free of script errors (B1, N06); every change saved (B4); one search per trigger, stale results dropped (M18, M19); link schemes validated (N17); storage guarded (N19); plain error text (N08); no dev-only values in production (M24, N21, M02); an automated test that runs the app (M23); no dead code or files (N20, N36).

**Visual (6.5 / 18):**
- Scored 1: 22 skins consistent; no sideways overflow from 360 to 430; loading and denied states.
- Scored 0.5: tab icons crisp at DPR 1 (N27); small-text contrast (N26); Large text (N28); picker layout (N15); gym detail layout (N29); desktop stage (N30); gate layout (N31).
- Scored 0: tab bar reachable everywhere (B2); one icon language (M35, M36); sport icons on skin colours (M35); overlays follow the skin (M31); chrome leaves room (M32); clean venue cards (M33); profile layout (M34); styled map (N34).

**Icon packs (2 / 12):**
- Scored 1: tab art for all 5 packs.
- Scored 0.5: recolour masks (tabs only); a consistent style inside each pack (N38, N40).
- Scored 0: sport art per pack; Explore art; map-pin art; manifest; a fast renderer at shipping size (M40, only benchmarked); Settings picker; saved choice; deployed; app CSS keeps the contour (M37).

# Levels and Match (Kids Match inside)

Architect's design, 2026-09-27. It builds on the Mat Board (`DESIGN.md`) and Family Access
(`supabase/migrations/20260927020000_kids_classes_counts_only.sql`). Nothing here is built yet except where it says so.

## The rule, in one line

**Anyone can see when the kids train. Only a verified parent can find a kid to train with, and only when the other parent says yes, at a gym that hosts it.**

| | Anyone (even signed out) | Signed-in adult, no verified kid | Verified parent (free) | Verified parent (Pro) |
|---|---|---|---|---|
| Kids/teen class times on a gym's board | yes | yes | yes | yes |
| How many kids are coming to a kids class | no | no | yes (at that gym) | yes |
| Which kids are coming | never, to anyone but the kid's own parent | | | |
| Sign a child up for a kids class | no | no | own child only | own child only |
| Search for kids to train with (Kids Match) | no | **does not exist for them** (no screen, the call is refused) | no | yes, with the gates below |
| Top kids teams near a city (academy level) | no | no | yes | yes |

The top half is Family Access (written; the corrected version waits on the owner's go to apply). The bottom half is new.

## 1. Levels: one ladder per sport

Every sport in the app already carries a level string on the profile (`PROFILE_DEFAULT.sports[].level` in
`prototype/data.js`, e.g. "Blue belt", "DUPR 3.5", "Novice"), and the Partners filters already say "My belt ±1" /
"My level". Levels makes that string a real, ordered, verifiable value.

- `level_systems`: one row per sport and audience (adult or kids), e.g. `bjj-adult`, `bjj-kids`, `tennis-utr`.
- `levels`: the ordered rungs of each system (`ordinal` 1..n, `label`, optional `min_age`/`max_age`).
- `athlete_levels`: one row per person or child, per sport: the rung, the weight band (combat sports), and the **evidence**.

Matching compares ordinals inside one system, so "±1 belt" and "UTR within 1.0" are the same query.

| Sport(s) | Adult ladder | Kids ladder | Comp record comes from |
|---|---|---|---|
| BJJ | white, blue, purple, brown, black (+ degrees) | the IBJJF kids belts, 13 rungs: white; grey, yellow, orange, green, each as color-white / solid / color-black. Yellow from age 7, orange from 10, green from 13 | IBJJF ranking (kids included since IBJJF added kids rankings), Smoothcomp events (ADCC, Grappling Industries, Fuji and others run ranking lists there) |
| Judo | kyu / dan | junior grades | national federation results |
| Wrestling | experience + weight class + record | age and weight divisions | tournament results |
| Boxing, MMA, Muay Thai, Kickboxing | experience tier + amateur record | experience tier + weight (where the sanctioning body allows youth bouts) | sanctioning body records |
| Tennis, Pickleball | UTR / NTRP; DUPR / UTR-P | UTR (and color-ball ratings for young players) | UTR Engage API (official, player connects by OAuth) |
| Swimming | age-group / masters times | USA Swimming motivational standards (B, BB, A, AA, AAA, AAAA) | meet results |
| Cycling | race category (Cat 5 up to Cat 1) | junior categories | race results |
| Climbing | V-grade / YDS | same | none needed |
| Running, HYROX, CrossFit, Weightlifting | PRs / division (Open, Pro) / Open percentile / total | age groups | race and meet results |
| Basketball, Soccer, Volleyball | rec, club, high school, college, pro | club tiers by age | none needed |
| Yoga, Pilates | experience only (not matchable for competition) | none | none |

Before any row ships, the implementer checks the ladder against the sport's governing body and cites the page. The table is the shape, not a source.

### Evidence tiers (shown as a badge next to the level)

1. **Self**: typed by the person or the parent. Shown as plain text, never used to rank.
2. **Peers**: the belt handshake that already exists (`attest_belt`: three people who trained at the same adult class). Adults only. The handshake refuses kids check-ins by design, so **a kid's level can only be verified by the gym or by a federation record**. That is a feature: no adult ever "confirms" a child.
3. **Gym**: staff at the child's (or adult's) verified gym confirm the rung. Uses the `gym_staff` table that exists.
4. **Federation**: a comp record the person or parent claimed and the gym confirmed (see section 4).

## 2. Match for adults (replaces the fake "Training partners" list)

- **Free**: at your gym and gyms near you, "who's in" on the board filtered by your level window. A match is an invitation to tap "I'm in" on the same slot, which the board already has. No new messaging.
- **Pro**: search another city for a date range (travel), filter by level window, weight band and comp record, and see ranked members who opted in. The invitation is still "meet at this gym, this slot".

## 3. Kids Match (Pro)

### Who can search (all four gates, checked in the database, not the UI)
1. **Pro** (`has_pro()`).
2. **Verified family** at some gym (exists: permanent account + a child + gym-staff or admin verification).
3. **Phone verified** (Supabase phone confirmation on the parent's account).
4. **Reciprocity**: the searching parent's own child is opted in for that sport. Nobody browses kids without their own kid being visible under the same rules. This removes lurkers.

An adult without a verified kid never sees the Kids Match screen, and the search function refuses them.

### What a result shows
Age band, level (with its evidence badge), weight band, gi / no-gi, the verified comp summary ("3 podiums this season"), home gym and city.
**Never** a name, photo, initial, exact age, birthday, school or schedule. Each result carries a one-time card token, not the child's id, so a child cannot be tracked across searches.

The match window is the child's competition age division ± one division and level ± one rung, so an 11-year-old orange belt never surfaces a 15-year-old green belt. Parents can narrow it; they cannot widen it past the window.

### The consent chain (each step is a row; nothing skips ahead)
1. **Request**: parent A picks a card, a host gym from the board and a proposed time. There is a structured form, with no free-text message to start.
2. **Accept**: parent B sees A's verified-family badge, A's child's card and the host gym, then accepts or declines. A decline is silent (A sees "not available").
3. **Phone**: on mutual accept, each parent sees the other's verified phone number. They call.
4. **Agreement**: each parent taps "We spoke on the phone and agree" and types their full name. The app stores both, with a timestamp. This is the record that both parents consented.
5. **Host gym**: staff at the host gym approve the session (it happens on their mats, under their waiver and supervision). No gym approval means no session. **Kids Match never happens at a private place.**
6. **Day of**: both parents check in at the gym (the 150 m check-in that exists). A parent must be present. The child never has an account and never checks in alone.
7. **After**: each parent confirms it happened. Either one can report.
8. **Report**: any report freezes both families' Kids Match access at once, pending review by the platform admin. Everything above is kept in an append-only audit log.

### What never exists
There is no child account, no adult-to-child messaging and no child photo. Nobody can search kids by name, and the assistant/API can't reach kids search. Nobody without a verified kid can see a kid's card.

## 4. Rankings: "who's good near Phoenix"

Two views that never become a directory of children:
1. **Top kids teams near a city**: academy-level counts from permitted sources ("Academy X: 14 kids podiums this season"). No child names. Verified parents, free.
2. **Ranked kids open to matches**: only opted-in kids whose comp record was claimed and confirmed, sorted by verified level and points, shown as the anonymous cards above. Pro.

For adults, public competition results are shown as the source publishes them, with a link back. A ranked adult can be contacted only if they are a member who opted in.

### How the data gets in (the "smart webhooks and search engines")
- **Scrapling is the fetch engine**, running on Forge on a schedule. It holds the only write key, which is never in the app.
- Every source is a row in `source_adapters` with a `terms_state`: `permitted`, `permission-pending`, `prohibited` or `unchecked`. The runner refuses anything that is not `permitted`, so the pipeline cannot ship a scrape the terms forbid.
- **Claims**: a parent (or adult) pastes their own athlete page link, the gym staff confirm it is that child, and only then do results attach to the profile (`athlete_claims`, `comp_results`).
- **Webhooks**: a database webhook on new `comp_results` calls an Edge Function that sends a web push to the parent ("New result: silver at ..."). Push is already in the schema (`push_subscriptions`).

**Source status found on 2026-09-27** (ToS text quoted in the owner's report):
- **IBJJF**: its [Terms of Use](https://ibjjf.com/terms-of-use) prohibit scrapers, systematic retrieval to build a database, and commercial reuse without written permission. State: `prohibited` until IBJJF gives written permission. robots.txt allows crawling, but the terms are what bind.
- **UTR (tennis, pickleball)**: official [Engage API](https://www.utrsports.net/pages/engage-api) with OAuth (the player connects their own account). Application fee of $250 and a stable user base required. State: `permission-pending` once applied.
- **Smoothcomp**: athletes choose whether their profile is public; no public API found. Terms not yet checked. State: `unchecked`.
- **Gym websites** (class schedules): already used for the first board, with the source link shown. State: `permitted` per site, checked each time.

## 5. The paywall

- `entitlements(user_id, plan, source, expires_at)` and `has_pro()`, called inside every Pro function. Payments come later, and the provider is the owner's choice.
- **Free**: board, levels (self + peers + gym), Family Access, adult match at home gyms.
- **Pro**: travel match, comp records and rankings, Kids Match.

## 6. Schema (to write as the next migration, then kill-test)

New tables:
- `level_systems`, `levels` (public reference data)
- `athlete_levels` (user or child)
- `source_adapters`, `athlete_claims`, `comp_results`, `team_strength` (academy aggregates)
- `entitlements`, `match_prefs` (opt-in per sport, default off)
- `kid_match_requests`, `kid_match_consents`, `kid_match_sessions` (host gym approval), `match_reports`, `audit_log` (insert-only)

Changes to existing tables:
- `children` gets per-sport `athlete_levels` rows and `match_prefs`.
- Nothing about kids goes into the public `slots` timetable. Match sessions live in `kid_match_sessions`, not on the board.

Functions (all `security definer` with the gates inside):
- `kids_match_search(child_id, sport, lat, lng, km)`
- `kids_match_request(card_token, my_child, host_gym, at)`
- `kids_match_respond(request, accept)`
- `kids_match_agree(request, typed_name)`
- `kids_match_host_approve(request)` (staff)
- `kids_match_report(request, reason)`
- `claim_athlete(url)`, `confirm_claim(claim)` (staff)
- `partner_search(...)` for adults
- `has_pro()`, `is_phone_verified()`

## 7. Legal footing (plain)

- **COPPA**: the 2025 amendments are in force, and their compliance date (April 22, 2026) has passed. Parent-supplied child data needs verifiable parental consent. Showing a child's card to another parent is a disclosure that needs its **own** consent (the per-sport opt-in, worded as that). A written retention policy must be published: proposed, requests and consents are deleted 90 days after the session or decline, reports after review.
- **Liability**: this design reduces liability. It does not remove it. Sessions happen at a gym under the gym's waiver, with both parents present, after a recorded parent-to-parent agreement. An attorney should review the terms, the consent wording and the retention policy before Kids Match launches.

## 8. Acceptance (runs, not greps)

1. An adult with no child, an adult with an unverified child, a guest and a signed-out visitor each call `kids_match_search`. All four are refused, and none gets a card.
2. A verified parent without phone confirmation, and one without Pro, are both refused.
3. A verified parent whose own child is not opted in is refused (reciprocity).
4. Results contain no name, initial, photo, id or birthday: the column list itself is the check.
5. Two searches return different card tokens for the same child.
6. No step of the consent chain can run out of order (for example, host approval before both agreements), checked by calling each function out of turn.
7. A report freezes both families; the frozen family's search is refused.
8. The adapter runner refuses a `prohibited` or `unchecked` source.
9. A child's window never returns a child two divisions away.

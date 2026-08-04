# Requirements Document — RollPhase Core

## Introduction

**RollPhase** is a phone-first sportsman’s companion: find gyms near you, see hours/equipment/specialty, match with local training partners at your level, check in in real time, and source gear — **for every sport**, not just one.

The product promise: *pick a sport → see only what matters for that sport → act fast*.  
The anti-promise: a cluttered mega-feed mixing belts, barbells, and unrelated noise.

**Problem:** Athletes travel, move neighborhoods, or want a session tonight. Existing tools are either single-sport (e.g. BJJ-only), generic gym finders (no partner level matching), or social apps that bury training intent under clutter.

**Solution:** A multi-sport platform with **sport as the primary lens**, progressive disclosure, location-aware discovery (PostGIS), skill-aware partner matching, live check-ins, and gear needs — designed like a high-end native phone app, not a web dump.

**Backend:** Supabase (Auth, PostgreSQL, PostGIS, Realtime, Storage).  
**Client:** Native phone-first — **Swift (SwiftUI) for iOS** and **Kotlin (Jetpack Compose) for Android**. Shared product contracts; no hybrid shell for v1.  
**Visuals:** Premium generated 3D brand logo + sport icons; calm, uncluttered UI.

### Locked product decisions

| Decision | Choice |
|----------|--------|
| Client | Native Swift + Kotlin |
| v1 sports (full depth) | BJJ, MMA, Boxing, Wrestling, Weightlifting, CrossFit, Running, Climbing, Swimming, Yoga |
| Age / matching | Teens allowed **with restrictions** (see Requirement 11) |
| Brand | Generate new high-end 3D logo + sport icon set |

---

## Design Principles (non-negotiable)

1. **Sport-first** — User selects/search a sport; all lists, ranks, equipment, and matches filter by that sport.
2. **No clutter** — Surface the athlete’s next decision (where / with whom / when / gear). Hide empty sections and off-sport metadata.
3. **Phone-native first** — Thumb zones, bottom nav, large targets, offline-tolerant basics, map + list dual views.
4. **Local truth** — Distance, open-now, who’s training *now*, next class — not vanity stats.
5. **Multi-sport all-rounder** — Same product shell; sport-specific *taxonomy* (ranks, gear, facilities) plugs in per sport.
6. **Friendly sportsman culture** — Inclusive, training-focused, not toxic gatekeeping.

---

## Core User Roles

| Role | Description |
|------|-------------|
| Athlete | Primary user: finds gyms, partners, checks in, posts needs |
| Gym owner / staff | Claims/edits gym, hours, schedule, promotions, amenities |
| Gear shop | Lists shop location, inventory highlights, sport tags |
| Guest | Browse sports + public gym discovery only (limited) |

---

## Requirements

### Requirement 1 — Sport catalog & sport context
**User Story:** As an athlete, I want to search and select a sport so that the entire app only shows relevant gyms, ranks, partners, and gear for that sport.

#### Acceptance Criteria
1. WHEN the user opens sport selection THEN the system SHALL present a searchable list of all supported sports with high-end 3D sport icons.
2. WHEN the user selects a sport THEN the system SHALL set **active sport context** and filter subsequent screens by that sport.
3. WHEN active sport is set THEN the system SHALL persist it across sessions until the user changes it.
4. IF a sport has a rank/belt/level system THEN the system SHALL expose that system only while that sport is active.
5. IF a sport has no formal ranks THEN the system SHALL use generic levels (e.g. Beginner / Intermediate / Advanced / Competitive) instead of inventing fake belts.
6. WHEN the user changes sport THEN the system SHALL clear sport-specific UI state (rank filters, partner filters) and reload scoped data.

---

### Requirement 2 — User profiles (multi-sport)
**User Story:** As an athlete, I want a profile with my sports, levels, and training intent so partners and gyms understand who I am.

#### Acceptance Criteria
1. WHEN a user signs up THEN the system SHALL create a profile linked to Supabase Auth.
2. WHEN editing profile THEN the user SHALL be able to add multiple sports, each with optional level/rank and years of experience.
3. WHEN viewing another athlete’s public profile THEN the system SHALL show sports, levels, home area (city-level, not exact address), and training preferences (not private contact by default).
4. THE system SHALL allow privacy controls: show/hide exact check-in location, show/hide open-to-partner status.
5. WHEN a user marks “open to train” for active sport THEN partner discovery SHALL include them subject to privacy rules.

---

### Requirement 3 — Gym discovery (location + sport)
**User Story:** As an athlete traveling or near home, I want nearby gyms for my sport with hours, amenities, specialties, and schedule — not a wall of every facility on Earth.

#### Acceptance Criteria
1. WHEN active sport is set AND location permission is granted THEN the system SHALL return gyms supporting that sport ordered by distance (PostGIS).
2. WHEN location is denied THEN the system SHALL allow city/manual location and still return distance-ordered results from that point.
3. WHEN listing a gym card THEN the system SHALL surface: name, distance, open-now status, primary specialties for active sport, rating (if available), and next class time if known.
4. WHEN opening gym detail THEN the system SHALL show: full hours, class schedule (sport-scoped), amenities/equipment, promotions, map pin, contact/website, and photos.
5. IF gym has no data for active sport schedule THEN the system SHALL hide empty schedule blocks rather than show placeholders that clutter the screen.
6. WHEN filtering THEN the user SHALL be able to filter by open-now, distance radius, amenities (e.g. mats, cage, pool, free weights), and specialty tags for the active sport.
7. THE system SHALL support map view and list view for the same result set without mixing sports.

---

### Requirement 4 — Partner matching (skill + locality)
**User Story:** As a jiu-jitsu (or any sport) athlete, I want to find local people near my level (e.g. yellow belt) who want to train, without scrolling past wrong sports or wrong ranks.

#### Acceptance Criteria
1. WHEN partner search runs THEN the system SHALL only return users who: (a) share active sport, (b) are within selected radius, (c) match level/rank criteria (exact or ±1 band if user allows), (d) are open-to-train.
2. WHEN rank systems differ by sport THEN matching logic SHALL use that sport’s rank order, not a global numeric hack visible to the user.
3. WHEN viewing a partner card THEN the system SHALL show: display name, sport level, distance/area, training intent (rolling, sparring, open mat, strength session, etc.), and mutual gyms if any.
4. THE system SHALL NOT expose exact home address; approximate area or distance band only.
5. WHEN a match request is sent THEN the recipient SHALL receive an in-app notification (and optional push if enabled).
6. IF no partners match THEN the system SHALL show a clean empty state with actions: expand radius, relax rank band, post a need.

---

### Requirement 5 — Real-time check-ins
**User Story:** As an athlete, I want to check in at a gym so others know who is training now and I can find a roll/session tonight.

#### Acceptance Criteria
1. WHEN a user checks in at a gym THEN the system SHALL record gym_id, user_id, sport, optional level, and timestamp with Realtime broadcast.
2. WHEN viewing a gym THEN the system SHALL show currently checked-in athletes for the active sport (respecting privacy).
3. WHEN a check-in expires (default duration or manual check-out) THEN the system SHALL remove the user from “here now”.
4. THE system SHALL allow optional “looking for partner” flag on check-in.
5. WHILE checked in THEN the user’s partners-near-me lists MAY prioritize co-located gym.

---

### Requirement 6 — Gear shops & needs
**User Story:** As an athlete, I want gear shops near me and a way to post “I need X” / “I have X” for my sport without cluttering training discovery.

#### Acceptance Criteria
1. WHEN browsing gear THEN results SHALL filter by active sport and distance.
2. WHEN posting a need THEN the user SHALL specify sport, item type, condition (want/have/sell/trade), and location preference.
3. WHEN listing needs THEN the system SHALL show only active-sport needs by default.
4. Gear shop profiles SHALL include location (PostGIS), sports served, hours, and highlight inventory categories — not full e-commerce unless later expanded.
5. Needs and gym discovery SHALL remain separate navigation destinations (no mixed infinite scroll).

---

### Requirement 7 — Events & promotions
**User Story:** As an athlete, I want to see local open mats, competitions, and gym promotions for my sport.

#### Acceptance Criteria
1. WHEN browsing events THEN the system SHALL filter by active sport, date range, and distance.
2. WHEN a gym creates a promotion THEN it SHALL appear on gym detail and in a sport-scoped promotions list if within radius/date.
3. Empty event sections SHALL collapse, not show “No events” walls on every card.

---

### Requirement 8 — Information architecture & navigation (anti-clutter)
**User Story:** As any user, I want a clear path: choose sport → choose intent → act — so a large database never feels like a dump.

#### Acceptance Criteria
1. THE app SHALL use a persistent **sport chip / selector** (searchable dropdown or full-screen picker) accessible from primary screens.
2. Bottom navigation SHALL separate intents: **Home**, **Gyms**, **Partners**, **Gear**, **Profile** (exact labels may refine; mixing partners into gym list is forbidden).
3. Home for active sport SHALL be a curated dashboard: nearby open gyms (top few), partners open now, next event, my check-in status — not a full unfiltered catalog.
4. Search within a screen SHALL search within active sport context unless user explicitly searches “all sports”.
5. Detail screens SHALL use progressive disclosure (tabs or sections: Overview | Schedule | People | Gear | About).

---

### Requirement 9 — Visual system (high-end 3D)
**User Story:** As a user, I want the app to feel premium and sport-native so icons and logos communicate instantly without text walls.

#### Acceptance Criteria
1. EACH sport in the catalog SHALL have a dedicated high-end 3D icon asset.
2. App logo and primary brand marks SHALL meet premium mobile brand quality (consistent lighting, depth, no low-res clipart).
3. UI SHALL prefer sparse layout, strong hierarchy, and sport accent color tokens without rainbow clutter.
4. Icons SHALL remain legible at small sizes (tab bar / chips) with optional detailed variants for hero screens.

---

### Requirement 10 — Backend data integrity (Supabase / PostGIS)
**User Story:** As the platform, we need correct geo queries, RLS, and sport-scoped data so the product scales safely.

#### Acceptance Criteria
1. THE system SHALL store gym, shop, event, and check-in locations using PostGIS geography/geometry.
2. Nearby queries SHALL use indexed distance operators (e.g. `<->` / ST_DWithin) not client-side haversine over full tables.
3. Row Level Security SHALL protect private profile fields, draft gym claims, and message content.
4. Realtime channels SHALL scope check-ins by gym (and optionally sport).
5. Sport taxonomy, rank systems, and amenity tags SHALL be data-driven (tables), not hard-coded only in the client.

---

### Requirement 11 — Auth, safety & age-gated matching
**User Story:** As a user (adult or teen athlete), I want secure login and age-appropriate safety controls before meeting people to train.

#### Acceptance Criteria
1. THE system SHALL support email and/or OAuth sign-in via Supabase Auth.
2. WHEN creating a profile THEN the user SHALL provide date of birth; the system SHALL derive age band (under-13 blocked, 13–17 teen, 18+ adult).
3. IF age is under 13 THEN the system SHALL refuse account creation for matching features (COPPA-aligned: no under-13 accounts in v1).
4. IF user is 13–17 (teen) THEN the system SHALL enforce **teen restrictions**:
   - Partner matching only with other teens in a similar age band (e.g. 13–15 and 16–17 bands; never teen↔adult partner match).
   - No public exact check-in coordinates; gym-level “here” only with coarse display.
   - Direct messaging limited to match-accepted threads; no open public DMs from adults.
   - Adults cannot initiate partner match or message teens.
   - Optional guardian email notice on signup (design may make optional for 16–17, required for 13–15 where feasible).
5. IF user is 18+ THEN full partner matching within adult pool only (no teen results).
6. THE system SHALL support block/report for users and content; reports involving minors SHALL be priority-flagged.
7. THE system SHALL not force in-person meetup details in public profiles.
8. Gym discovery, hours, and gear shops SHALL remain available to teens; only social matching/messaging is restricted as above.

---

### Requirement 12 — Performance & quality (DevOps lens)
**User Story:** As an operator, I want the app to stay fast and shippable as the catalog grows.

#### Acceptance Criteria
1. Gym and partner list queries SHALL paginate / limit by radius.
2. Images SHALL use optimized delivery (compressed, sized for mobile).
3. Schema migrations SHALL live in version control (Supabase migrations).
4. Critical paths (sport select → nearby gyms, partner match) SHALL remain usable on mid-tier phones and average mobile networks.
5. iOS and Android SHALL consume the same Supabase schema and RPC contracts so feature parity is intentional, not accidental.

---

### Requirement 13 — Native client parity
**User Story:** As an athlete on iPhone or Android, I want the same product structure and no missing core flows on either platform.

#### Acceptance Criteria
1. THE product SHALL ship as native **SwiftUI (iOS)** and **Jetpack Compose (Android)** apps.
2. Shared OpenAPI/RPC contracts and sport taxonomy SHALL be the single source of truth for both clients.
3. Navigation model (sport-first, bottom intents) SHALL match on both platforms, adapted to platform conventions (e.g. sheets, system maps).
4. 3D brand and sport icons SHALL use the same asset set (exported densities / PDF/SVG/PDF vector or PNG@3x as appropriate per platform).

---

## Out of Scope (v1)

- Full e-commerce checkout for gear
- Live video coaching
- Multi-city franchise admin portals beyond gym claim/edit
- Automatic belt verification with federations (manual self-report + community trust for v1)
- Apple Watch / Wear OS companion (later)
- React Native / Flutter / hybrid client
- Under-13 accounts

---

## Success Metrics (product)

- Time from open app → useful gym list for selected sport &lt; 10 seconds (with location)
- Partner search returns only same-sport candidates 100% of the time
- Teen↔adult partner match rate = 0 (enforced server-side)
- Zero mixed-sport clutter on gym cards (no BJJ belts on CrossFit-only view)
- Check-in “here now” updates without full page refresh (Realtime)
- Feature parity checklist green for iOS and Android on core flows

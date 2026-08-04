# RollPhase — what to do next (priority advice)

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

# RollPhase — agent rules

## Recommendation quality (non-negotiable)

When the user asks what to use, how to build, or what’s next:

1. Give the **absolute best current option** for *this* product (multi-sport, PostGIS/location, native mobile, safety, realtime).
2. State **why it’s best**, **tradeoffs**, and **what to do next** — not vague “when X is real.”
3. Prefer **up-to-date** stack reality (pricing, limits, geo, mobile clients). If unsure, search before asserting.
4. Separate clearly:
   - **Prototype** (GitHub Pages / mock data)
   - **Backend** (Supabase or successor)
   - **Native clients** (Swift / Kotlin)
5. Do **not** hardcode third-party club trademarks into sport skins; personalization is profile-level only.

## Current backend stance (see docs/BACKEND_DECISION.md)

**Default: Supabase** (Postgres + PostGIS + Auth + Realtime + Storage).  
Nothing blocks it — we still need to provision and wire it. Free for build; Pro for always-on public beta API.

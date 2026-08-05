# RollPhase — agent rules

## Ship to Git always (non-negotiable)

After **every feature or meaningful fix**:

1. `git add` · `git commit` · **`git push origin master`** on **https://github.com/Mpdev007/rollphase**
2. Hosting (e.g. **Render**) auto-updates from Git — do **not** rely on Cloudflare presets or manual host steps unless asked.
3. Also sync/push **rollphase-beta** when the live static beta must match `prototype/` (if that deploy path is still active).
4. Never leave completed work only on the local disk.

## Recommendation quality (non-negotiable)

When the user asks what to use, how to build, or what’s next:

1. Give the **absolute best current option** for *this* product (multi-sport, PostGIS/location, native mobile, safety, realtime).
2. State **why it’s best**, **tradeoffs**, and **what to do next** — not vague “when X is real.”
3. Prefer **up-to-date** stack reality (pricing, limits, geo, mobile clients). If unsure, search before asserting.
4. Separate clearly:
   - **Public product UX** (what the app *does* — never leak stack/“secret sauce” in beta UI)
   - **Internal docs / handoff** (how we build — for agents only)
5. Do **not** hardcode third-party club trademarks into sport skins; personalization is profile-level only.

## Current backend stance (see docs/BACKEND_DECISION.md)

**Default: Supabase** (Postgres + PostGIS + Auth + Realtime + Storage).  
Nothing blocks it — we still need to provision and wire it. Free for build; Pro for always-on public beta API.

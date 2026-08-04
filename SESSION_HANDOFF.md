# RollPhase — session handoff (for next agent)

**Owner:** Vlad (GitHub: Mpdev007)  
**Last consolidated:** 2026-08-04  
**Live beta (prototype only):** https://mpdev007.github.io/rollphase-beta/  
**This monorepo:** https://github.com/Mpdev007/rollphase  

---

## What RollPhase is

Multi-sport training companion: sport-first discovery of gyms, partners, events, gear needs, check-ins, in-app venue ratings, and profile **“I represent…”** personalization (logo + colors + Nix hook). **Not** a single-club branded app.

**Planned production stack**

| Layer | Choice |
|-------|--------|
| Clients | Native SwiftUI + Kotlin Compose (phone-first) |
| Backend | **Supabase** (Postgres + PostGIS + Auth + Realtime + Storage) — multi-project under one account |
| On-device AI | **Nix** for represent logo→palette (client stub exists) |
| Beta UX | Static HTML prototype (this repo `prototype/`) |

---

## Repo map

```
rollphase/
├── AGENTS.md                 # Rules for agents (recommendations quality, no TM sport skins)
├── README.md                 # Entry point
├── SESSION_HANDOFF.md        # THIS FILE — pick up here
├── docs/                     # Product + architecture decisions
│   ├── PRODUCT_VISION.md
│   ├── BACKEND_DECISION.md   # Why Supabase
│   ├── BACKEND_COMPETITIVE_RESEARCH.md
│   ├── SUPABASE_SETUP_RUNBOOK.md
│   ├── VENUE_RATINGS.md
│   ├── NIX_INTEGRATION.md
│   ├── FEED_AND_WEBHOOKS.md
│   ├── ROADMAP_NEXT.md
│   ├── BETA_TESTER_GUIDE.md
│   └── …
├── .kiro/specs/rollphase-core/
│   ├── requirements.md
│   └── design.md
└── prototype/                # Shareable interactive beta (also deployed as rollphase-beta Pages)
    ├── index.html
    ├── app.js, data.js, beta.js, reviews.js, nix-client.js
    ├── skins.css
    └── assets/
```

**Related (outside this repo)**

- `C:\Users\vladv\projects\supabase-studio\` — multi-app Supabase workspace scaffold (`apps/rollphase` CLI init started)
- Supabase account (user GitHub-linked): existing projects **PhasePoint Ledger** + **stormcraft** both **paused**, **0 usage** → recommended delete/free slots for `rollphase-prod` + `officer-assist-prod` (user confirming)

---

## Product decisions already locked

1. **Sport skins = generic** per sport (BJJ is not Pure Brazilian / Checkmat).  
2. **“I represent…” = profile-only** — free name, logo upload/crop, free RGB colors, optional templates, Nix analyze. No third-party logos shipped as app chrome.  
3. **Sport focus is optional** — Explore all / multi-sport profile; yoga today boxing tomorrow.  
4. **Venue ratings** — in-app, visit-preferred, sport-scoped tags; Google Maps as link-out only (not noise import).  
5. **Backend** — Supabase multi-project under one account; Free lab + Prod org pattern.  
6. **Beta** — disclaimer gate + Feedback + About; live on GitHub Pages.  

---

## What works in the prototype

- Multi-sport home rail, optional focus, guest vs athlete demo  
- Sport skins (21 sports), searchable picker  
- Gyms list/map mock, detail tabs (overview, **reviews**, schedule, here, social)  
- Partners, Feed (events/live/social mocks)  
- Profile: sports add/remove, represent studio, my reviews, social fields  
- Check-in → checkout → rate prompt (visit-verified)  
- Beta gate + feedback (mailto/localStorage; optional FormSubmit email in `beta.js`)  
- Nix client stub + local palette extract  

**Not wired:** real Supabase, real auth, real PostGIS, native apps.

---

## Next work (priority)

1. **Supabase:** free slots (delete/pause dead projects) → create `rollphase-prod` + `officer-assist-prod` → PostGIS → first migrations  
2. Wire prototype or thin client to live API (anon key only in public clients)  
3. Seed one city + few sports  
4. Native shells when API contracts stable  
5. Pro org when always-on multi-app required  

See `docs/ROADMAP_NEXT.md` and `docs/SUPABASE_SETUP_RUNBOOK.md`.

---

## How to run prototype locally

```bash
cd prototype
python -m http.server 8765
# http://localhost:8765/
```

## Deploy beta (Pages)

Repo **Mpdev007/rollphase-beta** serves `prototype` root for https://mpdev007.github.io/rollphase-beta/  

When updating UX, sync prototype files there or publish from this monorepo’s `prototype/` folder.

---

## Agent rules

Read `AGENTS.md` first:

- Always give absolute best up-to-date recommendation with tradeoffs  
- Never hardcode club trademarks into sport skins  
- Never commit secrets / service_role keys  

---

## Open user context (as of handoff)

- Wants one Supabase account, multi-app (RollPhase + Officer Assist first)  
- Start Free, Pro when needed  
- Already has Supabase via GitHub; two paused empty projects  
- Ecosystem local fleet separate from public app backends  

# RollPhase

**Phone-first multi-sport training companion** — find gyms, partners, events, gear; check in; rate venues; personalize how you “represent” (without locking the whole app to one club brand).

| | |
|--|--|
| **Status** | UX beta prototype + architecture docs |
| **Live demo** | [mpdev007.github.io/rollphase-beta](https://mpdev007.github.io/rollphase-beta/) |
| **Handoff for agents** | **[SESSION_HANDOFF.md](./SESSION_HANDOFF.md)** ← start here |
| **Agent rules** | [AGENTS.md](./AGENTS.md) |

## Quick start (prototype)

```bash
cd prototype
python -m http.server 8765
```

Open `http://localhost:8765/` — accept beta disclaimer, explore.

## Repository layout

```
docs/           Product vision, backend decisions, Supabase runbook, ratings, Nix
.kiro/specs/    Requirements + design (EARS / architecture)
prototype/      Interactive HTML beta (also published to GitHub Pages)
AGENTS.md       Rules for AI agents
SESSION_HANDOFF.md  Full pickup context
```

## Stack (production direction)

- **iOS / Android:** SwiftUI + Jetpack Compose  
- **Backend:** Supabase (Postgres + PostGIS + Auth + Realtime + Storage)  
- **On-device AI (personalization):** Nix (see `docs/NIX_INTEGRATION.md`)  

## Key product rules

1. Sport skins are **generic** per sport.  
2. Club identity is **profile “I represent…”** only (user logo + colors).  
3. Multi-sport is first-class; focus is optional.  
4. Venue ratings are **in-app / visit-aware**, not a Google review dump.  

## Docs index

| Doc | Topic |
|-----|--------|
| [PRODUCT_VISION.md](docs/PRODUCT_VISION.md) | Product spine |
| [BACKEND_DECISION.md](docs/BACKEND_DECISION.md) | Why Supabase |
| [BACKEND_COMPETITIVE_RESEARCH.md](docs/BACKEND_COMPETITIVE_RESEARCH.md) | Alternatives 2026 |
| [SUPABASE_SETUP_RUNBOOK.md](docs/SUPABASE_SETUP_RUNBOOK.md) | Multi-app account setup |
| [VENUE_RATINGS.md](docs/VENUE_RATINGS.md) | Ratings design |
| [ROADMAP_NEXT.md](docs/ROADMAP_NEXT.md) | Priorities |
| [BETA_TESTER_GUIDE.md](docs/BETA_TESTER_GUIDE.md) | For human testers |

## License / secrets

Do not commit `.env`, service_role keys, or DB passwords. Prototype is for closed beta UX only.

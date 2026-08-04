# RollPhase — Product Vision

> **Phone-first. Sport-first. Zero clutter. Premium feel.**

## One-liner

Find where to train, who to train with, who’s there now, and what gear you need — for *your* sport, near *you*.

## Who it’s for

- Grapplers, strikers, lifters, runners, climbers, hybrid athletes
- Travelers who need a mat/cage/rack tonight
- Locals who want a partner at the right level
- Gyms that want to be discovered for the *right* reasons (specialty, schedule, community)

## What a multi-sport athlete actually needs on screen

Thinking as someone who trains across sports:

| Intent | Must surface first | Must not clutter |
|--------|-------------------|------------------|
| “I’m in a new city for BJJ” | Open mats / gyms with BJJ, distance, open now, next class | Powerlifting racks, yoga teacher bios |
| “Need a yellow belt to roll” | Same sport, rank band, distance, open-to-train, at which gym | All belt colors of other sports, DM spam |
| “Just lift nearby” | Gyms with free weights/racks, hours, day pass? | Belt ranks, gi sizes |
| “Who’s on the mats now?” | Live check-ins for this sport at this gym | Historical vanity counts |
| “Need a mouthguard / gi / shoes” | Local shops + needs for this sport | Unrelated marketplace |

## Information architecture (athlete mental model)

```
┌─────────────────────────────────────────┐
│  🎯 ACTIVE SPORT  [ search · change ]   │  ← always visible
└─────────────────────────────────────────┘
         │
    ┌────┴────┐
    │  Home   │  curated for THIS sport only
    └────┬────┘
         │
   ┌─────┼─────────┬──────────┐
   ▼     ▼         ▼          ▼
 Gyms  Partners  Gear/Needs  Profile
   │     │         │
   ▼     ▼         ▼
 Detail  Match     Need/Shop
 + map   request   detail
 + live
 check-ins
```

**Rule:** Changing the sport reloads the world. No global feed of mixed sports.

## Progressive disclosure

1. **Sport** — searchable catalog with 3D icons  
2. **Intent** — bottom nav (gyms / partners / gear)  
3. **Filter** — open now, radius, rank band, amenities  
4. **Detail** — schedule, people here, promotions, about  

Empty sections **collapse**. Never pad the UI with “N/A” blocks.

## What “high-end” means here

- 3D sport icons that look like product design, not emoji packs
- Sparse layouts, confident typography, map that doesn’t fight the list
- Sport accent tokens (subtle) — not a carnival of colors
- Native gestures: pull-to-refresh, sheet filters, sticky sport chip

## Platform (locked)

- Native **SwiftUI** (iOS) + **Jetpack Compose** (Android)
- Same Supabase contracts — feature parity by design

## Backend fit

| Need | Supabase feature |
|------|------------------|
| Auth | Supabase Auth |
| Multi-tenant-ish data + RLS | Postgres RLS |
| Nearby gyms/partners | PostGIS |
| Who’s here now | Realtime |
| Gym photos / icons | Storage |
| Teen/adult isolation | SECURITY DEFINER RPCs + RLS |

## Cultural tone

Friendly sportsman: competitive when training, welcoming when discovering. Matching is about **level fit and locality**, not ego hierarchies in the UI copy.

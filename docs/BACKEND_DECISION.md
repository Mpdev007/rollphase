# Backend decision — Supabase (current best for RollPhase)

**Last reviewed:** 2026-08-04  
**Rule:** Always re-check this before changing stack; prefer current best-fit over habit.

## What “when Supabase is real” meant (clarified)

**Supabase is real today.** It’s a production product.

What was *not* real yet on RollPhase:

| Layer | Status |
|-------|--------|
| GitHub Pages beta (HTML prototype) | Live — mock data in the browser |
| Supabase project (Auth + Postgres + PostGIS + Realtime) | **Not connected yet** — we haven’t provisioned/wired it |
| Native apps | Not started |

So: nothing “stops” Supabase. **We simply haven’t plugged the product into it yet.**  
The beta is a UX shell. The next serious step is a real backend project.

---

## Absolute best option for RollPhase *right now*

### **Primary recommendation: Supabase (Postgres + PostGIS + Auth + Realtime + Storage)**

**Why it wins for this app specifically:**

1. **PostGIS** — nearby gyms/partners/events need real geo queries (`ST_DWithin`, indexes). That’s native Postgres/PostGIS, not a bolt-on.
2. **Auth** — email/OAuth ready for multi-device profiles.
3. **Realtime** — check-ins “here now” without building WebSockets yourself.
4. **RLS** — teen/adult isolation, private DOB, review ownership — enforced in the database.
5. **Storage** — gym photos + user represent logos.
6. **Edge Functions** — webhooks, Nix proxy, review moderation hooks.
7. **Mobile** — official Swift/Kotlin-friendly clients; fits your native plan.
8. **Speed to production** — one platform for the whole backend surface you already specified.

**Honest limits (2026 free tier — validate on supabase.com/pricing):**

- Free: ~500 MB DB, ~50K MAUs, egress caps, **projects pause after ~7 days inactivity**
- Free is fine for **dev + closed beta wiring**
- For a shareable always-on backend with real users: plan **Pro (~$25/mo + usage)** so it doesn’t auto-pause

**Bottom line:** Supabase is still the best default for RollPhase. Not because it’s trendy — because geo + auth + realtime + RLS match the product.

---

## Alternatives (when you’d pick them)

| Option | Use if… | Why not default |
|--------|---------|-----------------|
| **Firebase** | You only need chat/docs, no serious geo | Geo is weak vs PostGIS; vendor lock-in different shape |
| **Neon + custom Auth + separate Realtime** | You want cheapest Postgres + DIY | You rebuild Auth, Realtime, Storage glue |
| **AWS Amplify / AppSync** | Enterprise AWS mandate | Heavier ops, slower for a sports MVP |
| **Custom Node + Postgres on a VPS** | Full control / compliance | You own uptime, auth, realtime — slower |
| **PlanetScale / MySQL** | MySQL shop | No PostGIS-class geo story |

**Hybrid only if needed later:** Supabase (core) + specialized search (e.g. Typesense/Meilisearch) if full-text explodes. Don’t start there.

---

## What actually blocks “going real” (checklist)

Nothing legal/tech *forbids* it. What’s missing is **work**:

1. Create Supabase project (enable PostGIS extension)
2. Migrations: profiles, sports, gyms (geography), check_ins, reviews, RLS
3. Seed one city + 3–5 sports
4. Wire beta or a thin API client (even keep HTML prototype talking to Supabase)
5. Pro plan before public always-on backend (avoid free pause)

---

## Recommendation for *you* this week

1. **Keep** GitHub Pages prototype for UX testers (no backend cost).  
2. **Spin up** Supabase Free project for schema + Auth experiments.  
3. **Upgrade to Pro** when you want a stable API for friend testers with real accounts (so free-tier pause doesn’t kill the demo).  
4. **Do not** switch to Firebase for this product.

---

## Standing rule (for every future recommendation)

> Always give the **current best option** for this product’s constraints (geo, safety, native, realtime), with **what’s best, what the tradeoffs are, and what to do next** — never “we’ll do X later” without explaining *why* and *whether X is still best*.

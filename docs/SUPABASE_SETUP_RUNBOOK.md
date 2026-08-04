# Supabase setup runbook — multi-app studio (operator-guided)

**Goal:** One Supabase login, clean orgs, one project per production app, nothing half-broken.

**Driver:** AI agent walks steps. **You:** click auth, confirm emails, approve billing if any.

---

## Phase 0 — Decisions (fill before creating)

| Decision | Choice |
|----------|--------|
| Account email | ________________ (prefer personal Google/GitHub you control) |
| MFA on account | **ON** (required) |
| Free Lab org name | `Studio Lab` |
| Prod org name | `Studio Prod` (upgrade to Pro when apps must stay up 24/7) |
| Apps for first wave | 1) `rollphase` 2) ________ 3) ________ |
| Region | Prefer closest to users (e.g. `us-east-1` / `us-west-2`) — **same region for all prods if possible** |

---

## Phase 1 — Create the account (you click)

1. Open https://supabase.com/dashboard/sign-up  
2. Sign up with **GitHub or Google** (same identity you use for code — easier recovery).  
3. Confirm email if asked.  
4. Enable **MFA** under Account → Security.  
5. Do **not** create random projects yet — wait for Phase 2 structure.

**Stop and tell the agent:** “Account ready.”

---

## Phase 2 — Organizations (structure, not mess)

Supabase bills **per organization**. Free and Pro **cannot mix in one org**.

### 2A — Lab (Free)

1. Dashboard → **New organization**  
2. Name: `Studio Lab`  
3. Plan: **Free**  
4. Purpose: experiments, throwaways, learning  

### 2B — Prod (start Free, plan Pro when live)

1. **New organization**  
2. Name: `Studio Prod`  
3. Plan: **Free** for first wiring **or** **Pro** if these apps must never pause  

**Rule:**  
- Anything friends/testers depend on → **Studio Prod**  
- Anything “just testing PostGIS” → **Studio Lab**

**Stop and tell the agent:** “Orgs ready: Lab + Prod.”

---

## Phase 3 — Projects (one app = one project)

### Naming convention (strict)

```
{app}-prod      e.g. rollphase-prod
{app}-staging   e.g. rollphase-staging   (optional, later)
```

### Create for each first-wave app (in **Studio Prod**)

1. **New project**  
2. Name: `rollphase-prod`  
3. Database password: generate **strong** → save in password manager (1Password / Bitwarden). **Agent never stores this in git.**  
4. Region: pick once, reuse  
5. Wait until status = **Healthy**  

Repeat for app 2, app 3…

**Free org limit:** only **2 active** free projects.  
If you need 3+ always-on → **Pro** on Studio Prod.

**Stop and tell the agent:** “Projects healthy: rollphase-prod, …”

---

## Phase 4 — Secure the project (agent + you)

For **each** prod project:

1. **Project Settings → API**  
   - Copy `Project URL`  
   - Copy `anon` `public` key  
   - Copy `service_role` key **only into secrets manager — never frontend, never git**  

2. **Authentication → Providers**  
   - Enable Email  
   - Disable unused providers until needed  

3. **Database → Extensions**  
   - Enable `postgis` (RollPhase + any geo app)  
   - Enable `pgcrypto` if not already  

4. **Authentication → URL configuration**  
   - Site URL: your beta or app URL  
   - Redirect URLs: localhost + production  

5. Local secrets file (gitignored):

```
apps/rollphase/.env.local
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...   # server only
```

**Stop and tell the agent:** “API keys saved offline; PostGIS on for rollphase-prod.”

---

## Phase 5 — Local CLI link (agent runs)

```bash
npx supabase login
npx supabase link --project-ref <ref>
npx supabase db push   # when migrations exist
```

Project ref is in Project Settings → General.

---

## Phase 6 — What we do NOT do on day one

- Do not put service_role in the GitHub Pages prototype  
- Do not enable every OAuth provider  
- Do not create 10 orgs  
- Do not put Lab experiments in Prod  
- Do not commit `.env` or DB passwords  

---

## Rollback / “I messed up”

| Mistake | Fix |
|---------|-----|
| Project in wrong org | Project Settings → Transfer project |
| Too many free projects | Pause unused in Lab |
| Lost DB password | Reset DB password in settings (apps break until updated) |
| Leaked service_role | Rotate JWT secret / generate new keys immediately |

---

## Checklist tracker

- [ ] Account + MFA  
- [ ] Org `Studio Lab` (Free)  
- [ ] Org `Studio Prod`  
- [ ] Project `rollphase-prod`  
- [ ] Project `________-prod` (app 2)  
- [ ] PostGIS on geo apps  
- [ ] Keys in password manager only  
- [ ] CLI login + link  
- [ ] First migration applied  

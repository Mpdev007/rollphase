# RollPhase — Sport Skin Design Research

**Purpose:** Define high-end, sport-authentic visual systems so selecting a sport reskins the entire app — not just a color chip.

**Sources:** Premium app trends (dark + adaptive themes, glass, micro-motion), category brand languages (UFC-era combat, BJJ academy/apparel, Strava/NRC endurance, climbing gym culture, strength equipment aesthetics, wellness apps).

---

## Global rules (all skins)

1. **Dark base always** — OLED gym-at-night default; each sport shifts *hue, accent, texture, corner radius, density*.
2. **Adaptive theme** — sport change animates tokens (bg mesh, accent, card glass, tab glow).
3. **3D glyphs** — tabs + sport picker use rendered icons, never emoji as primary.
4. **No clutter** — skin changes mood, not information architecture.
5. **Same shell** — Home · Gyms · Partners · Gear · Profile structure identical; *vibe* differs.

---

## Skin matrix

| Sport | Vibe (one line) | Base / Mesh | Accent | Surface feel | Corners | Density | Primary metaphor |
|-------|-----------------|-------------|--------|--------------|---------|---------|------------------|
| **BJJ** | Technical, respectful, mat culture | Deep navy-black | Royal blue + soft white | Woven gi / mat grain | Soft 16–18px | Calm, airy | Open mat, belt rank |
| **MMA** | Octagon intensity, fight-night | Pure black | Crimson + gold | Hard glass, sharp light | Tighter 10–12px | Punchy, bold type | Cage / event card |
| **Boxing** | Classic ring prestige | Espresso black | Antique gold + rope red | Leather grain | Soft classic 14px | Editorial | Ring + gloves |
| **Wrestling** | Collegiate grit | Navy slate | Gold + mat green | Rubber mat | Medium 12px | Bold labels | Mat circle |
| **Weightlifting** | Iron temple, chrome | Charcoal iron | Chrome silver + plate red | Brushed metal | Sharp 8–10px | Metric-heavy | Platform / bar |
| **CrossFit** | Garage-gym energy | Black + warm soot | Blaze orange | Industrial / rig | Angular 8px | High contrast | WOD clock |
| **Running** | Outdoor pace, clean motion | Cool dark slate | Strava-adjacent orange | Smooth glass | Soft 16px | Stats-forward | Route / pace |
| **Cycling** | Carbon + volt, road tech | Carbon black | Volt yellow / neon | Carbon weave | 12px tech | Data strips | Road / chain |
| **Climbing** | Chalk & neon beta | Rock gray-black | Neon pink / lime | Chalk dust, grit | Asymmetric-feel 12px | Problem cards | Hold / route grade |
| **Swimming** | Pool glass refraction | Deep pool navy | Aqua cyan | Wet glass / caustics | Soft 20px | Fluid, open | Lane / water |
| **Yoga** | Breath, earth, stillness | Warm charcoal-brown | Sage + sand | Soft mat / clay | Very soft 22px | Sparse, serene | Studio / flow |

---

## Layout emphasis per sport (what to surface first)

| Sport | Home hero emphasis | Gym card priority | Partner card priority |
|-------|--------------------|-------------------|------------------------|
| BJJ | Open mat / next class / belts nearby | Open now, Gi/No-Gi, mats, rank open mat | Belt + stripes, roll intent |
| MMA | Sparring nights / gyms with cage | Cage, bags, spar hours | Level + spar intensity |
| Boxing | Ring time / intro class | Ring, bags, open hours | Spar / mitt intent |
| Wrestling | Open mat tonight | Mats, style (folk/free) | Live goes / drill |
| Weightlifting | Open platform now | Racks, platforms, 24h | Session / form check |
| CrossFit | Next WOD time | Rigs, class clock | Scaled vs Rx partner |
| Running | Next group run | Meet point, route vibe | Pace band match |
| Cycling | Group ride / shop | Bike shop + club HQ | Pace / distance ride |
| Climbing | Who’s on the wall | Day pass, walls, grades | Belay / boulder grade |
| Swimming | Lap swim open | Lanes, masters | Lane partner |
| Yoga | Next class style | Studio, style tags | Practice buddy / style |

---

## Trend alignment (2025–26)

- Dark mode default + **adaptive accent systems** (not one fixed brand color)
- Glass / soft elevation on cards
- Bento-style home modules that **collapse when empty**
- Premium athletic apps: bold type, high contrast accents on dark
- Sport skins = personalization without breaking navigation muscle memory

---

## Implementation notes

- Tokens applied via `data-sport` on root
- CSS variables: `--accent`, `--accent-2`, `--bg0`, `--bg1`, `--mesh`, `--radius`, `--font-display`, `--glow`
- Tab bar icons: shared 3D set with CSS `filter` / accent tint per sport
- Sport picker: per-sport 3D glyph + name + short vibe line
- Transition: 350ms on background mesh + accent when sport changes

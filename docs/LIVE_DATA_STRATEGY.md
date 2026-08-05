# Live data strategy — absolute best options (2026)

## Goal

RollPhase shows **real places near the user**: name, distance, phone, website, hours, maps — **never fake stubs**.  
Sport-specific signal (check-ins, partners, athlete reviews) comes from **our users + Supabase**, not from POI vendors.

---

## Executive recommendation (highest ROI)

| Priority | Layer | Tool | Why it wins for RollPhase |
|----------|--------|------|---------------------------|
| **P0** | Venue truth (phone, site, hours, Maps) | **Google Places API (New)** — Nearby Search + optional Text Search | Best contact completeness worldwide; ratings/Maps URI; field masks control cost |
| **P0 free** | Venue discovery (no key) | **OpenStreetMap via Overpass** | Real lat/lng + name; phone/website when tagged; free; works in beta today |
| **P1 cost/OSM** | Commercial OSM Places | **Geoapify Places API** | Simple GET, generous free tier, storeable ODbL data, categories for gym/sport |
| **P1 backup** | Enriched POI | **Foursquare Places** | Strong urban categories, tel/website/hours; attribution required |
| **P2** | Navigation-grade POI | HERE / TomTom | Enterprise reliability; weaker “gym discovery” UX than Google for consumers |
| **Avoid** | Scrapers / SerpAPI of Maps | — | ToS risk, brittle, not production-grade |

### Canonical stack

```
Browser geolocation
    → Google Places (if key) OR Geoapify (if key) OR OSM Overpass (always free)
    → Normalize: id, name, lat/lng, mi, phone, website, hours, address, mapsUrl, sports[]
    → UI: list + detail contact card (call · website · Maps)
    → Supabase (later): cache place_id, favorites, check-ins, reviews, claims
```

**Do not scrape Google.** **Do deep-link** to website + Google Maps for full business pages.

---

## Venue / contact data — ranked deep dive

### 1. Google Places API (New) — gold standard for “is this business real?”

- **Endpoints:** `places:searchNearby`, `places:searchText`, Place Details (as needed).
- **Fields you need:** `displayName`, `formattedAddress`, `location`, `nationalPhoneNumber`, `websiteUri`, `regularOpeningHours`, `googleMapsUri`, `rating`, `userRatingCount`, `businessStatus`.
- **Billing:** Field mask drives SKU (Pro vs Enterprise). Request only contact fields you show.
- **Strengths:** Phone + website + hours + open-now accuracy is industry-leading; Maps deep link.
- **Constraints:** Restrict API key (HTTP referrer on web; better: server proxy on Render). Cache carefully per Google Maps Platform Terms.
- **Sport tip:** Use `includedTypes: ["gym"]` / `yoga_studio` / `swimming_pool` **and** Text Search queries like `"brazilian jiu jitsu"`, `"muay thai"`, `"pickleball courts"` for better recall than type alone.

### 2. OpenStreetMap + Overpass — free live path (shipped in prototype)

- **Endpoint:** public interpreters e.g. `overpass-api.de`, fallbacks for resilience.
- **Tags used:** `leisure=fitness_centre|sports_centre|dojo|swimming_pool`, `sport=*`, name regexes; contacts via `phone`, `contact:phone`, `website`, `contact:website`, `opening_hours`.
- **Strengths:** No key, real world coordinates, free forever for light use; Maps link always possible from lat/lng.
- **Gaps:** Contact tags incomplete (especially US); public Overpass can be slow/rate-limited — cache + multi-endpoint failover.
- **Rules:** Identify app with User-Agent/Referer; keep queries under ~10k/day on public instances.

### 3. Geoapify Places — best paid OSM layer

- Category search (e.g. sport.fitness, sport.sports_centre), circle filter, phone/website when OSM has them.
- Free tier suitable for beta; ODbL-friendly storage vs Google’s stricter reuse rules.
- **Use when:** You want OSM reliability without running Overpass yourself.

### 4. Foursquare Places

- Good structured categories + tel/website/hours in many metros.
- Must show attribution; limited long-term bulk storage per EULA.
- Strong **backup** if Google is down or cost-gated.

### 5. HERE / TomTom

- Excellent for routing + logistics; contacts often present.
- Lower ROI as **primary** gym discovery for a consumer athlete app vs Google.

### 6. Yelp Fusion

- Reviews/categories useful; rate limits and category noise; not sport-first.
- Optional secondary reviews only — RollPhase keeps **own** sport-scoped ratings.

---

## Feature → live source map (no more lies)

| Product surface | Live source today | Live source at scale | Fake stubs? |
|-----------------|-------------------|----------------------|-------------|
| Gyms near me | OSM Overpass (+ Google/Geoapify keys) | Same + Supabase cache | **Removed** |
| Phone / website / hours | OSM tags or Google fields | Google Details enrichment | **Removed** |
| Directions | Google Maps search/URI | Same | Always real link |
| Partner matching | — | **Supabase users** + geo | **Removed** (empty until real users) |
| Check-ins “here now” | — | **Supabase Realtime** | Empty until check-ins |
| Venue reviews (sport) | Local storage prototype | **Supabase** + visit verify | Seed reviews optional; not fake places |
| Events / tournaments | — | Gym webhooks, federation calendars, user posts | **Removed** mocks |
| Feed / social | — | Followed gyms + webhooks | Empty until follows |
| Gear shops | OSM `shop=*` / sports shops | Google `sporting_goods_store` | Prefer live over fake |
| Push notifications | — | Supabase + FCM/APNs | Prefs UI only until backend |

**Empty honest states beat fake people, fake gyms, and fake “live now” counts.**

---

## Security & architecture

1. **Never** ship unrestricted Google server keys in a public static site.
2. Preferred production path: Render service `GET /api/places/nearby?lat=&lng=&sport=` holding `GOOGLE_PLACES_API_KEY`.
3. Beta web: browser key **restricted** to `*.onrender.com` / GitHub Pages host + optional Geoapify key same way.
4. OSM: respect rate limits; cache results in memory (session) and later Supabase PostGIS.
5. User PII (location): request permission clearly; store coarse area only if needed.

---

## Other high-ROI tools to enhance the app (beyond places)

| Rank | Tool | Feature impact |
|------|------|----------------|
| 1 | **Supabase** (Auth, PostGIS, Realtime, Storage) | Partners, check-ins, reviews, favorites, multi-tenant org |
| 2 | **Google Places (New)** | Venue contact truth |
| 3 | **OSM / Geoapify** | Free/cheap discovery + gear shops |
| 4 | **Leaflet + OSM tiles** or MapLibre | Real map pins (replace mock pin scatter) |
| 5 | **Resend / transactional email** | Beta feedback, partner requests |
| 6 | **Web Push (VAPID) then FCM/APNs** | Saved gym specials, tournament windows |
| 7 | **IBJJF / sport calendars** (official feeds or partner APIs where available) | Real tournaments — not invented local cards |
| 8 | **Nix on-device personalization** | Represent / style — already planned; not for places |

---

## Implementation phases (product)

| Phase | Ship | Status |
|-------|------|--------|
| **1** | Geolocation + OSM live gyms; contact card (phone/web/Maps when present); strip fake GYMS/PARTNERS/EVENTS | **In prototype** |
| **2** | Optional `ROLLPHASE_CONFIG.googlePlacesApiKey` / Geoapify; prefer Google for contacts | Code path ready |
| **3** | Render `/api/places` proxy; domain-restricted keys | Next |
| **4** | Supabase `places` cache + favorites by `place_id` | After project create |
| **5** | Real map (Leaflet); gear via OSM shops | Next |
| **6** | Partners + check-ins + reviews on Supabase | After auth |

---

## Acceptance criteria (places)

- [ ] List shows venues from **user location** (or explicit fallback city only if permission denied — labeled as such).
- [ ] No invented gym names as primary data.
- [ ] Detail shows **Call**, **Website**, **Open in Maps** when data exists; otherwise honest “not listed — open Maps”.
- [ ] Distance is haversine from real coords.
- [ ] Provider badge (Live · OpenStreetMap / Google / Geoapify) so testers know source.

---

## Bibliography (research inputs)

- Google Places Nearby Search (New) — developers.google.com/maps/documentation/places/web-service/nearby-search  
- Google Places field masks / SKUs — Places API choose fields & billing  
- Overpass API — wiki.openstreetmap.org/wiki/Overpass_API  
- Geoapify vs Google Places (2026 comparisons) — Geoapify docs + industry writeups  
- Foursquare Places API — docs.foursquare.com  
- HERE Discover / TomTom Search — vendor developer docs  
- OSM contact tags — `phone`, `contact:website`, `opening_hours`  

*Last updated for RollPhase live-data cutover — remove stubs, ship real places.*

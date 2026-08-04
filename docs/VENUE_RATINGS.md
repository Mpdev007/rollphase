# Venue ratings — high-ROI design

## Goal

Help athletes decide *where to train* using **trustworthy, low-noise signal from people actually in the sport** — not a dump of Google’s entire review firehose.

## Recommended model (production)

### Primary: RollPhase ratings (in-app)

| Rule | Why |
|------|-----|
| **Visit-preferred** | Best reviews come after a check-in (or verified visit). Optional “I’ve trained here” for travelers without check-in. |
| **Sport-scoped** | Rate BJJ mats separately from CrossFit coaching if the venue does both. |
| **Structured dimensions** | Stars + tags beat walls of text for scannability. |
| **Short free text** | Optional 1–2 sentences max for “what stood out”. |
| **Anti-noise** | One active review per user × venue × sport (edit later). Rate-limit. Hide spam. |
| **Surface on cards** | `4.8 · 23 visits · Traveler-friendly` — not 40 platform logos. |

**Default dimensions (all sports)**

1. Overall  
2. Coaching / staff  
3. Facility / cleanliness  
4. Community / vibe  
5. Value / drop-in friendliness  

**Sport tags (examples)** — multi-select chips, not free-form chaos

- BJJ: great mats, solid open mat, comp-oriented, beginner-friendly, gi culture  
- Lifting: platforms, busy racks, good programming  
- Climbing: setting quality, crowd, belay culture  

### Secondary: Outside links (for people outside the app)

Do **not** scrape or import full Google review streams into the feed.

Instead:

| Link | Use |
|------|-----|
| **Google Maps place** | “Maps & hours” / external social proof |
| **Website** | Official info |
| **Instagram** | Culture / vibe (already in social) |

Optional later: show a **single** external rating badge *if* the gym claims their Google Place ID and we pull aggregate score via Places API — as a small secondary line, never the main narrative.

### Why not “just Google Reviews”?

- Wrong audience mix (food, parking, one-star rants)
- Not sport-aware (mats vs yoga studio in same building)
- Noise drowns “open mat on Saturday is elite”
- Competitors see the same data; **in-app visits** are your moat

### ROI ranking

1. Check-in → rate flow (highest trust)  
2. Sport-scoped structured tags  
3. Aggregate on list cards  
4. “My reviews” on profile  
5. External Maps link for non-users  
6. (Later) Places API aggregate as optional footnote  

## Prototype

- Seeded community reviews  
- User reviews stored in `localStorage`  
- Rate after checkout or from Reviews tab  
- External “Open in Maps” mock link  

# Primary sport, saved places, and “For you” engagement

## Goal

Keep people immersed whether they train **one sport** or many:

- Single-sport users get a **home-lane** that always prioritizes that sport.
- Multi-sport users pick a **first choice** (primary) without losing the rest.
- Saved gyms push **specials / open mats / cancellations** so they stay in the loop.

## Preference model

| Field | Meaning |
|-------|---------|
| `sports[]` | Sports they train (any number) |
| `primarySportId` | **First choice** — default focus, default feed lens, default notify scope |
| `favorites[]` | Saved venues (pin) |
| `visited[]` | Auto from check-ins |
| `notify` | What they want alerts for |

### Primary sport rules

1. Setting primary **does not remove** other sports.  
2. Home soft-focuses primary on open (user can still Explore / switch).  
3. Feed **For you** ranks: primary sport events → saved-gym specials → secondary sports (lower).  
4. “I want updates for this one” = primary + notify toggles.

## Notification policy (high ROI, low noise)

| Priority | Example | Channel |
|----------|---------|---------|
| **P0** | Saved gym class cancelled / special open mat today | Push + in-app |
| **P1** | Primary sport tournament registration closing | Push + in-app |
| **P2** | Primary sport weekly digest | In-app (optional digest push) |
| **P3** | Secondary sports / city-wide | In-app only unless opted in |

**Never:** flood every sport equally when they set a primary.

## Retrieval (best approach)

1. **Subscriptions table** — user ↔ sport / user ↔ gym / event types  
2. **Sources** — gym posts, class_sessions, promotions, events (sport-scoped)  
3. **Ranker** — primary sport weight + saved gym boost + recency  
4. **Delivery** — Feed always; push only P0/P1 by default  

External calendars (federation, race orgs) attach later as optional sources on the same subscription model — not a second product.

## Profile UX

- Sports list with **★ Primary**  
- **My places** — Home / Favorites / Visited  
- **Stay in the loop** — toggles for primary sport + saved gyms + specials  

## Immersion loop

```
Primary sport + saved gyms
    → For you feed
    → Check-in / attend
    → Rate / favorite
    → Stronger For you + alerts
```

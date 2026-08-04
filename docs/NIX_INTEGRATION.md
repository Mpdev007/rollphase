# Nix integration — on-device personalization

## Role

**Nix** = local / mobile LLM on the phone for RollPhase personalization:

| Job | Input | Output |
|-----|--------|--------|
| Logo analyze | User-uploaded crest/photo | Palette (primary / secondary / accent), pattern hint |
| Skin suggest | Label + colors + optional logo | Refined team strip + soft accent tokens |
| Optional gen | Prompt + refs | Icons / textures (later) |

## Hard product rules

1. **Sport skins stay generic** — Nix never rewrites “BJJ” into a third-party brand theme for all users.
2. **Represent is profile-only** — personal strip + soft ambient; user-owned uploads.
3. **On-device first** — vision/gen prefer Nix local endpoint; cloud optional.
4. **No trademark claim** — user text + user art; we do not ship official club logos as app chrome.

## API surface (prototype)

```
GET/SET  localStorage rollphase.nix.endpoint

POST {endpoint}/v1/analyze-logo
  body: { image: dataUrl, task: "team_skin_palette", constraints: {...} }
  → { primary, secondary, accent, pattern, notes }

POST {endpoint}/v1/suggest-skin
  body: { label, colors, image? }
  → { primary, secondary, accent, pattern, notes }
```

## Prototype fallback

If Nix is offline, `nix-client.js` runs **canvas palette extraction** so upload → colors still works offline.

## UI

Profile → **I represent…**

- Upload / crop logo  
- Free color pickers + sliders  
- Template seeds (optional starters, not locks)  
- **Nix analyze** button  

## Native later

Swift/Kotlin call Nix via local IPC/HTTP; same JSON contracts as above.

# Club representation vs sport skins

## Product rule (locked)

| Layer | What it is | What it is NOT |
|-------|------------|----------------|
| **Sport skin** (BJJ, MMA, …) | Generic high-end look for that sport | Any academy, team, or sponsor brand for all users |
| **I represent…** (profile) | User name + optional logo upload + free colors + Nix help | Hard-coded Pure Brazilian / Checkmat / etc. as the BJJ theme |

## Personalization (implemented in prototype)

1. Upload logo (user-owned rights)  
2. Crop: zoom + pan sliders  
3. Free colors: color picker + hex + RGB sliders for primary / secondary / accent  
4. Pattern: rings / stripe / mesh / solid  
5. Optional template **seeds** (editable after)  
6. **Nix analyze** — on-device LLM (or local palette extract) → skin suggestion  

## Nix

See [NIX_INTEGRATION.md](./NIX_INTEGRATION.md). Mobile Nix generates / refines personal skins; never rewrites global sport skins to a third-party brand.

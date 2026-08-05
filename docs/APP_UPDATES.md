# App updates on phone after Git push

## Goal

When code is pushed to **https://github.com/Mpdev007/rollphase**, anyone with RollPhase open on a phone should get:

> **Update available** → **Restart**

…and land on the new build without reinstalling anything.

## How it works

| Piece | Role |
|-------|------|
| `prototype/version.json` | Source of truth: `version`, unique `buildId`, `message` |
| `prototype/update-check.js` | Polls `version.json` every **45s** (+ on tab focus / online) |
| Banner UI | “Update available” · **Restart** · Later |
| **Restart** | Clears Cache Storage, notifies service worker, hard reloads with `?_rp=` |
| `prototype/sw.js` | Network-first worker; `BUILD_ID` changes every ship so browsers detect updates |
| `prototype/_headers` | Tells hosts not to sticky-cache HTML / version.json / sw.js |
| `scripts/bump-version.js` | Writes a new `buildId` (timestamp + git sha) |
| `scripts/ship.ps1` | Bump → commit → push in one command |

## Every ship (required)

```powershell
# From repo root — preferred
pwsh scripts/ship.ps1 -Message "What users will notice"

# Or manually
node scripts/bump-version.js --message "What users will notice"
git add -A
git commit -m "ship: What users will notice"
git push origin master
```

Agents must **bump `version.json` (and `sw.js` BUILD_ID) on every push** that should reach phones.  
If you only push without bumping, phones that already cached the old page may not notice.

## User experience

1. Deploy finishes on Render / Pages.  
2. Open app (or leave it open). Within ~20s (or when returning to the tab), banner appears.  
3. Tap **Restart** → fresh assets load.  
4. **Later** dismisses only for that `buildId`; the next ship shows the banner again.

## Manual refresh (always available while developing)

If auto-update doesn’t fire (cache, deploy lag, sticky tab):

| Control | Where |
|---------|--------|
| **Get latest** | Top-right floating chrome (always) |
| **Get latest version** | Profile → Get latest card |
| **Get latest version** | About sheet |

These **always** clear Cache Storage, unregister the service worker, and hard-reload with a cache-bust query — so you never chase a stale tab.

## Host notes

- **Render static / web service** serving `prototype/`: ensure `version.json` and `sw.js` are published at the same origin as the app.  
- Service workers need **HTTPS** (or localhost).  
- If a CDN sits in front, purge or set short TTL on `/`, `/version.json`, `/sw.js`.

## Product copy

Banner is product-only (“Update available”). No stack talk.

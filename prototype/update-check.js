/**
 * RollPhase update check — detect new deploys while the app stays open on a phone.
 * Polls version.json (cache-busted). Shows "Update available · Restart".
 */
const UpdateCheck = (() => {
  const STORAGE_BOOT = "rollphase.bootBuildId";
  const STORAGE_DISMISS = "rollphase.updateDismissed";
  const POLL_MS = 45 * 1000; // 45s — snappy for beta phones
  let boot = null;
  let timer = null;
  let checking = false;
  let bannerShown = false;

  function versionUrl() {
    // Relative to current page (works on Render, GH Pages, file server)
    const base = document.querySelector("base")?.href || location.href;
    const u = new URL("version.json", base);
    u.searchParams.set("_", String(Date.now()));
    return u.toString();
  }

  async function fetchVersion() {
    const res = await fetch(versionUrl(), {
      cache: "no-store",
      headers: { Accept: "application/json", "Cache-Control": "no-cache" },
    });
    if (!res.ok) throw new Error(`version ${res.status}`);
    return res.json();
  }

  function buildKey(v) {
    if (!v) return "";
    return String(v.buildId || v.version || "");
  }

  async function hardReload() {
    try {
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
    } catch {
      /* ignore */
    }
    try {
      if ("serviceWorker" in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        for (const r of regs) {
          if (r.waiting) {
            r.waiting.postMessage({ type: "SKIP_WAITING" });
          }
        }
      }
    } catch {
      /* ignore */
    }
    try {
      localStorage.removeItem(STORAGE_DISMISS);
      // Next successful load will write the new buildId
      localStorage.removeItem(STORAGE_BOOT);
    } catch {
      /* ignore */
    }
    try {
      sessionStorage.removeItem("rollphase.swReloaded");
    } catch {
      /* ignore */
    }
    const url = new URL(location.href);
    url.searchParams.set("_rp", Date.now().toString(36));
    location.replace(url.toString());
  }

  function hideBanner() {
    document.getElementById("updateBanner")?.remove();
    bannerShown = false;
  }

  function showBanner(remote) {
    if (bannerShown) {
      const msg = document.querySelector("#updateBanner .update-msg");
      if (msg && remote?.message) {
        msg.textContent = remote.message;
      }
      return;
    }
    bannerShown = true;
    document.getElementById("updateBanner")?.remove();

    const el = document.createElement("div");
    el.id = "updateBanner";
    el.setAttribute("role", "status");
    el.innerHTML = `
      <div class="update-banner-inner">
        <div class="update-banner-text">
          <strong>Update available</strong>
          <span class="update-msg">${escapeHtml(
            remote?.message || "A newer version of RollPhase is ready."
          )}</span>
        </div>
        <div class="update-banner-actions">
          <button type="button" class="update-btn-primary" id="updateRestart">Restart</button>
          <button type="button" class="update-btn-ghost" id="updateLater">Later</button>
        </div>
      </div>
    `;
    document.body.appendChild(el);

    el.querySelector("#updateRestart")?.addEventListener("click", () => {
      el.querySelector("#updateRestart").textContent = "Updating…";
      el.querySelector("#updateRestart").disabled = true;
      hardReload();
    });
    el.querySelector("#updateLater")?.addEventListener("click", () => {
      try {
        localStorage.setItem(
          STORAGE_DISMISS,
          JSON.stringify({ buildId: buildKey(remote), at: Date.now() })
        );
      } catch {
        /* ignore */
      }
      hideBanner();
    });
  }

  function escapeHtml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function wasDismissed(remoteKey) {
    try {
      const raw = localStorage.getItem(STORAGE_DISMISS);
      if (!raw) return false;
      const d = JSON.parse(raw);
      // Dismiss only applies to this specific build; new build shows again
      return d?.buildId === remoteKey;
    } catch {
      return false;
    }
  }

  async function check() {
    if (checking) return;
    checking = true;
    try {
      const remote = await fetchVersion();
      const remoteKey = buildKey(remote);
      if (!remoteKey) return;

      if (!boot) {
        // Previous session's build (survives soft reloads / bfcache)
        let previous = null;
        try {
          previous = localStorage.getItem(STORAGE_BOOT);
        } catch {
          previous = null;
        }
        boot = remote;
        window.ROLLPHASE_BUILD = remote;
        if (typeof BETA !== "undefined" && remote.version) {
          BETA.version = remote.version;
          BETA.buildId = remote.buildId;
          BETA.buildLabel = `Closed beta · ${remote.version}`;
        }
        // If server is already newer than what this tab last ran, prompt immediately
        if (previous && previous !== remoteKey && !wasDismissed(remoteKey)) {
          showBanner(remote);
        } else {
          try {
            localStorage.setItem(STORAGE_BOOT, remoteKey);
          } catch {
            /* ignore */
          }
        }
        return;
      }

      const bootKey = buildKey(boot);
      if (remoteKey !== bootKey && !wasDismissed(remoteKey)) {
        showBanner(remote);
      }
    } catch (e) {
      // Offline / host lag — silent
      console.debug("update-check", e);
    } finally {
      checking = false;
    }
  }

  function start() {
    check();
    if (timer) clearInterval(timer);
    timer = setInterval(check, POLL_MS);

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") check();
    });
    window.addEventListener("focus", () => check());
    window.addEventListener("online", () => check());

    // Service worker registration (helps clear old assets after deploys)
    if ("serviceWorker" in navigator) {
      const swUrl = new URL("sw.js", location.href);
      navigator.serviceWorker
        .register(swUrl.href)
        .then((reg) => {
          reg.addEventListener("updatefound", () => {
            const worker = reg.installing;
            if (!worker) return;
            worker.addEventListener("statechange", () => {
              if (worker.state === "installed" && navigator.serviceWorker.controller) {
                // New SW waiting — treat as update signal
                check();
                showBanner(
                  window.ROLLPHASE_BUILD
                    ? { ...window.ROLLPHASE_BUILD, message: "A newer version is ready." }
                    : { message: "A newer version is ready.", buildId: "sw" }
                );
              }
            });
          });
          // Proactive update check
          try {
            reg.update();
          } catch {
            /* ignore */
          }
        })
        .catch((e) => console.debug("sw register", e));

      navigator.serviceWorker.addEventListener("controllerchange", () => {
        // After skipWaiting — one reload is enough (avoid loops)
        if (sessionStorage.getItem("rollphase.swReloaded") === "1") return;
        sessionStorage.setItem("rollphase.swReloaded", "1");
        location.reload();
      });
    }
  }

  return { start, check, hardReload, showBanner };
})();

// Boot after DOM ready (works if deferred or end-of-body)
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => UpdateCheck.start());
} else {
  UpdateCheck.start();
}

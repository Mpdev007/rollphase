/**
 * RollShare.open({title, text, url}) — the share bottom sheet: the phone's own share sheet when
 * available, copy-link, a QR drawn on the phone (no third-party image service), save-QR-image,
 * and print-poster. See docs/mat-board/DESIGN.md "The QR poster".
 */
const RollShare = (() => {
  let overlay = null;
  let lastFocused = null;
  let qrModule = null;
  let activeDrawShareQr = null;

  async function loadQr() {
    if (qrModule) return qrModule;
    qrModule = await import("./vendor/lean-qr/index.mjs");
    return qrModule;
  }

  function close() {
    if (!overlay) return;
    overlay.remove();
    overlay = null;
    if (activeDrawShareQr) {
      window.removeEventListener("afterprint", activeDrawShareQr);
      activeDrawShareQr = null;
    }
    document.removeEventListener("keydown", onKeydown, true);
    // Keep history in sync: if our own entry is still on top (the user clicked Close/backdrop
    // rather than pressing Back), pop it so Back from the board doesn't land on a ghost step.
    if (history.state?.view === "overlay" && history.state?.name === "share") {
      try {
        history.back();
      } catch {
        /* ignore */
      }
    }
    if (lastFocused && typeof lastFocused.focus === "function") lastFocused.focus();
  }

  function onKeydown(e) {
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    }
  }

  function onPopstate() {
    // Any navigation away from our pushed entry (Back, or forward again) closes the sheet.
    if (overlay && !(history.state?.view === "overlay" && history.state?.name === "share")) {
      overlay.remove();
      overlay = null;
      document.removeEventListener("keydown", onKeydown, true);
    }
  }
  if (typeof window !== "undefined") window.addEventListener("popstate", onPopstate);

  /** Swaps (or adds) the src= query param on a hash-routed URL like #/gym/<id>?src=share. */
  function withSrc(url, src) {
    const [base, hash] = url.split("#");
    if (!hash) return url;
    const [path, query] = hash.split("?");
    const params = new URLSearchParams(query || "");
    params.set("src", src);
    return `${base}#${path}?${params.toString()}`;
  }

  async function open({ title, text, url }) {
    if (overlay) close();
    lastFocused = document.activeElement;

    overlay = document.createElement("div");
    overlay.className = "overlay";
    overlay.id = "shareOverlay";
    overlay.innerHTML = `
      <div class="sheet" role="dialog" aria-modal="true" aria-labelledby="shareTitle">
        <div class="sheet-handle"></div>
        <h2 id="shareTitle">Share</h2>
        <p class="sheet-sub">${escapeHtml(title || "")}</p>
        <div style="display:flex;flex-direction:column;align-items:center;gap:10px;margin:6px 0 16px">
          <canvas id="shareQrCanvas" width="200" height="200" style="width:200px;height:200px;image-rendering:pixelated;border-radius:12px;background:#fff"></canvas>
          <div id="shareUrlFallback" class="muted small" style="word-break:break-all;text-align:center;display:none" tabindex="0"></div>
        </div>
        <button type="button" class="btn-primary" id="shareNativeBtn" style="width:100%;margin-bottom:8px;padding:12px">Share…</button>
        <button type="button" class="btn-ghost" id="shareCopyBtn" style="width:100%;margin-bottom:8px;padding:12px">Copy link</button>
        <button type="button" class="btn-ghost" id="shareSaveQrBtn" style="width:100%;margin-bottom:8px;padding:12px">Save QR image</button>
        <button type="button" class="btn-ghost" id="sharePrintBtn" style="width:100%;margin-bottom:8px;padding:12px">Print poster</button>
        <button type="button" class="btn-ghost" id="shareCloseBtn" style="width:100%;padding:12px">Close</button>
      </div>
    `;
    document.body.appendChild(overlay);

    // Focus moves inside the dialog right away — not after the (async) QR draws below, which
    // would leave a keyboard/screen-reader user's focus stranded outside the dialog meanwhile.
    const sheetEl = overlay.querySelector(".sheet");
    sheetEl?.setAttribute("tabindex", "-1");
    sheetEl?.focus();

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) close();
    });
    document.addEventListener("keydown", onKeydown, true);
    if (history.state?.view !== "overlay" || history.state?.name !== "share") {
      try {
        history.pushState({ view: "overlay", name: "share", tab: typeof state !== "undefined" ? state.tab : undefined, rp: 1 }, "", location.hash);
      } catch {
        /* ignore */
      }
    }

    // Share…
    const nativeBtn = overlay.querySelector("#shareNativeBtn");
    const shareData = { title, text, url };
    const canShareIt = navigator.canShare ? navigator.canShare(shareData) : !!navigator.share;
    if (navigator.share && canShareIt) {
      nativeBtn.addEventListener("click", () => {
        navigator.share(shareData).catch(() => {});
      });
    } else {
      nativeBtn.hidden = true;
    }

    // Copy link
    overlay.querySelector("#shareCopyBtn").addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(url);
        window.RollToast?.show?.("Link copied");
      } catch {
        const fb = overlay.querySelector("#shareUrlFallback");
        fb.textContent = url;
        fb.style.display = "block";
        const range = document.createRange();
        range.selectNodeContents(fb);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      }
    });

    // QR — drawn on the phone, no third party. ≥ 200px, high contrast (pure black/white).
    const drawShareQr = async () => {
      try {
        const { generate, correction } = await loadQr();
        const code = generate(url, { minCorrectionLevel: correction.M });
        const canvas = overlay.querySelector("#shareQrCanvas");
        code.toCanvas(canvas, { on: [0, 0, 0, 255], off: [255, 255, 255, 255] });
        canvas.dataset.ready = "1";
      } catch (e) {
        console.warn("RollShare: QR generation failed", e);
      }
    };
    await drawShareQr();
    activeDrawShareQr = drawShareQr;
    window.addEventListener("afterprint", activeDrawShareQr);

    overlay.querySelector("#shareSaveQrBtn").addEventListener("click", () => {
      const canvas = overlay.querySelector("#shareQrCanvas");
      if (!canvas || canvas.dataset.ready !== "1") return;
      const a = document.createElement("a");
      a.href = canvas.toDataURL("image/png");
      a.download = `rollphase-qr-${(title || "gym").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.png`;
      a.click();
    });

    overlay.querySelector("#sharePrintBtn").addEventListener("click", async () => {
      // The printed poster's QR is tagged src=poster (not src=share), so scans from the wall are
      // told apart from in-app shares — DESIGN.md: "src=poster tells us which posters work."
      try {
        const { generate, correction } = await loadQr();
        const canvas = overlay.querySelector("#shareQrCanvas");
        const posterCode = generate(withSrc(url, "poster"), { minCorrectionLevel: correction.M });
        posterCode.toCanvas(canvas, { on: [0, 0, 0, 255], off: [255, 255, 255, 255] });
      } catch (e) {
        console.warn("RollShare: poster QR generation failed", e);
      }
      document.body.classList.add("poster");
      window.print();
    });

    overlay.querySelector("#shareCloseBtn").addEventListener("click", close);
  }

  return { open, close };
})();

window.addEventListener("afterprint", () => document.body.classList.remove("poster"));

if (typeof window !== "undefined") window.RollShare = RollShare;

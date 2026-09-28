// Check 7: the share sheet (dialog + focus), navigator.share payload, clipboard-denied fallback,
// the QR decodes to the board URL at DPR 4 and DPR 1, that URL opens straight to the board in a
// new context, and "Print poster" triggers window.print with the tab bar/controls hidden.
import { launchBrowser, openApp, openQaGym, qaGymId, waitForBoard, acceptBetaGate } from "./harness.mjs";
import { ensureServer, stopServer } from "./server.mjs";
import { makeChecker, ensureOutDir } from "./check.mjs";

const { check, summary } = makeChecker("s7-share");
const dir = ensureOutDir("s7");
const GYM = { id: qaGymId("share"), name: "QA Share Gym", lat: 32.5, lng: -101.5 };
const JSQR_CDN = "https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js";

async function decodeQr(page) {
  await page.addScriptTag({ url: JSQR_CDN });
  return page.evaluate(() => {
    const canvas = document.querySelector("#shareQrCanvas");
    if (!canvas) return null;
    const ctx = canvas.getContext("2d");
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const result = window.jsQR(img.data, img.width, img.height);
    return result?.data || null;
  });
}

const server = await ensureServer();
const browser = await launchBrowser();
try {
  const { page, context, pageErrors } = await openApp(browser, { geo: { latitude: GYM.lat, longitude: GYM.lng } });

  // Spy on navigator.share/canShare BEFORE the sheet builds itself (it checks these synchronously).
  await page.evaluate(() => {
    navigator.canShare = () => true;
    navigator.share = (data) => {
      window.__shareSpy = data;
      return Promise.resolve();
    };
  });

  await openQaGym(page, GYM);
  await waitForBoard(page);
  // One real slot, so the poster screenshot shows an actual week grid, not just the empty state.
  await page.locator('[data-action="add-slot"]').click();
  await page.locator("#mbfWeekday").selectOption(String(new Date().getDay()));
  await page.locator("#mbfStart").fill("18:00");
  await page.locator("#mbfKind").selectOption("open-mat");
  await page.locator("#mbfName").fill("QA-Poster-Athlete");
  await page.locator("#mbfSave").click();
  await page.locator(".mb-slot").first().waitFor({ state: "visible", timeout: 10000 });

  await page.locator("#mbShare").click();
  await page.locator("#shareOverlay .sheet").waitFor({ state: "visible", timeout: 5000 });

  check("sheet has role=dialog and aria-modal", (await page.locator('#shareOverlay .sheet[role="dialog"][aria-modal="true"]').count()) === 1);
  const focusInside = await page.evaluate(() => !!document.activeElement?.closest("#shareOverlay .sheet"));
  check("focus moved inside the dialog", focusInside);

  await page.locator("#shareNativeBtn").click();
  const shareData = await page.evaluate(() => window.__shareSpy);
  const expectedUrl = `${new URL(await page.url()).origin}/#/gym/${encodeURIComponent(GYM.id)}?src=share`;
  check("navigator.share received title/text/url", !!shareData?.title && !!shareData?.text && !!shareData?.url, JSON.stringify(shareData));
  check("share url matches the board URL", shareData?.url === expectedUrl, `${shareData?.url} vs ${expectedUrl}`);
  check("share url carries no coordinates", !/[?&](lat|lng|lat=|lon=)/i.test(shareData?.url || ""), shareData?.url);

  // Clipboard denied -> the URL is shown, selectable.
  await page.evaluate(() => {
    navigator.clipboard.writeText = () => Promise.reject(new Error("denied"));
  });
  await page.locator("#shareCopyBtn").click();
  await page.waitForTimeout(200);
  const fallback = page.locator("#shareUrlFallback");
  check("URL shown when clipboard is denied", await fallback.isVisible(), await fallback.textContent());
  const selectionText = await page.evaluate(() => window.getSelection()?.toString() || "");
  check("the shown URL is selected (selectable)", selectionText.trim().length > 0 && selectionText.includes(GYM.id), selectionText);

  // QR decodes to the board URL, at this context's DPR (4, from the harness) and at DPR 1.
  const decoded4 = await decodeQr(page);
  check("QR decodes to the board URL at DPR 4", decoded4 === expectedUrl, `decoded="${decoded4}"`);

  // openApp() hardcodes DPR 4 (the phone spec), so DPR 1 needs its own context built directly.
  const ctx1 = await browser.newContext({
    viewport: { width: 360, height: 740 },
    deviceScaleFactor: 1,
    geolocation: { latitude: GYM.lat, longitude: GYM.lng },
    permissions: ["geolocation"],
  });
  await ctx1.route("**/config.public.js", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/javascript",
      body: `window.ROLLPHASE_PUBLIC = { supabaseUrl: "https://ogvjfogfhodjwzjxsirt.supabase.co", supabaseKey: "sb_publishable_U0LN_YBnTEyvsIclmC1_pQ_eGVs-JGK" };`,
    })
  );
  const page1 = await ctx1.newPage();
  const pageErrors1 = [];
  page1.on("pageerror", (e) => pageErrors1.push(e));
  await page1.goto("http://127.0.0.1:8880/", { waitUntil: "domcontentloaded" });
  await acceptBetaGate(page1);
  await page1.waitForFunction(() => typeof state !== "undefined" && typeof openGymDetail === "function", { timeout: 8000 });
  await openQaGym(page1, GYM);
  await waitForBoard(page1);
  await page1.locator("#mbShare").click();
  await page1.locator("#shareOverlay .sheet").waitFor({ state: "visible", timeout: 5000 });
  const decoded1 = await decodeQr(page1);
  check("QR decodes to the board URL at DPR 1", decoded1 === expectedUrl, `decoded="${decoded1}"`);
  check("no pageerror (DPR 1 context)", pageErrors1.length === 0, pageErrors1.map((e) => e.message).join(" | "));
  await ctx1.close();

  // Opening the share URL fresh (new context) lands on the board, after the gate.
  const fresh = await openApp(browser, { geo: { latitude: GYM.lat, longitude: GYM.lng }, url: expectedUrl });
  await fresh.page.locator("#matBoard .mb-title, #matBoard .mb-empty").first().waitFor({ state: "visible", timeout: 12000 }).catch(() => {});
  const landedOnBoard = (await fresh.page.locator("#screen-gym-detail.active").count()) === 1;
  const boardTitleText = await fresh.page.locator("#matBoard .mb-title").textContent().catch(() => "");
  check("opening the share URL fresh lands on the gym-detail screen", landedOnBoard);
  check("the board shows the right gym", boardTitleText.includes(GYM.name), boardTitleText);
  check("no pageerror (fresh open)", fresh.pageErrors.length === 0, fresh.pageErrors.map((e) => e.message).join(" | "));
  await fresh.context.close();

  // "Print poster" calls window.print(); the print stylesheet hides the tab bar and controls.
  await page.evaluate(() => {
    window.__printed = false;
    window.print = () => {
      window.__printed = true;
    };
  });
  await page.locator("#sharePrintBtn").click();
  await page.waitForTimeout(300);
  const printed = await page.evaluate(() => window.__printed);
  check("Print poster calls window.print()", printed === true);
  check("body gets the .poster class for the print stylesheet", await page.evaluate(() => document.body.classList.contains("poster")));

  await page.emulateMedia({ media: "print" });
  await page.screenshot({ path: `${dir}/poster-print-emulated.png`, fullPage: true });
  const tabBarHidden = await page.evaluate(() => getComputedStyle(document.querySelector(".tab-bar")).visibility === "hidden");
  const shareButtonsHidden = await page.evaluate(() => getComputedStyle(document.querySelector("#shareCopyBtn")).display === "none");
  check("print stylesheet hides the tab bar", tabBarHidden);
  check("print stylesheet hides the sheet's own controls (Copy/Save/Print/Close)", shareButtonsHidden);
  await page.emulateMedia({ media: "screen" });

  check("no pageerror (main flow)", pageErrors.length === 0, pageErrors.map((e) => e.message).join(" | "));
  await context.close();
} finally {
  await browser.close();
  stopServer(server);
}

console.log(`\nStaging test data created (for cleanup): gym ${GYM.id}`);
process.exit(summary() ? 0 : 1);

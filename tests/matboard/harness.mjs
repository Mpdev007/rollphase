// Shared Playwright harness for the Mat Board specs.
// Real Chrome, phone size (360x740, DPR 4, touch, Android UA), a fixed geolocation, the beta gate
// accepted, and the laptop-only endpoints route-blocked so tests never depend on them.
import { chromium } from "playwright";

export const APP_URL = "http://127.0.0.1:8880/";
export const ANDROID_UA =
  "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36";

const BLOCKED_PATTERNS = [
  "**/formsubmit.co/**",
  "**/enrich",
  "**127.0.0.1:8877**",
  "**127.0.0.1:8878**",
];

// Rule 11: tests write to rollphase-staging, never prod. config.public.js (committed, ships to
// real users) points at prod, so every test context intercepts that one request and serves the
// staging URL/key instead. The app under test never touches prod through this harness.
const STAGING_CONFIG = `window.ROLLPHASE_PUBLIC = {
  supabaseUrl: "https://ogvjfogfhodjwzjxsirt.supabase.co",
  supabaseKey: "sb_publishable_U0LN_YBnTEyvsIclmC1_pQ_eGVs-JGK",
};
`;

/** Launches one browser for the whole run. Call `await browser.close()` when done. */
export async function launchBrowser() {
  return chromium.launch({ channel: "chrome", headless: true });
}

/**
 * Opens a fresh phone-size context + page, blocks the laptop-only endpoints, grants geolocation
 * to `geo` ({lat, lng}), navigates to the app and gets past the beta gate.
 * Returns { context, page, pageErrors } — pageErrors accumulates every `pageerror` event so a
 * spec can assert 0 at the end.
 */
export async function openApp(browser, { geo, url = APP_URL, storageState, onPageCreated } = {}) {
  const context = await browser.newContext({
    viewport: { width: 360, height: 740 },
    deviceScaleFactor: 4,
    isMobile: true,
    hasTouch: true,
    userAgent: ANDROID_UA,
    geolocation: geo || { latitude: 30.2672, longitude: -97.7431 },
    permissions: ["geolocation"],
    storageState,
  });

  for (const pattern of BLOCKED_PATTERNS) {
    await context.route(pattern, (route) => route.abort());
  }
  await context.route("**/config.public.js", (route) =>
    route.fulfill({ status: 200, contentType: "application/javascript", body: STAGING_CONFIG })
  );

  const pageErrors = [];
  const page = await context.newPage();
  page.on("pageerror", (err) => pageErrors.push(err));
  // Fires before navigation, so a caller can attach request/response listeners early enough to
  // observe the app's own boot-time network calls (they can start within milliseconds of load).
  if (onPageCreated) await onPageCreated(page);

  await page.goto(url, { waitUntil: "domcontentloaded" });
  await acceptBetaGate(page);

  return { context, page, pageErrors };
}

/** Accepts the closed-beta disclaimer gate if it's showing. Idempotent. */
export async function acceptBetaGate(page) {
  const agree = page.locator("#betaAgree");
  try {
    await agree.waitFor({ state: "attached", timeout: 5000 });
  } catch {
    return; // gate wasn't rendered (already acked via storageState, or missing) — fine
  }
  if (!(await page.locator("#betaGate").count())) return;
  await agree.check();
  await page.locator("#betaEnter").click();
  await page.locator("#betaGate").waitFor({ state: "detached", timeout: 5000 }).catch(() => {});
}

/** True once the change feed's system "ok" message would have landed for a channel this old.
 * Not used directly by specs (the client-side rule is in board.js); kept here for reference. */
export const REALTIME_READY_NOTE =
  '"SUBSCRIBED" is not "live" — wait for the postgres_changes system "ok" message before trusting a board as real-time.';

/**
 * Injects a synthetic venue into state.live.places (the shape places-live.js produces) and opens
 * its gym-detail screen, the same way a real search result would — without depending on step 6's
 * OSM-vs-gyms_near work or on any real OSM/Overpass data. Used for every board test so nothing
 * ever touches Pure Brazilian Jiu Jitsu or needs live geolocation search.
 */
export async function openQaGym(page, { id, name, lat, lng, sports = ["bjj"], city = "Austin, TX" } = {}) {
  await page.evaluate(
    (g) => {
      state.live.places.push({
        id: g.id,
        name: g.name,
        lat: g.lat,
        lng: g.lng,
        mi: 0.1,
        sports: g.sports,
        tags: {},
        here: {},
        promo: {},
        social: {},
        address: "",
        city: g.city,
        phone: "",
        website: "",
        open: null,
        live: true,
        amenities: [],
      });
      openGymDetail(g.id);
    },
    { id, name, lat, lng, sports, city }
  );
}

/** A fresh id for a throwaway test gym, in the convention the architect's cleanup SQL matches. */
export function qaGymId(tag = "board") {
  return `qa-gym-${tag}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

/** Waits until the board has finished its first load (empty state, a slot card, or an error). */
export async function waitForBoard(page, timeout = 8000) {
  await page
    .waitForFunction(
      () => !!document.querySelector("#matBoard .mb-empty, #matBoard .mb-slot, #matBoard .mb-refusal-note"),
      { timeout }
    )
    .catch(() => {});
}

/**
 * Waits until the board's realtime channel has reached the "ready" system message (board.js
 * shows "Live" only then — see step 5.4). Tests interact only after this, same as a real user
 * would see: it avoids racing a click against the reload the ready message itself triggers.
 */
export async function waitForLive(page, timeout = 10000) {
  await page.waitForFunction(() => document.querySelector("#matBoard .mb-sub")?.textContent?.includes("Live"), { timeout }).catch(() => {});
}

export function outDir(step) {
  return new URL(`./out/${step}/`, import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
}

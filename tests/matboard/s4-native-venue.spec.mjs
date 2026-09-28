// Completes Check 4 on safe test data: a "native" venue (source != 'osm', like Pure Brazilian
// Jiu Jitsu) needs address/phone/website from the gyms row (gyms_near's own RPC doesn't return
// them), and a gym-website-sourced, unconfirmed slot must show "from the gym's schedule".
//
// A gym-website-sourced slot can only be inserted by the architect's privileged path (RLS's own
// "add slot" policy requires source='member' for a regular signed-in user — confirmed by trying
// it here first). So the gym row is seeded for real (safe: a throwaway qa-gym, never Pure
// Brazilian), and the one gym-website slot is supplied by mocking that specific REST response —
// a standard way to exercise the real rendering code against an exact, controlled shape without
// needing elevated database access. Everything else (auth, the gym row, the venue-facts render,
// the confirm-line logic in board.js) is the real staging backend and real app code.
import { launchBrowser, openApp, qaGymId, waitForBoard } from "./harness.mjs";
import { ensureServer, stopServer } from "./server.mjs";
import { makeChecker, ensureOutDir } from "./check.mjs";

const { check, summary } = makeChecker("s4-native-venue");
const dir = ensureOutDir("s4");
const GYM_ID = qaGymId("native");
const LAT = 41.9908,
  LNG = -87.7958; // same neighborhood as Pure Brazilian; never its own id

const server = await ensureServer();
const browser = await launchBrowser();
try {
  const { page, context, pageErrors } = await openApp(browser, { geo: { latitude: LAT, longitude: LNG } });

  // Prove the RLS boundary first: a regular signed-in user cannot insert a gym-website slot.
  const rlsCheck = await page.evaluate(async ({ id }) => {
    await RP.user();
    const s = await RP.db.from("slots").insert({ gym_id: id, weekday: 0, start_min: 60, sport: "bjj", source: "gym-website" });
    return { refused: !!s.error, message: s.error?.message };
  }, { id: GYM_ID });
  check("RLS refuses a gym-website slot from a regular user (confirms who may add one)", rlsCheck.refused, rlsCheck.message);

  // Seed the venue for real (source='gym-website', address/phone/website — the shape
  // seed/first_gym.sql gives Pure Brazilian). No slots table write needed for this part.
  const seeded = await page.evaluate(
    async ({ id, lat, lng }) => {
      const user = await RP.user();
      if (!user) return { ok: false, step: "sign-in" };
      const g = await RP.db.from("gyms").insert({
        id,
        name: `QA Native Venue ${id}`,
        loc: `SRID=4326;POINT(${lng} ${lat})`,
        city: "Chicago, IL",
        address: "123 Test Ave, Chicago, IL 60631",
        phone: "(773) 555-0100",
        website: "https://example.invalid/qa-native",
        source: "gym-website",
        source_url: "https://example.invalid/qa-native/schedule",
      });
      return g.error ? { ok: false, step: "gym insert", error: g.error.message } : { ok: true };
    },
    { id: GYM_ID, lat: LAT, lng: LNG }
  );
  check("seed: native venue (gym-website, address/phone/website) inserted", seeded.ok, JSON.stringify(seeded));

  // Mock the ONE board_slots response for this gym: a single gym-website slot, unconfirmed —
  // exactly the shape check 4 asks the board to render as "from the gym's schedule".
  const fakeSlot = {
    id: 999000001,
    gym_id: GYM_ID,
    weekday: new Date().getDay(),
    start_min: 1080,
    duration_min: 90,
    sport: "bjj",
    kind: "class",
    gear: ["gi"],
    note: null,
    confirmed_by: null,
    confirmed_at: new Date().toISOString(),
    created_by: null,
    removed_at: null,
    source: "gym-website",
    source_url: "https://example.invalid/qa-native/schedule",
    audience: "adult",
    gym_name: `QA Native Venue ${GYM_ID}`,
    in_count: 0,
  };
  await context.route(`**/rest/v1/board_slots?select=*&gym_id=eq.${GYM_ID}*`, (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([fakeSlot]) })
  );

  // Find it through the real search path (gyms_near) and open its detail — this upserts the gym
  // row, which is fine: it's the throwaway QA venue, never Pure Brazilian.
  await page.evaluate(() => switchTab("gyms", { historyMode: "replace" }));
  await page.evaluate(({ lat, lng }) => loadLivePlaces({ lat, lng, force: true }), { lat: LAT, lng: LNG });
  await page.locator(`article.card[data-gym="${GYM_ID}"]`).waitFor({ state: "visible", timeout: 8000 }).catch(() => {});
  check("found via gyms_near search, card in the Gyms list", (await page.locator(`article.card[data-gym="${GYM_ID}"]`).count()) >= 1);

  await page.locator(`article.card[data-gym="${GYM_ID}"]`).click();
  await waitForBoard(page);
  await page.screenshot({ path: `${dir}/native-venue-detail.png` });

  const overviewText = await page.locator("#gymDetailBody").innerText();
  check("venue facts show the address", overviewText.includes("123 Test Ave"), overviewText.slice(0, 200));
  check("venue facts show the phone", overviewText.includes("(773) 555-0100"), overviewText.slice(0, 200));

  const confLine = await page.locator(".mb-slot-conf").first().textContent();
  check(
    "unconfirmed gym-website slot shows 'from the gym's schedule'",
    /from the gym's schedule/.test(confLine),
    confLine.trim()
  );

  check("no pageerror", pageErrors.length === 0, pageErrors.map((e) => e.message).join(" | "));
  await context.close();
} finally {
  await browser.close();
  stopServer(server);
}

console.log(`\nStaging test data created (for cleanup): gym ${GYM_ID}`);
process.exit(summary() ? 0 : 1);

// Check 9: a card with boardSlots > 0 shows "Next open mat: <weekday time>" (gear chips folded in)
// and the drop-in fee; editing the fee on the board updates the card within 2s of a refresh.
import { launchBrowser, openAppPersistent, openQaGym, qaGymId, waitForBoard, waitForLive } from "./harness.mjs";
import { ensureServer, stopServer } from "./server.mjs";
import { makeChecker } from "./check.mjs";

const { check, summary } = makeChecker("s9-travel");
const GYM = { id: qaGymId("travel"), name: "QA Travel Gym", lat: 41.0, lng: -95.0 };
const TODAY_WEEKDAY = new Date().getDay();

function fmtClock(h, m) {
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

const server = await ensureServer();
const browser = await launchBrowser();
try {
  const geo = { latitude: GYM.lat, longitude: GYM.lng };
  const A = await openAppPersistent(browser, "s9-travel-A", { geo });

  await openQaGym(A.page, GYM);
  await waitForBoard(A.page);
  await waitForLive(A.page);

  // A couple of hours from now, today — deterministic and always in the future for this run.
  const soon = new Date(Date.now() + 2 * 60 * 60 * 1000);
  const startHH = String(soon.getHours()).padStart(2, "0");
  const startMM = String(soon.getMinutes()).padStart(2, "0");
  const expectedClock = fmtClock(soon.getHours(), soon.getMinutes());

  await A.page.locator('[data-action="add-slot"]').click();
  await A.page.locator("#mbfWeekday").selectOption(String(TODAY_WEEKDAY));
  await A.page.locator("#mbfStart").fill(`${startHH}:${startMM}`);
  await A.page.locator("#mbfDuration").fill("90");
  await A.page.locator("#mbfSport").selectOption("bjj");
  await A.page.locator("#mbfKind").selectOption("open-mat");
  await A.page.locator('[data-gear="gi"]').click();
  const nameField = A.page.locator("#mbfName");
  if (await nameField.count()) await nameField.fill("QA-Travel-A");
  await A.page.locator("#mbfSave").click();
  await A.page.waitForTimeout(1500);
  check("slot appears on the board", (await A.page.locator(".mb-slot").count()) === 1);

  // Set the drop-in fee via the board's own edit control (this step's new UI).
  await A.page.locator('[data-action="edit-fee"]').click();
  await A.page.locator('[data-field="fee"]').fill("$20 drop-in");
  await A.page.locator("#mbMiniSave").click();
  await A.page.waitForTimeout(1500);
  const feeRowText1 = await A.page.locator(".mb-fee-row").textContent();
  check("board shows the fee just set", /\$20 drop-in/.test(feeRowText1), feeRowText1.trim());

  // "Searching the seeded city" — a lat/lng search centered on this gym (city-search's own end
  // state once Nominatim resolves a name to coordinates), forced fresh so it isn't served from a
  // stale in-memory places list from this session's earlier boot.
  await A.page.evaluate(
    ({ lat, lng }) => loadLivePlaces({ lat, lng, force: true, sport: null }),
    { lat: GYM.lat, lng: GYM.lng }
  );
  await A.page.evaluate(() => switchTab("gyms"));
  // The Gyms tab warm-starts from a locally cached places list (a prior run's, under this same
  // persistent identity) before the forced fetch above resolves and replaces it — so this waits
  // for our specific gym id, not just "a" card.
  await A.page.waitForFunction(
    (gymId) => !!document.querySelector(`#gymList [data-gym="${gymId}"]`),
    GYM.id,
    { timeout: 10000 }
  );
  const cardText1 = await A.page.locator(`#gymList [data-gym="${GYM.id}"]`).textContent();
  check("card shows Next open mat with the right weekday/time", cardText1.includes(`Next open mat`) && cardText1.includes(expectedClock), cardText1.replace(/\s+/g, " ").trim());
  check("card's next-open-mat line includes the gear chip", cardText1.includes("gi"), cardText1.replace(/\s+/g, " ").trim());
  check("card shows the drop-in fee", cardText1.includes("$20 drop-in"), cardText1.replace(/\s+/g, " ").trim());

  // Edit the fee again on the board; the card should pick up the new value within 2s of a refresh.
  await A.page.evaluate(() => switchTab("home"));
  await openQaGym(A.page, GYM);
  await waitForBoard(A.page);
  await A.page.locator('[data-action="edit-fee"]').click();
  await A.page.locator('[data-field="fee"]').fill("$35 drop-in");
  await A.page.locator("#mbMiniSave").click();
  await A.page.waitForTimeout(1500);

  const t0 = Date.now();
  await A.page.evaluate(
    ({ lat, lng }) => loadLivePlaces({ lat, lng, force: true, sport: null }),
    { lat: GYM.lat, lng: GYM.lng }
  );
  await A.page.evaluate(() => switchTab("gyms"));
  await A.page.waitForFunction(
    (gymId) => document.querySelector(`#gymList [data-gym="${gymId}"]`)?.textContent?.includes("$35 drop-in"),
    GYM.id,
    { timeout: 10000 }
  );
  const elapsed = Date.now() - t0;
  check("card reflects the updated fee within 2s of the refresh", elapsed <= 2000, `${elapsed}ms`);

  let allErrors = [...A.pageErrors];
  check("no pageerror across the run", allErrors.length === 0, allErrors.map((e) => e.message).join(" | "));

  await A.context.close();
} finally {
  await browser.close();
  stopServer(server);
}

console.log(`\nStaging test data created (for cleanup): gym ${GYM.id}`);
process.exit(summary() ? 0 : 1);

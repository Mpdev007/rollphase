// Check 5: the board page, two contexts A and B on a throwaway staging gym (never Pure Brazilian).
import { launchBrowser, openApp, openQaGym, qaGymId, waitForBoard, waitForLive } from "./harness.mjs";
import { ensureServer, stopServer } from "./server.mjs";
import { makeChecker, ensureOutDir } from "./check.mjs";

const { check, summary } = makeChecker("s5-board");
const dir = ensureOutDir("s5");
const GYM = { id: qaGymId("board"), name: "QA Board Gym", lat: 30.2672, lng: -97.7431 };
const TODAY_WEEKDAY = new Date().getDay();

const server = await ensureServer();
const browser = await launchBrowser();
const allPageErrors = [];

try {
  const A = await openApp(browser, { geo: { latitude: GYM.lat, longitude: GYM.lng } });
  const B = await openApp(browser, { geo: { latitude: GYM.lat, longitude: GYM.lng } });
  allPageErrors.push(...A.pageErrors, ...B.pageErrors);

  // --- A opens the board: empty state, no fake slots ---
  await openQaGym(A.page, GYM);
  await waitForBoard(A.page);
  await waitForLive(A.page);
  check("A: empty state shows, no fake slots", (await A.page.locator(".mb-empty").count()) === 1);
  await A.page.screenshot({ path: `${dir}/a-empty.png` });

  // --- A adds "Tue 19:00, 90 min, bjj, open-mat, gi" (using TODAY's weekday so it's visible in
  // the 7-day window regardless of which real day this runs on) ---
  await A.page.locator('[data-action="add-slot"]').click();
  await A.page.locator("#mbfWeekday").selectOption(String(TODAY_WEEKDAY));
  await A.page.locator("#mbfStart").fill("19:00");
  await A.page.locator("#mbfDuration").fill("90");
  await A.page.locator("#mbfSport").selectOption("bjj");
  await A.page.locator("#mbfKind").selectOption("open-mat");
  await A.page.locator('[data-gear="gi"]').click();
  await A.page.locator("#mbfName").fill("QA-Athlete-A");
  await A.page.locator("#mbfSave").click();
  await A.page.waitForTimeout(1000);
  check("A: slot appears on A's own board", (await A.page.locator(".mb-slot").count()) === 1);

  // --- B's board shows it within 2s, without reload ---
  await openQaGym(B.page, GYM);
  await waitForBoard(B.page);
  await waitForLive(B.page);
  const t0 = Date.now();
  await B.page.locator(".mb-slot").first().waitFor({ state: "visible", timeout: 5000 }).catch(() => {});
  const sawSlotMs = Date.now() - t0;
  check("B: sees A's slot within 2s (realtime, no reload)", sawSlotMs <= 2000, `${sawSlotMs} ms`);
  await A.page.screenshot({ path: `${dir}/a-with-slot.png` });
  await B.page.screenshot({ path: `${dir}/b-sees-slot.png` });

  // --- B taps "I'm in": A sees "1 in" + B's name (white, self-declared) within 2s ---
  await B.page.locator('[data-action="imin"]').first().click();
  await B.page.waitForTimeout(300);
  // B has no profile yet: the mini name/belt sheet should appear
  const miniVisible = await B.page.locator("#mbMiniOverlay").count();
  check("B: name prompt appears (no profile yet)", miniVisible === 1);
  await B.page.locator('[data-field="name"]').fill("QA-Athlete-B");
  await B.page.locator('[data-field="belt"]').fill("white");
  await B.page.locator("#mbMiniSave").click();
  await B.page.waitForTimeout(500);

  const t1 = Date.now();
  await A.page.locator(".mb-imin-names").first().filter({ hasText: "QA-Athlete-B" }).waitFor({ timeout: 5000 }).catch(() => {});
  const sawIminMs = Date.now() - t1;
  const aImin = await A.page.locator(".mb-imin").first().textContent();
  const aNames = await A.page.locator(".mb-imin-names").first().textContent();
  check("A: sees the tap within 2s", sawIminMs <= 2000, `${sawIminMs} ms`);
  check('A: count reads "1 in"', aImin.trim() === "1 in", aImin.trim());
  check(
    "A: names line shows B (white, self-declared)",
    /QA-Athlete-B/.test(aNames) && /white/.test(aNames) && /self-declared/.test(aNames),
    aNames.trim()
  );

  // --- B taps again: A sees 0 ---
  await B.page.locator('[data-action="imin"]').first().click();
  await B.page.waitForTimeout(1000);
  const bImin2 = await B.page.locator(".mb-imin").first().textContent();
  await A.page.waitForTimeout(1200);
  const aImin2 = await A.page.locator(".mb-imin").first().textContent();
  check('A: after B leaves, count reads "0 in"', aImin2.trim() === "0 in", `A=${aImin2.trim()} B=${bImin2.trim()}`);

  // --- B taps "Confirm" on A's slot: the "confirmed by" line changes to B ---
  await B.page.locator('[data-action="confirm"]').first().click();
  await B.page.waitForTimeout(1200);
  const confLine = await B.page.locator(".mb-slot-conf").first().textContent();
  check("B: confirming updates the line to B's own name", /QA-Athlete-B/.test(confLine), confLine.trim());
  await A.page.waitForTimeout(1000);
  const confLineA = await A.page.locator(".mb-slot-conf").first().textContent();
  check("A: sees the updated confirm line live", /QA-Athlete-B/.test(confLineA), confLineA.trim());

  // --- A taps "I'm here" from the gym's own coordinates ---
  await A.page.locator('[data-action="checkin"]').click();
  await A.page.waitForTimeout(1500);
  const checkinMsg = await A.page.locator("#mbCheckinMsg").textContent();
  check('A: "I\'m here" from the gym succeeds', /You're here until/.test(checkinMsg), checkinMsg.trim());
  await B.page.waitForTimeout(1200);
  const bHereList = await B.page.locator(".mb-here-list").textContent().catch(() => "");
  check("B: Here-now shows A within a couple seconds", /QA-Athlete-A/.test(bHereList), bHereList.trim());

  // --- A fresh far-away check-in is refused, and shows nothing new as checked in ---
  // The geolocation the far context is GRANTED is what check_in() sees; A's board-page geo is
  // separate (its own context), so A's earlier successful check-in is untouched either way.
  const far = await openApp(browser, { geo: { latitude: GYM.lat + 0.05, longitude: GYM.lng } }); // ~5.6 km north
  allPageErrors.push(...far.pageErrors);
  await openQaGym(far.page, GYM);
  await waitForBoard(far.page);
  await waitForLive(far.page);
  const hereCountBefore = await far.page.locator(".mb-here-chip").count();
  const hereTextBefore = await far.page.locator(".mb-here-list").textContent().catch(() => "(none)");
  await far.page.locator('[data-action="checkin"]').click();
  await far.page
    .waitForFunction(() => {
      const t = document.querySelector("#mbCheckinMsg")?.textContent?.trim();
      return t && t !== "Finding you…";
    }, { timeout: 8000 })
    .catch(() => {});
  const farMsg = await far.page.locator("#mbCheckinMsg").textContent();
  check("far away: plain refusal message shown", /too far|150 m/.test(farMsg), `msg="${farMsg.trim()}" before=${hereCountBefore} (${hereTextBefore.trim()})`);
  const hereCountAfter = await far.page.locator(".mb-here-chip").count();
  check("far away: nothing new shown as checked in", hereCountAfter === hereCountBefore, `${hereCountBefore} -> ${hereCountAfter}`);
  allPageErrors.push(...far.pageErrors);
  await far.context.close();

  // --- Offline: kill the network, reload, board renders from cache with the offline line ---
  await A.context.setOffline(true);
  await A.page.reload({ waitUntil: "domcontentloaded" }).catch(() => {});
  await A.page.waitForTimeout(1000);
  // reload wipes in-memory state.live.places; re-inject the same gym so openGymDetail can find it
  await openQaGym(A.page, GYM).catch(() => {});
  await A.page.waitForTimeout(800);
  const offlineNote = await A.page.locator(".mb-offline-note").count();
  check("offline: board renders from cache with the offline note", offlineNote === 1);
  await A.page.screenshot({ path: `${dir}/a-offline.png` });
  await A.context.setOffline(false);

  // --- No sideways scroll at 360 ---
  const scrollWidthOk = await A.page.evaluate(() => document.documentElement.scrollWidth <= 361);
  check("no sideways scroll at 360px", scrollWidthOk);

  allPageErrors.push(...A.pageErrors, ...B.pageErrors);
  check("pageerror count is 0 across all of it", allPageErrors.length === 0, allPageErrors.map((e) => e.message).join(" | "));

  await A.context.close();
  await B.context.close();
} finally {
  await browser.close();
  stopServer(server);
}

console.log(`\nStaging test data created (for cleanup): gym ${GYM.id}`);
process.exit(summary() ? 0 : 1);

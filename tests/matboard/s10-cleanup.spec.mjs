// Check 10: a full walk of all five tabs + board + share sheet + settings, in the harness:
// 0 pageerror, 0 requests to 127.0.0.1:8877/8878, Partners shows the honest interim card (no
// filter pills, no fake matched-partner list), and the old #checkInHere button is gone.
import { launchBrowser, openAppPersistent, openQaGym, qaGymId, waitForBoard, waitForLive } from "./harness.mjs";
import { ensureServer, stopServer } from "./server.mjs";
import { makeChecker } from "./check.mjs";

const { check, summary } = makeChecker("s10-cleanup");
const GYM = { id: qaGymId("cleanup"), name: "QA Cleanup Gym", lat: 39.0, lng: -88.0 };

const server = await ensureServer();
const browser = await launchBrowser();
try {
  const geo = { latitude: GYM.lat, longitude: GYM.lng };
  const blockedRequests = [];
  const A = await openAppPersistent(browser, "s10-cleanup-A", {
    geo,
    onPageCreated: (page) => {
      page.on("request", (req) => {
        if (/127\.0\.0\.1:8877|127\.0\.0\.1:8878/.test(req.url())) blockedRequests.push(req.url());
      });
    },
  });

  // --- Home ---
  await A.page.evaluate(() => switchTab("home"));
  await A.page.waitForTimeout(300);
  check("Home tab renders", (await A.page.locator("#screen-home.active").count()) === 1);

  // --- Gyms ---
  await A.page.evaluate(() => switchTab("gyms"));
  await A.page.waitForTimeout(300);
  check("Gyms tab renders", (await A.page.locator("#screen-gyms.active").count()) === 1);

  // --- Partners: honest interim card, no filter pills, no fake matched-partner list ---
  await A.page.evaluate(() => switchTab("partners"));
  await A.page.waitForTimeout(300);
  const partnersHTML = await A.page.locator("#screen-partners").innerHTML();
  check("Partners shows the honest card copy", partnersHTML.includes("Who's training is on each gym's board."), partnersHTML.slice(0, 200));
  check("Partners has a Go to Gyms button", (await A.page.locator("#partnersToGyms").count()) === 1);
  check("Partners has no rank/level filter pills", (await A.page.locator("#partnerFilters").count()) === 0);
  check("Partners has no fake partner-card entries", (await A.page.locator(".partner-card").count()) === 0);
  await A.page.locator("#partnersToGyms").click();
  await A.page.waitForTimeout(300);
  check("Go to Gyms button actually switches tabs", (await A.page.locator("#screen-gyms.active").count()) === 1);

  // --- Feed › Live, before any check-in: the honest empty state (never a mock "live" event) ---
  await A.page.evaluate(() => switchTab("feed"));
  await A.page.waitForTimeout(300);
  check("Feed tab renders", (await A.page.locator("#screen-feed.active").count()) === 1);
  await A.page.locator('[data-feed="live"]').click();
  await A.page.waitForTimeout(1500);
  const feedLiveBefore = await A.page.locator("#feedBody").innerHTML();
  check("Feed Live before any check-in shows the honest empty state", feedLiveBefore.includes("Nothing live right now"), feedLiveBefore.slice(0, 200));

  // --- Profile / Settings ---
  await A.page.evaluate(() => switchTab("profile"));
  await A.page.waitForTimeout(300);
  check("Profile tab renders", (await A.page.locator("#screen-profile.active").count()) === 1);
  await A.page.evaluate(() => openProfileSettings());
  await A.page.waitForTimeout(300);
  check("Settings panel opens", (await A.page.locator("#profileSettings").isHidden()) === false);

  // --- The board: open, check in, no old check-in button anywhere ---
  await openQaGym(A.page, GYM);
  await waitForBoard(A.page);
  await waitForLive(A.page);
  check("openGymDetail no longer renders the old #checkInHere button", (await A.page.locator("#checkInHere").count()) === 0);
  await A.page.locator('[data-action="checkin"]').click();
  await A.page
    .waitForFunction(() => {
      const t = document.querySelector("#mbCheckinMsg")?.textContent?.trim();
      return t && t !== "Finding you…";
    }, { timeout: 10000 })
    .catch(() => {});
  await A.page.waitForTimeout(1000);
  const checkinMsg = await A.page.locator("#mbCheckinMsg").textContent();
  check("board's real 'I'm here' check-in works", /here until/i.test(checkinMsg), checkinMsg.trim());

  // --- Feed › Live again, now really checked in: the real check-in card, not a mock event ---
  await A.page.evaluate(() => switchTab("feed"));
  await A.page.evaluate(() => renderFeed());
  await A.page.waitForTimeout(1500);
  const feedLiveAfter = await A.page.locator("#feedBody").innerHTML();
  check("Feed Live reflects the real check-in", feedLiveAfter.includes("You're checked in") && feedLiveAfter.includes(GYM.name), feedLiveAfter.slice(0, 300));

  // --- Back to the board for the share sheet, opened and closed ---
  await openQaGym(A.page, GYM);
  await waitForBoard(A.page);
  await A.page.locator("#mbShare").click();
  await A.page.waitForTimeout(300);
  check("share sheet opens", (await A.page.locator("#shareCloseBtn").count()) === 1);
  await A.page.locator("#shareCloseBtn").click();
  await A.page.waitForTimeout(300);
  check("share sheet closes", (await A.page.locator("#shareCloseBtn").count()) === 0);

  check("no requests to the retired enrich/local endpoints (127.0.0.1:8877/8878)", blockedRequests.length === 0, blockedRequests.join(", "));
  check("no pageerror across the full walk", A.pageErrors.length === 0, A.pageErrors.map((e) => e.message).join(" | "));

  await A.context.close();
} finally {
  await browser.close();
  stopServer(server);
}

console.log(`\nStaging test data created (for cleanup): gym ${GYM.id}`);
process.exit(summary() ? 0 : 1);

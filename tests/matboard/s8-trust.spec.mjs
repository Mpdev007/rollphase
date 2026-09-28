// Check 8: the belt handshake and the training passport. A, B, C (and later E) check in at a
// throwaway qa gym; D never checks in. B is the subject being attested (belt "blue").
//
// Uses openAppPersistent/saveIdentity (not openApp) for A-E: Supabase's anonymous sign-in is
// capped at 30/hour/IP, and this spec alone opens 5 contexts. Re-running it fresh every time while
// debugging burns through that budget in a handful of runs and produces misleading "permission
// denied for function check_in/attest_belt" failures that look like app bugs but are really rate
// limiting. Reusing 5 fixed identities across runs keeps this spec (and the dev loop) reliable.
import { launchBrowser, openAppPersistent, saveIdentity, openQaGym, qaGymId, waitForBoard } from "./harness.mjs";
import { ensureServer, stopServer } from "./server.mjs";
import { makeChecker } from "./check.mjs";

const { check, summary } = makeChecker("s8-trust");
const GYM = { id: qaGymId("trust"), name: "QA Trust Gym", lat: 34.0, lng: -104.0 };
// A, B, C, D, E are persistent identities reused across runs (see the note above); B's belt from
// an earlier run would already be verified in the database, so a fresh, never-before-attested
// belt string is used each run — attest_belt() recalculates belt_verified from scratch for
// whichever belt value is passed, so the very first attestation on a new belt string correctly
// resets it to false before the 3rd attestation flips it true again.
const BELT = `blue-${Date.now()}`;

async function setProfile(ctx, tag, name, belt) {
  const userId = await ctx.page.evaluate(
    async ({ name, belt }) => {
      const u = await RP.user();
      if (!u) return null;
      await RP.ensureProfile(name, "bjj", belt || null);
      return u.id;
    },
    { name, belt }
  );
  // Only cache a session that actually signed in — caching a failed (rate-limited) anonymous
  // sign-in would permanently pin this tag to a broken, unauthenticated identity on every future
  // run (existsSync would keep finding "a" cached session and never retry the sign-in).
  if (userId) await saveIdentity(ctx, tag);
  else console.warn(`setProfile: ${tag} has no session (RP.user() returned null) — not caching`);
}

async function checkIn(ctx) {
  await ctx.page.locator('[data-action="checkin"]').click();
  await ctx.page
    .waitForFunction(() => {
      const t = document.querySelector("#mbCheckinMsg")?.textContent?.trim();
      return t && t !== "Finding you…";
    }, { timeout: 10000 })
    .catch(() => {});
}

async function attestBtnFor(page, subjectName) {
  return page.locator(`[data-action="attest"]`, { hasText: `Rolled with ${subjectName}` });
}

const server = await ensureServer();
const browser = await launchBrowser();
try {
  const geo = { latitude: GYM.lat, longitude: GYM.lng };
  const A = await openAppPersistent(browser, "s8-trust-A", { geo });
  const B = await openAppPersistent(browser, "s8-trust-B", { geo });
  const C = await openAppPersistent(browser, "s8-trust-C", { geo });
  const D = await openAppPersistent(browser, "s8-trust-D", { geo }); // never checks in
  const E = await openAppPersistent(browser, "s8-trust-E", { geo });

  for (const ctx of [A, B, C, D, E]) {
    await openQaGym(ctx.page, GYM);
    await waitForBoard(ctx.page);
  }

  await setProfile(A, "s8-trust-A", "QA-Trust-A", null);
  await setProfile(B, "s8-trust-B", "QA-Trust-B", BELT); // the subject
  await setProfile(C, "s8-trust-C", "QA-Trust-C", null);
  await setProfile(D, "s8-trust-D", "QA-Trust-D", null);
  await setProfile(E, "s8-trust-E", "QA-Trust-E", null);

  // A, B, C check in (D deliberately does not).
  await checkIn(A);
  await checkIn(B);
  await checkIn(C);
  await A.page.waitForTimeout(3000); // let realtime settle across all boards

  // A attests B: B is still self-declared (1 of 3 needed).
  const aBtn = await attestBtnFor(A.page, "QA-Trust-B");
  await aBtn.waitFor({ state: "visible", timeout: 15000 });
  await aBtn.click();
  await A.page.waitForTimeout(3000);
  const aAttestMsg = (await A.page.locator("#mbAttestMsg").textContent()).trim();
  check("A's attest click did not surface an error", !/err|violat|exception|refus|denied/i.test(aAttestMsg), aAttestMsg || "(empty)");
  const bChipAfterA = await A.page.locator(".mb-here-chip", { hasText: "QA-Trust-B" }).first().textContent();
  check("after 1 attestation, B is still self-declared", /self-declared/.test(bChipAfterA), bChipAfterA);

  // C attests B: still self-declared (2 of 3).
  const cBtn = await attestBtnFor(C.page, "QA-Trust-B");
  await cBtn.waitFor({ state: "visible", timeout: 15000 });
  await cBtn.click();
  await C.page.waitForTimeout(3000);
  const cAttestMsg = (await C.page.locator("#mbAttestMsg").textContent()).trim();
  check("C's attest click did not surface an error", !/err|violat|exception|refus|denied/i.test(cAttestMsg), cAttestMsg || "(empty)");
  const bChipAfterC = await C.page.locator(".mb-here-chip", { hasText: "QA-Trust-B" }).first().textContent();
  check("after 2 attestations, B is still self-declared", /self-declared/.test(bChipAfterC), bChipAfterC);

  // D (not checked in) attempts to attest B: the database's own error is shown.
  const dBtn = await attestBtnFor(D.page, "QA-Trust-B");
  const dBtnCount = await dBtn.count();
  if (dBtnCount > 0) {
    await dBtn.first().click();
    await D.page.waitForTimeout(3000);
    const dMsg = (await D.page.locator("#mbAttestMsg").textContent()).trim();
    check("D (not checked in) attesting B shows an error", dMsg.length > 0 && !/^Confirmed/.test(dMsg), dMsg || "(empty)");
  } else {
    // D isn't checked in, so D's own board may not show a "Here now" list at all for others in
    // the same way; call the RPC directly to prove the database itself refuses it either way.
    const direct = await D.page.evaluate(async ({ subjectId, belt }) => {
      const r = await RP.db.rpc("attest_belt", { p_subject: subjectId, p_belt: belt });
      return r.error?.message || null;
    }, { subjectId: await B.page.evaluate(async () => (await RP.user()).id), belt: BELT });
    check("D (not checked in) attesting B is refused by the database", !!direct, direct);
  }

  // B attesting B (self-attestation) is refused.
  const selfErr = await B.page.evaluate(async (belt) => {
    const me = await RP.user();
    const r = await RP.db.rpc("attest_belt", { p_subject: me.id, p_belt: belt });
    return r.error?.message || null;
  }, BELT);
  check("B's own attestation of B is refused", !!selfErr, selfErr);

  // E checks in and attests B too (by clicking the real button, same as A and C did above): now
  // A, C, E have all attested -> B shows verified.
  await checkIn(E);
  await E.page.waitForTimeout(3000);
  const eBtn = await attestBtnFor(E.page, "QA-Trust-B");
  await eBtn.waitFor({ state: "visible", timeout: 15000 });
  const bSubjectId = await eBtn.getAttribute("data-subject");
  await eBtn.click();
  await E.page.waitForTimeout(3000);
  const eAttestMsg = (await E.page.locator("#mbAttestMsg").textContent()).trim();
  check("E's attest click did not surface an error", !/err|violat|exception|refus|denied/i.test(eAttestMsg), eAttestMsg || "(empty)");

  const attRows = await B.page.evaluate(async (subjectId) => {
    const r = await RP.db.from("attestations").select("attester,belt").eq("subject", subjectId);
    return r.data ?? r.error?.message;
  }, bSubjectId);
  check("3 distinct attestations recorded for B's blue belt", Array.isArray(attRows) && attRows.filter((a) => a.belt === BELT).length === 3, JSON.stringify(attRows));

  // profiles isn't in supabase_realtime (only slots/intents/checkins are — PLAYBOOK.md), so B's
  // belt_verified flip reaches A's already-open board via board.js's 20s poll, not instantly.
  await A.page.waitForTimeout(23000);
  const bChipFinal = await A.page.locator(".mb-here-chip", { hasText: "QA-Trust-B" }).first().textContent();
  check("after 3 distinct co-located attestations, B shows verified", /verified/.test(bChipFinal), bChipFinal);

  // A's passport lists the gym with 1 visit.
  await A.page.evaluate(() => switchTab("profile", { historyMode: "replace" }));
  await A.page.locator("#passportBody").waitFor({ state: "visible", timeout: 10000 });
  await A.page.waitForFunction(() => !document.querySelector("#passportBody")?.textContent?.includes("Loading"), { timeout: 15000 }).catch(() => {});
  const passportText = await A.page.locator("#passportBody").textContent();
  check(
    "A's passport lists the gym with 1 visit",
    passportText.includes(GYM.name) && /1 visit/.test(passportText),
    passportText.trim()
  );

  let allErrors = [];
  for (const ctx of [A, B, C, D, E]) allErrors.push(...ctx.pageErrors);
  check("no pageerror across all contexts", allErrors.length === 0, allErrors.map((e) => e.message).join(" | "));

  for (const ctx of [A, B, C, D, E]) await ctx.context.close();
} finally {
  await browser.close();
  stopServer(server);
}

console.log(`\nStaging test data created (for cleanup): gym ${GYM.id}`);
process.exit(summary() ? 0 : 1);

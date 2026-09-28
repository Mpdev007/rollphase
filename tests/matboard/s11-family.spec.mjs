// Check 11: Family Access. The full check needs a qa gym with a real kids slot, a staff account
// and permanent qa users with credentials handed to this run (never in a file) — per PLAYBOOK.md.
// Neither is available in this environment:
//   - No kids/teens slot can be inserted via the API at all — the "add slot" RLS policy requires
//     audience='adult' OR is_gym_staff(gym_id), and this run has no staff row anywhere. Verified by
//     the RLS-refusal check below, then worked around the same way Check 4 did: mocking the one
//     board_slots REST response with the exact shape the database would actually return.
//   - No permanent (non-anonymous) account is reachable: RP.db.auth.signUp() returns "email rate
//     limit exceeded" (Supabase's own free-tier SMTP send cap, already exhausted) — confirmed live
//     against rollphase-staging before writing this spec, not assumed. Without a permanent account,
//     is_permanent_user() is false, which blocks: adding a child, requesting family access, and
//     therefore the entire staff-verification flow end to end.
// What IS real and tested: the client's own count/signup rendering rules against the database's
// actual response shape (mocked, since a real one can't be created), and every permission gate's
// real refusal message for a caller this run genuinely has (anonymous) — proving the gates work,
// even though the success path behind them can't be exercised. Gaps are recorded as FAIL with a
// "BLOCKED:" detail, not skipped silently — see REPORT.md.
import { launchBrowser, openAppPersistent, qaGymId, waitForBoard } from "./harness.mjs";
import { ensureServer, stopServer } from "./server.mjs";
import { makeChecker, ensureOutDir } from "./check.mjs";

const { check, summary } = makeChecker("s11-family");
const dir = ensureOutDir("s11");
const GYM = { id: qaGymId("family"), lat: 44.0, lng: -93.0 };

function blocked(name, reason) {
  check(name, false, `BLOCKED: ${reason}`);
}

const server = await ensureServer();
const browser = await launchBrowser();
try {
  const geo = { latitude: GYM.lat, longitude: GYM.lng };
  const A = await openAppPersistent(browser, "s11-family-A", { geo });

  // --- Confirm the RLS boundary that forces the mock below (no staff row anywhere for this run) ---
  const kidsSlotRls = await A.page.evaluate(
    async (gymId) => {
      const s = await RP.db.from("slots").insert({ gym_id: gymId, weekday: 0, start_min: 60, sport: "bjj", audience: "kids", created_by: (await RP.user()).id, source: "member" });
      return { refused: !!s.error, message: s.error?.message };
    },
    GYM.id
  );
  check("RLS refuses a kids/teens slot from a non-staff user (confirms why the render test below is mocked)", kidsSlotRls.refused, kidsSlotRls.message);

  // --- Real permission-gate refusals, as the anonymous user this run actually has ---
  const gateChecks = await A.page.evaluate(async (gymId) => {
    const me = (await RP.user()).id;
    const results = {};
    results.addChild = await RP.db.from("children").insert({ guardian_id: me, initial: "J", age_band: "4-7" }).then((r) => r.error?.message || null);
    results.requestFamily = await RP.db.rpc("request_family_verification", { p_gym: gymId }).then((r) => r.error?.message || null);
    results.verifyFamily = await RP.db.rpc("verify_family", { p_guardian: me, p_gym: gymId }).then((r) => r.error?.message || null);
    results.revokeFamily = await RP.db.rpc("revoke_family", { p_guardian: me, p_gym: gymId }).then((r) => r.error?.message || null);
    results.addStaff = await RP.db.rpc("add_gym_staff", { p_gym: gymId, p_user: me, p_role: "coach" }).then((r) => r.error?.message || null);
    return results;
  }, GYM.id);
  check("an anonymous user adding a child is refused by RLS (is_permanent_user())", !!gateChecks.addChild, gateChecks.addChild);
  check("request_family_verification refuses an anonymous user", /full account/i.test(gateChecks.requestFamily || ""), gateChecks.requestFamily);
  check("verify_family refuses a non-staff, non-admin caller", /only this gym's staff/i.test(gateChecks.verifyFamily || ""), gateChecks.verifyFamily);
  check("revoke_family refuses a non-staff, non-admin caller", /only this gym's staff/i.test(gateChecks.revokeFamily || ""), gateChecks.revokeFamily);
  check("add_gym_staff refuses a non-admin caller", /only a platform admin/i.test(gateChecks.addStaff || ""), gateChecks.addStaff);

  // --- Rendering rules for a kids/teens slot, against the database's real response shape (mocked
  // per the RLS proof above): time+note visible, Kids badge, no count, no Sign up, no Edit/Confirm.
  const fakeSlot = {
    id: 999100001,
    gym_id: GYM.id,
    weekday: new Date().getDay(),
    start_min: 960,
    duration_min: 60,
    sport: "bjj",
    kind: "kids",
    gear: [],
    audience: "kids",
    note: "ages 4-7",
    confirmed_by: null,
    confirmed_at: new Date().toISOString(),
    created_by: null,
    removed_at: null,
    source: "member",
    source_url: null,
    gym_name: "QA Family Gym",
    in_count: null, // exactly what the database returns to a non-family, non-staff viewer
  };
  await A.context.route(`**/rest/v1/board_slots?select=*&gym_id=eq.${GYM.id}*`, (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([fakeSlot]) })
  );
  await A.page.evaluate(
    (g) => {
      state.live.places.push({ id: g.id, name: "QA Family Gym", lat: g.lat, lng: g.lng, mi: 0.1, sports: ["bjj"], tags: {}, here: {}, promo: {}, social: {}, address: "", city: "", phone: "", website: "", open: null, live: true, amenities: [] });
      openGymDetail(g.id);
    },
    GYM
  );
  await waitForBoard(A.page);
  await A.page.waitForTimeout(1500);
  await A.page.screenshot({ path: `${dir}/anon-kids-slot.png` });

  const slotCard = A.page.locator(".mb-slot").first();
  const slotText = await slotCard.textContent();
  check("kids slot shows its time and note ('ages 4-7')", slotText.includes("ages 4-7"), slotText.replace(/\s+/g, " ").trim());
  check("kids slot is tagged Kids", (await slotCard.locator(".mb-kind-badge").textContent()).trim() === "Kids");
  check("no count shown for a non-family viewer (in_count is null, not 0)", !/kids coming/.test(slotText), slotText.replace(/\s+/g, " ").trim());
  check("no Sign up button shown (viewer has no children)", (await slotCard.locator(".mb-signup-btn").count()) === 0);
  check("no Edit/Confirm actions shown (viewer is not staff at this gym)", (await slotCard.locator('[data-action="confirm"], [data-action="edit"]').count()) === 0);

  // --- Family.mount()'s anonymous-viewer branch (the only family.js path reachable without a
  // permanent account) ---
  await A.page.evaluate(() => switchTab("profile"));
  await A.page.waitForTimeout(500);
  const familyHTML = await A.page.locator("#familySection").innerHTML();
  check("Family card shows the anonymous 'add your email' prompt", /Add your email/i.test(familyHTML), familyHTML.slice(0, 200));
  check("Family card offers an account-upgrade action", (await A.page.locator("#familyUpgradeBtn").count()) === 1);

  // --- What could not be verified: permanent account + staff/admin bootstrap, per the header note ---
  blocked(
    "permanent user without a child sees the same as anonymous (no count/signup)",
    "no confirmed permanent account reachable — RP.db.auth.signUp() returns 429 'email rate limit exceeded' against rollphase-staging"
  );
  blocked(
    "parent with a child, no verification: refusal message + Request access button, on a real insert attempt",
    "adding a child requires is_permanent_user(); same signup blocker as above"
  );
  blocked(
    "staff verifies a request; within 2s the parent's board shows '0 kids coming' and a working Sign up",
    "no gym_staff or app_admin row exists for any account this run controls, and neither can be created via the anon-key API by design (app_admins has no reachable RLS policy; add_gym_staff itself requires is_app_admin())"
  );
  blocked(
    "after sign-up, the parent sees '1 kids coming'; a second verified family sees 1 but no name",
    "downstream of the staff-verification blocker above"
  );
  blocked(
    "staff cannot verify its own family (the database's own error is shown)",
    "downstream of the staff-verification blocker above"
  );

  check("no pageerror across the run", A.pageErrors.length === 0, A.pageErrors.map((e) => e.message).join(" | "));

  await A.context.close();
} finally {
  await browser.close();
  stopServer(server);
}

console.log(`\nStaging test data created (for cleanup): gym ${GYM.id}`);
process.exit(summary() ? 0 : 1);

// Check 3 (browser part): the app page loads supabase-client.js against STAGING (never prod —
// see harness.mjs's config.public.js route override), RP.user() returns a user id, and a second
// reload returns the SAME id (no second anonymous sign-in — the session persists).
import { launchBrowser, openApp } from "./harness.mjs";
import { ensureServer, stopServer } from "./server.mjs";
import { makeChecker } from "./check.mjs";

const { check, summary } = makeChecker("s3-supabase (browser)");
const server = await ensureServer();
const browser = await launchBrowser();
try {
  const { context, page, pageErrors } = await openApp(browser);

  const cfg = await page.evaluate(() => window.ROLLPHASE_PUBLIC);
  check(
    "config.public.js was swapped to staging, not prod",
    cfg?.supabaseUrl === "https://ogvjfogfhodjwzjxsirt.supabase.co",
    JSON.stringify(cfg)
  );

  const rpReady = await page.evaluate(() => typeof window.RP === "object" && window.RP !== null);
  check("window.RP exists", rpReady);

  const id1 = await page.evaluate(async () => (await window.RP.user())?.id || null);
  check("RP.user() returns a user id", typeof id1 === "string" && id1.length > 10, String(id1));

  // Persist the session, then reload the same context (same storage) and confirm no re-sign-in.
  const storageState = await context.storageState();
  await context.close();

  const second = await openApp(browser, { storageState });
  const id2 = await second.page.evaluate(async () => (await window.RP.user())?.id || null);
  check("a second load returns the SAME user id (no second sign-in)", id2 === id1, `${id1} vs ${id2}`);
  check("no pageerror on first load", pageErrors.length === 0, pageErrors.map((e) => e.message).join(" | "));
  check(
    "no pageerror on second load",
    second.pageErrors.length === 0,
    second.pageErrors.map((e) => e.message).join(" | ")
  );

  await second.context.close();
} finally {
  await browser.close();
  stopServer(server);
}

process.exit(summary() ? 0 : 1);

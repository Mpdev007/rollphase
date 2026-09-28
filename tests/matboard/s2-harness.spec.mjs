// Check 2: the harness itself — opens the app, gets past the beta gate, lands on Home with 0
// pageerror, and takes the required screenshot.
import { launchBrowser, openApp } from "./harness.mjs";
import { ensureServer, stopServer } from "./server.mjs";
import { makeChecker, ensureOutDir } from "./check.mjs";

const { check, summary } = makeChecker("s2-harness");
const server = await ensureServer();
const browser = await launchBrowser();
try {
  const { page, pageErrors } = await openApp(browser);

  check("beta gate is gone after accepting it", (await page.locator("#betaGate").count()) === 0);
  check(
    "Home screen is active",
    await page.locator('#screen-home.active, [data-screen="home"].active').count().then((n) => n > 0)
  );
  check("body is not beta-locked", !(await page.evaluate(() => document.body.classList.contains("beta-locked"))));

  const dir = ensureOutDir("s2");
  await page.screenshot({ path: `${dir}/home.png` });
  check("screenshot saved", true, `${dir}/home.png`);

  check("no pageerror", pageErrors.length === 0, pageErrors.map((e) => e.message).join(" | "));
} finally {
  await browser.close();
  stopServer(server);
}

process.exit(summary() ? 0 : 1);

// Runs every browser spec (s*.spec.mjs) in this directory, in numeric order, and prints one
// PASS/FAIL summary. Exits non-zero if any spec exits non-zero (a spec exits non-zero on any
// failed check or any pageerror — see check.mjs and harness.mjs).
import { readdirSync } from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ensureServer, stopServer } from "./server.mjs";

const dir = path.dirname(fileURLToPath(import.meta.url));
const specs = readdirSync(dir)
  .filter((f) => /^s\d+[a-z0-9-]*\.spec\.mjs$/.test(f))
  .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

if (!specs.length) {
  console.log("No specs found (expected files matching s<n>-*.spec.mjs).");
  process.exit(1);
}

const server = await ensureServer();
let allOk = true;
try {
  for (const spec of specs) {
    console.log(`\n=== ${spec} ===`);
    const code = await new Promise((resolve) => {
      const child = spawn(process.execPath, [path.join(dir, spec)], {
        stdio: "inherit",
        env: process.env,
      });
      child.on("exit", (code) => resolve(code ?? 1));
    });
    if (code !== 0) allOk = false;
  }
} finally {
  stopServer(server);
}

console.log(allOk ? "\n=== ALL SPECS PASSED ===" : "\n=== SOME SPECS FAILED ===");
process.exit(allOk ? 0 : 1);

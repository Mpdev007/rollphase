// Shared PASS/FAIL checker, same idiom as s3-supabase.test.mjs, reused by every browser spec.
export function makeChecker(label) {
  const results = [];
  function check(name, ok, detail = "") {
    results.push({ name, ok, detail });
    console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  | " + detail : ""}`);
    return ok;
  }
  function summary() {
    const pass = results.filter((r) => r.ok).length;
    console.log(`\n${label}: ${pass}/${results.length} passed`);
    return pass === results.length;
  }
  return { check, summary, results };
}

import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

/** Ensures tests/matboard/out/<step>/ exists and returns its absolute path. */
export function ensureOutDir(step) {
  const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), "out", step);
  mkdirSync(dir, { recursive: true });
  return dir;
}

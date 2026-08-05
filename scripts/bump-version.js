/**
 * Bump prototype/version.json (+ sw.js BUILD_ID) before every ship.
 * Usage:
 *   node scripts/bump-version.js
 *   node scripts/bump-version.js --message "Live venues"
 *   node scripts/bump-version.js --version 0.5.1
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const root = path.join(__dirname, "..");
const versionPath = path.join(root, "prototype", "version.json");
const swPath = path.join(root, "prototype", "sw.js");

function arg(name, fallback = null) {
  const i = process.argv.indexOf(name);
  if (i >= 0 && process.argv[i + 1]) return process.argv[i + 1];
  return fallback;
}

function shortGit() {
  try {
    return execSync("git rev-parse --short HEAD", { cwd: root, encoding: "utf8" }).trim();
  } catch {
    return "local";
  }
}

function pad(n) {
  return String(n).padStart(2, "0");
}

function buildIdNow() {
  const d = new Date();
  const stamp = `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}-${pad(
    d.getUTCHours()
  )}${pad(d.getUTCMinutes())}`;
  return `${stamp}-${shortGit()}`;
}

let current = {
  version: "0.5.0",
  buildId: "0",
  builtAt: new Date().toISOString(),
  message: "Update",
};
if (fs.existsSync(versionPath)) {
  try {
    current = { ...current, ...JSON.parse(fs.readFileSync(versionPath, "utf8")) };
  } catch {
    /* keep defaults */
  }
}

const nextVersion = arg("--version", current.version);
const message = arg("--message", current.message || "App update");
const buildId = buildIdNow();
const builtAt = new Date().toISOString();

const next = {
  version: nextVersion,
  buildId,
  builtAt,
  message,
};

fs.writeFileSync(versionPath, JSON.stringify(next, null, 2) + "\n");

if (fs.existsSync(swPath)) {
  let sw = fs.readFileSync(swPath, "utf8");
  sw = sw.replace(/BUILD_ID:\s*[^\n]+/, `BUILD_ID: ${buildId}`);
  sw = sw.replace(
    /const BUILD_ID = ["'][^"']*["']/,
    `const BUILD_ID = ${JSON.stringify(buildId)}`
  );
  fs.writeFileSync(swPath, sw);
}

console.log("Bumped version:");
console.log(JSON.stringify(next, null, 2));

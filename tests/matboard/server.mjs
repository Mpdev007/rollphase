// Starts/stops `python -m http.server 8880` serving prototype/, for tests only.
// A spec run standalone starts and stops its own server; run.mjs starts one server for the whole
// batch and every spec detects it's already up, so nothing double-starts or gets killed early.
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PORT = 8880;
const PROTO_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "prototype");

async function isUp() {
  try {
    const res = await fetch(`http://127.0.0.1:${PORT}/`, { signal: AbortSignal.timeout(500) });
    return res.ok;
  } catch {
    return false;
  }
}

/** Ensures the prototype is served on :8880. Returns a handle for stopServer(). */
export async function ensureServer() {
  if (await isUp()) return { started: false, proc: null };
  const proc = spawn("python", ["-m", "http.server", String(PORT), "--bind", "127.0.0.1"], {
    cwd: PROTO_DIR,
    stdio: "ignore",
  });
  for (let i = 0; i < 100; i++) {
    if (await isUp()) return { started: true, proc };
    await new Promise((r) => setTimeout(r, 100));
  }
  try {
    proc.kill();
  } catch {
    /* ignore */
  }
  throw new Error(`prototype server did not come up on :${PORT} within 10s`);
}

export function stopServer(handle) {
  if (handle?.started && handle.proc) {
    try {
      handle.proc.kill();
    } catch {
      /* ignore */
    }
  }
}

export const APP_PORT = PORT;

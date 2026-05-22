/**
 * RouletteLock Admin Server
 *
 * One-command development environment that:
 * 1. Exports fresh data from SQLite to JSON (for the static frontend)
 * 2. Starts the API server on port 3000 (admin CRUD, git ops)
 * 3. Starts the Vite dev server on port 5173 (HMR hot-reload for frontend)
 *
 * Vite proxies /api/* requests to the API server, so the frontend
 * works with live data while enjoying instant hot-reload on code changes.
 *
 * Run with: bun run admin
 */

import { exportToJson } from "../src/db/adapter";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");
const FRONTEND_DIR = path.join(PROJECT_ROOT, "frontend");

// ─── Step 1: Export fresh data ─────────────────────────────────────

console.log("\n  🗂️  Exporting fresh data from SQLite...");
exportToJson();
console.log("  ✅ Data exported\n");

// ─── Step 2: Start API server ──────────────────────────────────────

console.log("  🚀 Starting API server on http://localhost:3000");

const apiProc = Bun.spawn(["bun", "run", "dev/server.ts"], {
  cwd: PROJECT_ROOT,
  stdio: ["inherit", "inherit", "inherit"],
  env: { ...process.env },
});

// Give the API server a moment to start
await new Promise((r) => setTimeout(r, 500));

// ─── Step 3: Start Vite dev server ─────────────────────────────────

console.log("  🌀 Starting Vite dev server on http://localhost:5173");
console.log("  🌐 Open http://localhost:5173 to view the app\n");
console.log("  ℹ️  Vite proxies /api/* → localhost:3000");
console.log("  ℹ️  Press Ctrl+C to stop both servers\n");

const viteProc = Bun.spawn(["bun", "run", "dev"], {
  cwd: FRONTEND_DIR,
  stdio: ["inherit", "inherit", "inherit"],
  env: { ...process.env },
});

// ─── Clean shutdown ────────────────────────────────────────────────

function cleanup() {
  console.log("\n\n  🛑 Shutting down...");
  apiProc.kill("SIGTERM");
  viteProc.kill("SIGTERM");
  process.exit(0);
}

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);

// Wait for either process to exit (error or manual stop)
const [apiExit, viteExit] = await Promise.all([
  apiProc.exited.catch(() => null),
  viteProc.exited.catch(() => null),
]);

if (apiExit !== 0 || viteExit !== 0) {
  console.error("  ❌ A server exited unexpectedly");
  cleanup();
}

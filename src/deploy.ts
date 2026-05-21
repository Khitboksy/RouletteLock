/**
 * RouletteLock Deploy Script
 *
 * Builds the static site from the current SQLite database and updates
 * the gh-pages orphan branch.
 *
 * Run with: bun run deploy
 *
 * Workflow:
 *   1. bun run serve  — start local server with admin panel
 *   2. Edit data via admin panel, commit changes
 *   3. bun run deploy — export DB → JSON, build frontend, update gh-pages
 *   4. git push origin --all  — push both main + gh-pages
 */

import { exportToJson } from "./db/adapter";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");

console.log("\n  🚀 RouletteLock Deploy\n");

// ── Step 1: Export data ────────────────────────────────────────────
console.log("  [1/4] Exporting data from SQLite...");
exportToJson();
console.log("  ✅ Data exported to frontend/public/data/\n");

// ── Step 2: Build frontend ─────────────────────────────────────────
console.log("  [2/4] Building frontend...");
const frontendDir = path.join(PROJECT_ROOT, "frontend");
const buildResult = Bun.spawnSync(["bun", "run", "build"], {
  cwd: frontendDir,
  env: { ...process.env, PATH: `${path.join(frontendDir, "node_modules", ".bin")}:${process.env.PATH || ""}` },
});
if (!buildResult.success) {
  console.error("  ❌ Frontend build failed:");
  console.error(buildResult.stderr.toString());
  process.exit(1);
}
console.log("  ✅ Frontend built\n");

// ── Step 3: Capture current branch ─────────────────────────────────
const branchResult = Bun.spawnSync(["git", "branch", "--show-current"], {
  cwd: PROJECT_ROOT,
});
const currentBranch = branchResult.stdout.toString().trim();
console.log(`  [3/4] Current branch: ${currentBranch}`);

// ── Step 4: Update gh-pages branch ─────────────────────────────────
console.log("  [4/4] Updating gh-pages branch...");

// Check if gh-pages exists locally
const branchList = Bun.spawnSync(["git", "branch"], { cwd: PROJECT_ROOT });
const hasGhPages = branchList.stdout.toString().includes("gh-pages");

if (hasGhPages) {
  // Delete old gh-pages branch
  const delResult = Bun.spawnSync(["git", "branch", "-D", "gh-pages"], {
    cwd: PROJECT_ROOT,
  });
  if (!delResult.success) {
    console.error("  ❌ Failed to delete old gh-pages branch");
    console.error(delResult.stderr.toString());
    process.exit(1);
  }
}

// Create new orphan gh-pages branch
const orphanResult = Bun.spawnSync(["git", "checkout", "--orphan", "gh-pages"], {
  cwd: PROJECT_ROOT,
});
if (!orphanResult.success) {
  console.error("  ❌ Failed to create gh-pages branch");
  console.error(orphanResult.stderr.toString());
  process.exit(1);
}

// Remove all tracked files
Bun.spawnSync(["git", "rm", "-rf", "."], { cwd: PROJECT_ROOT });

// Copy dist contents to root
const distDir = path.join(PROJECT_ROOT, "frontend", "dist");
const copyResult = Bun.spawnSync(["cp", "-r", `${distDir}/.`, PROJECT_ROOT], {
  cwd: PROJECT_ROOT,
});
if (!copyResult.success) {
  console.error("  ❌ Failed to copy dist files");
  console.error(copyResult.stderr.toString());
  process.exit(1);
}

// Add and commit
Bun.spawnSync(["git", "add", "-A"], { cwd: PROJECT_ROOT });
const commitResult = Bun.spawnSync(["git", "commit", "-m", "deploy: static site build"], {
  cwd: PROJECT_ROOT,
});
if (!commitResult.success) {
  const stderr = commitResult.stderr.toString();
  if (stderr.includes("nothing to commit")) {
    console.log("  ⚠️  Nothing changed — gh-pages is up to date");
  } else {
    console.error("  ❌ Failed to commit gh-pages:");
    console.error(stderr);
    process.exit(1);
  }
} else {
  console.log(`  ✅ gh-pages branch updated: ${commitResult.stdout.toString().trim()}`);
}

// ── Step 5: Return to original branch ───────────────────────────────
const checkoutResult = Bun.spawnSync(["git", "checkout", currentBranch], {
  cwd: PROJECT_ROOT,
});
if (!checkoutResult.success) {
  console.error(`  ❌ Failed to return to ${currentBranch}`);
  console.error(checkoutResult.stderr.toString());
  process.exit(1);
}

console.log(`  ✅ Returned to ${currentBranch}\n`);

// ── Summary ─────────────────────────────────────────────────────────
console.log("  ─── Done ───");
console.log(`  📦 Data exported to frontend/public/data/`);
console.log(`  🌐 Frontend built in frontend/dist/`);
console.log(`  🌿 gh-pages branch updated`);
console.log("");
console.log("  Next steps:");
console.log(`    git push origin ${currentBranch}`);
console.log("    git push origin gh-pages");
console.log("");

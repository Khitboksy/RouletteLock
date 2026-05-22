/**
 * RouletteLock Deploy Script
 *
 * Builds the static site from the current SQLite database and updates
 * the gh-pages branch — ONLY index.html, assets/, and data/. No source
 * code, no dependencies, no package.json, no tsconfig.
 *
 * Run with: bun run deploy
 *
 * Workflow:
 *   1. Export SQLite → JSON (frontend/public/data/)
 *   2. Build frontend via Vite (frontend/dist/)
 *   3. Stash working tree (preserves node_modules across branch switch)
 *   4. Temp-backup dist/ → /tmp/roulettelock-dist-backup-*
 *   5. Checkout gh-pages (create with --orphan if first time)
 *   6. git rm -rf .  (clear old gh-pages contents)
 *   7. Remove untracked artifacts that leaked from main (src, frontend, etc.)
 *   8. Copy dist/ from backup back
 *   9. Stage only: index.html  assets/  data/
 *  10. git commit -m "deploy: static site build"
 *  11. Return to original branch
 *  12. Pop stash (restores node_modules and work-in-progress)
 *  13. Clean up temp backup
 */

import { exportToJson } from "./db/adapter";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");

// ─── Helpers ────────────────────────────────────────────────────────

function run(
  cmd: string,
  args: string[],
  opts?: { cwd?: string; label?: string; exitOnError?: boolean },
): { success: boolean; stdout: string; stderr: string } {
  const result = Bun.spawnSync([cmd, ...args], {
    cwd: opts?.cwd ?? PROJECT_ROOT,
    env: { ...process.env },
  });
  const ok = result.exitCode === 0;
  if (!ok && opts?.exitOnError !== false) {
    console.error(`  ❌ ${opts?.label ?? `${cmd} ${args.join(" ")}`} failed:`);
    console.error(result.stderr.toString());
    process.exit(1);
  }
  return { success: ok, stdout: result.stdout.toString().trim(), stderr: result.stderr.toString().trim() };
}

// ─── Main ───────────────────────────────────────────────────────────

async function main() {
  console.log("\n  🚀 RouletteLock Deploy\n");

  // ── Step 1: Export data ──────────────────────────────────────────
  console.log("  [1/4] Exporting data from SQLite...");
  exportToJson();
  console.log("  ✅ Data exported to frontend/public/data/\n");

  // ── Step 2: Build frontend ───────────────────────────────────────
  console.log("  [2/4] Building frontend...");
  const frontendDir = path.join(PROJECT_ROOT, "frontend");
  const buildResult = Bun.spawnSync(["bun", "run", "build"], {
    cwd: frontendDir,
  });
  if (!buildResult.success) {
    console.error("  ❌ Frontend build failed:");
    console.error(buildResult.stderr.toString());
    process.exit(1);
  }
  console.log("  ✅ Frontend built\n");

  // ── Step 3: Note current branch & stash ─────────────────────────
  const branchResult = run("git", ["branch", "--show-current"], { label: "get current branch" });
  const currentBranch = branchResult.stdout;
  console.log(`  [3/4] Current branch: ${currentBranch}`);

  const STASH_MSG = "roulettelock-deploy-temp";
  const distDir = path.join(PROJECT_ROOT, "frontend", "dist");

  // Stash ALL changes (including untracked files)
  // NOTE: gitignored files (node_modules, dist, *.db) are NOT included
  run("git", ["stash", "push", "--include-untracked", "-m", STASH_MSG], {
    label: "stash working tree",
    exitOnError: false, // ok if nothing to stash
  });

  // ── Step 4: Backup dist/ ─────────────────────────────────────────
  const timestamp = Date.now().toString(36);
  const tmpBackup = `/tmp/roulettelock-dist-backup-${timestamp}`;
  run("mkdir", ["-p", tmpBackup], { label: "create temp backup dir" });
  run("cp", ["-r", `${distDir}/.`, tmpBackup], { label: "backup dist/ to /tmp/" });

  // Track whether we changed anything, so cleanup always runs
  let didCommit = false;

  try {
    // ── Step 5: Checkout/update gh-pages ──────────────────────────
    const branchList = run("git", ["branch"], { label: "list branches" });
    const hasGhPages = branchList.stdout.includes("gh-pages");

    if (hasGhPages) {
      run("git", ["checkout", "gh-pages"], { label: "checkout gh-pages" });
    } else {
      run("git", ["checkout", "--orphan", "gh-pages"], { label: "create orphan gh-pages" });
    }

    // ── Step 6: Remove old tracked files ──────────────────────────
    run("git", ["rm", "-rf", "."], { exitOnError: false, label: "remove old tracked files" });

    // ── Step 7: Remove untracked artifacts that leaked from main ──
    // git rm only removes tracked files — src/, frontend/, node_modules/,
    // and bun.lock persist across branch switches because they contain
    // or are gitignored content. None belong on gh-pages.
    const junkDirs = ["src", "frontend", "node_modules", "bun.lock"];
    for (const entry of junkDirs) {
      const entryPath = path.join(PROJECT_ROOT, entry);
      const exists = Bun.spawnSync(["test", "-e", entryPath]).exitCode === 0;
      if (exists) {
        run("rm", ["-rf", entryPath], { label: `remove ${entry} from gh-pages`, exitOnError: false });
      }
    }

    // ── Step 8: Copy dist/ contents back to working tree ──────────
    const backupFiles = [...Bun.spawnSync(["ls", tmpBackup]).stdout.toString().trim().split("\n").filter(Boolean)];
    console.log(`  ℹ️  Restoring from backup: ${backupFiles.join(", ")}`);
    const copyOk = run("cp", ["-r", `${tmpBackup}/.`, PROJECT_ROOT], {
      label: "copy dist contents",
      exitOnError: false,
    });
    if (!copyOk.success) {
      console.error("  ❌ Failed to restore dist from backup");
      console.error(copyOk.stderr);
      return; // will hit finally block for cleanup
    }

    // ── Step 9: Stage only the static site files ──────────────────
    const staticFiles = ["index.html", "assets", "data"];
    let stagedCount = 0;
    for (const entry of staticFiles) {
      const entryPath = path.join(PROJECT_ROOT, entry);
      const exists = Bun.spawnSync(["test", "-e", entryPath]).exitCode === 0;
      if (!exists) {
        console.log(`  ⚠️  Skipping ${entry} — not found in backup`);
        continue;
      }
      const addResult = run("git", ["add", entry], { label: `stage ${entry}`, exitOnError: false });
      if (addResult.success) {
        stagedCount++;
      } else {
        // git add might fail if the entry resolves to nothing
        console.log(`  ⚠️  git add ${entry} gave: ${(addResult.stderr || addResult.stdout).slice(0, 120)}`);
      }
    }

    // ── Step 10: Commit ──────────────────────────────────────────
    if (stagedCount === 0) {
      console.log("  ⚠️  Nothing to stage — skipping commit");
    } else {
      const commitResult = run("git", ["commit", "-m", "deploy: static site build"], {
        exitOnError: false,
        label: "commit gh-pages",
      });

      const both = commitResult.stdout + commitResult.stderr;
      const nothingChanged =
        both.includes("nothing to commit") ||
        both.includes("no changes added to commit");

      if (commitResult.success) {
        console.log(`  ✅ gh-pages updated:`);
        // Print first line of commit output (the commit hash + message)
        console.log(`     ${commitResult.stdout.split("\n")[0]}`);
        didCommit = true;
      } else if (nothingChanged) {
        console.log("  ⚠️  Nothing changed — gh-pages is up to date");
      } else {
        console.error(`  ❌ Commit failed:`);
        console.error(commitResult.stderr || commitResult.stdout);
      }
    }
  } finally {
    // ══════════════════════════════════════════════════════════════
    //  CLEANUP — always runs, even if an error occurred above
    // ══════════════════════════════════════════════════════════════

    // ── Step 11: Return to original branch ──────────────────────
    run("git", ["checkout", currentBranch], {
      label: `return to ${currentBranch}`,
      exitOnError: false,
    });

    // ── Step 12: Pop stash ─────────────────────────────────────
    const stashList = run("git", ["stash", "list"], { exitOnError: false });
    if (stashList.stdout.includes(STASH_MSG)) {
      run("git", ["stash", "pop"], { exitOnError: false, label: "pop stash" });
    }

    // ── Step 13: Clean up temp dir ─────────────────────────────
    run("rm", ["-rf", tmpBackup], { exitOnError: false });

    console.log(`  ✅ Returned to ${currentBranch}\n`);
  }

  // ── Summary ─────────────────────────────────────────────────────
  console.log("  ─── Done ───");
  console.log(`  📦 Data exported to frontend/public/data/`);
  console.log(`  🌐 Frontend built in frontend/dist/`);
  if (didCommit) console.log(`  🌿 gh-pages branch updated (static site only)`);
  console.log("");
  console.log("  Next steps:");
  console.log(`    git push origin ${currentBranch}`);
  console.log("    git push origin gh-pages");
  console.log("");
}

main().catch((err) => {
  console.error("  ❌ Deploy failed:", err);
  process.exit(1);
});

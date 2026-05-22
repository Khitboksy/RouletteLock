/**
 * RouletteLock — Full Test Suite
 *
 * Categories:
 *   A. Edge cases    — blanks, zeros, extremes, type errors
 *   B. Tier paths    — user tiers, blank tiers, over-sum tiers
 *   C. Active modes  — random, Only Actives, No Actives, explicit count
 *   D. Realistic     — combos a real user would actually enter
 *   E. Variance      — 2000-run convergence check
 *
 * Run: bun run full_suite.mjs
 */

import { randomize } from "./frontend/src/randomizer.ts";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const allItems = JSON.parse(readFileSync(join(__dirname, "frontend", "public", "data", "items.json"), "utf-8"));
const allHeroes = JSON.parse(readFileSync(join(__dirname, "frontend", "public", "data", "heroes.json"), "utf-8"));

const CATS = ["Gun", "Vitality", "Spirit"];
const TIERS = ["T1", "T2", "T3", "T4"];
const TV = { T1: 800, T2: 1600, T3: 3200, T4: 6400 };

// ─── App.tsx blank-fill replicate ────────────────────────────────────

function buildSplit(raw) {
  const split = {};
  let total = 0;
  const blanks = [];
  for (const c of CATS) {
    const v = raw[c];
    if (v === undefined || v === null || String(v).trim() === "") {
      blanks.push(c);
    } else {
      const n = Math.min(Math.max(parseInt(String(v), 10) || 0, 0), 12);
      split[c] = n;
      total += n;
    }
  }
  if (blanks.length > 0) {
    const rem = Math.max(0, 12 - total);
    for (const c of blanks) split[c] = 0;
    if (rem > 0) {
      const bt = 1 + Math.floor(Math.random() * rem);
      let r = bt;
      for (let i = 0; i < blanks.length; i++) {
        const n = i === blanks.length - 1 ? r : Math.floor(Math.random() * (r + 1));
        split[blanks[i]] = n;
        r -= n;
      }
    }
  }
  return split;
}

// ─── Per-runner ──────────────────────────────────────────────────────

function runCases(label, cases, runsPerCase = 200) {
  console.log(`\n╔══ ${label} ══╗`);
  let totalTests = 0, failures = 0;
  const details = [];

  for (const tc of cases) {
    totalTests++;
    let max = 0, min = Infinity;
    let over12 = 0, zeroOnNonZero = 0;
    let overActive = 0, overCategory = 0;
    const totals = [];
    const catCounts = { Gun: [], Vitality: [], Spirit: [] };
    const actives = [];
    const results = [];

    for (let i = 0; i < runsPerCase; i++) {
      const split = buildSplit(tc.input);
      const config = {
        heroCount: tc.heroCount ?? 3,
        items: {
          activeMode: tc.activeMode ?? "random",
          categorySplit: split,
          tierSplit: tc.tierSplit,
        },
      };
      const res = randomize(allItems, allHeroes, config);
      results.push(res);
      const n = res.items.length;
      totals.push(n);
      if (n > max) max = n;
      if (n < min) min = n;
      if (n > 12) over12++;
      if (tc.expectNonZero && n === 0) zeroOnNonZero++;

      let a = 0;
      for (const c of CATS) {
        const cnt = res.items.filter(x => x.category === c).length;
        catCounts[c].push(cnt);
        if (cnt > (split[c] || 0)) overCategory++;
        if (c === "Gun" || c === "Vitality" || c === "Spirit") {}
      }
      a = res.items.filter(x => x.active).length;
      actives.push(a);
      if (a > 4) overActive++;
    }

    // Stats
    const mean = totals.reduce((a, b) => a + b, 0) / runsPerCase;
    const variance = totals.reduce((a, b) => a + (b - mean) ** 2, 0) / runsPerCase;
    const stddev = Math.sqrt(variance);
    const modeMap = {};
    for (const t of totals) modeMap[t] = (modeMap[t] || 0) + 1;
    let mode = 0, modeC = 0;
    for (const [v, c] of Object.entries(modeMap)) {
      if (c > modeC) { mode = parseInt(v); modeC = c; }
    }

    // Category mean spread (lower = more 4:4:4-like)
    const cMeans = CATS.map(c => catCounts[c].reduce((a, b) => a + b, 0) / runsPerCase);
    const cAvg = cMeans.reduce((a, b) => a + b, 0) / 3;
    const cSD = Math.sqrt(cMeans.reduce((a, b) => a + (b - cAvg) ** 2, 0) / 3);

    // Histogram bars for reporting
    const valueCount = Object.keys(modeMap).length;

    const failed = over12 > 0 || zeroOnNonZero > 0 || overActive > 0;
    if (failed) failures++;
    const icon = failed ? "❌" : "✅";

    const name = tc.name.padEnd(40);
    const range = `${min}`.padStart(2) + `–${max}`.padEnd(4);
    const line = `${icon} ${name} range=${range}  avg=${mean.toFixed(1)}  σ=${stddev.toFixed(2)}  vals=${valueCount}  mode=${mode}(${(modeC/runsPerCase*100).toFixed(0)}%)  catSD=${cSD.toFixed(2)}  >12=${over12}  zero=${zeroOnNonZero}  >4act=${overActive}`;
    details.push(line);
  }

  for (const d of details) console.log(d);
  console.log(`  ${totalTests} tests, ${failures} failures`);
  return failures;
}

// ══════════════════════════════════════════════════════════════════════
//  A. EDGE CASES
// ══════════════════════════════════════════════════════════════════════

const edgeCases = [
  // Pure blanks
  { name: "ALL BLANK (no values)",          input: {},                          expectNonZero: true },
  { name: "ALL ZERO (explicit 0s)",         input: { Gun: "0", Vitality: "0", Spirit: "0" }, expectNonZero: false },
  // Original bug case
  { name: "BUG CASE: blank + 0 + blank",   input: { Vitality: "0" },           expectNonZero: true },
  // One explicit
  { name: "GUN=5, others blank",            input: { Gun: "5" },                expectNonZero: true },
  { name: "GUN=5, others 0",               input: { Gun: "5", Vitality: "0", Spirit: "0" }, expectNonZero: true },
  // Two explicit
  { name: "GUN=4, VIT=3, SPI=blank",       input: { Gun: "4", Vitality: "3" }, expectNonZero: true },
  { name: "GUN=4, VIT=0, SPI=blank",       input: { Gun: "4", Vitality: "0" }, expectNonZero: true },
  // Over cap
  { name: "OVER CAP: 10+10+10",            input: { Gun: "10", Vitality: "10", Spirit: "10" }, expectNonZero: true },
  // Extreme values
  { name: "8000+9999+blanks (absurd)",     input: { Gun: "8000", Vitality: "9999" }, expectNonZero: true },
  // Single items
  { name: "GUN=1, others 0",               input: { Gun: "1", Vitality: "0", Spirit: "0" }, expectNonZero: true },
  { name: "GUN=1, others blank",           input: { Gun: "1" },                expectNonZero: true },
  // Zeros and blanks mixed
  { name: "GUN=0, VIT=blank, SPI=blank",   input: { Gun: "0" },               expectNonZero: true },
  { name: "GUN=0, VIT=0, SPI=blank",       input: { Gun: "0", Vitality: "0" }, expectNonZero: true },
  // Max single category
  { name: "GUN=12, others 0",              input: { Gun: "12", Vitality: "0", Spirit: "0" }, expectNonZero: true },
  // Negative-like (empty string variant)
  { name: "Empty strings (equiv blank)",   input: { Gun: "", Vitality: "", Spirit: "" }, expectNonZero: true },
];

// ══════════════════════════════════════════════════════════════════════
//  B. TIER PATHS
// ══════════════════════════════════════════════════════════════════════

const tierCases = [
  // Explicit tiers matching count
  { name: "GUN=4, tiers 1+1+1+1 (exact)",  input: { Gun: "4" }, tierSplit: { Gun: { T1: 1, T2: 1, T3: 1, T4: 1 } }, expectNonZero: true },
  // Tiers over-sum (should scale down)
  { name: "GUN=3, tiers 2+2 (>sum)",       input: { Gun: "3" }, tierSplit: { Gun: { T1: 2, T2: 2 } }, expectNonZero: true },
  { name: "GUN=2, tiers all 2 (way over)", input: { Gun: "2" }, tierSplit: { Gun: { T1: 2, T2: 2, T3: 2, T4: 2 } }, expectNonZero: true },
  // Tiers under-sum (should fill random)
  { name: "GUN=6, tiers 2+1 (under-sum)",  input: { Gun: "6" }, tierSplit: { Gun: { T1: 2, T2: 1 } }, expectNonZero: true },
  // Tiers with some zeroed out
  { name: "GUN=4, tiers 2+0+1+0",          input: { Gun: "4" }, tierSplit: { Gun: { T1: 2, T2: 0, T3: 1, T4: 0 } }, expectNonZero: true },
  // Multi-category tiers
  { name: "ALL=4, each has tiers",          input: { Gun: "4", Vitality: "4", Spirit: "4" }, tierSplit: { Gun: { T1: 1, T2: 1, T3: 1, T4: 1 }, Vitality: { T1: 2, T3: 2 }, Spirit: { T1: 4 } }, expectNonZero: true },
  // Blank + explicit tiers (blank auto-generate)
  { name: "GUN=5, tiers blank (auto)",      input: { Gun: "5" }, tierSplit: {}, expectNonZero: true },
  // All blanks + partial tiers on one cat
  { name: "ALL blank, Gun tiers 2+2",       input: {}, tierSplit: { Gun: { T1: 2, T2: 2 } }, expectNonZero: true },
  // Absurd over-sum on all cats
  { name: "OVER CAP + all tiers 10",        input: { Gun: "10", Vitality: "10", Spirit: "10" }, tierSplit: { Gun: { T1: 10, T2: 10, T3: 10, T4: 10 }, Vitality: { T1: 10, T2: 10, T3: 10, T4: 10 }, Spirit: { T1: 10, T2: 10, T3: 10, T4: 10 } }, expectNonZero: true },
];

// ══════════════════════════════════════════════════════════════════════
//  C. ACTIVE MODES
// ══════════════════════════════════════════════════════════════════════

const activeCases = [
  // Only Actives — various inputs
  { name: "ONLY ACTIVES, all blank",       input: {},                          activeMode: "Only Actives", expectNonZero: true },
  { name: "ONLY ACTIVES, GUN=5",           input: { Gun: "5" },                activeMode: "Only Actives", expectNonZero: true },
  { name: "ONLY ACTIVES, all zeros",       input: { Gun: "0", Vitality: "0", Spirit: "0" }, activeMode: "Only Actives", expectNonZero: false },
  { name: "ONLY ACTIVES, 4+3+2",           input: { Gun: "4", Vitality: "3", Spirit: "2" }, activeMode: "Only Actives", expectNonZero: true },
  { name: "ONLY ACTIVES, over cap",        input: { Gun: "10", Vitality: "10", Spirit: "10" }, activeMode: "Only Actives", expectNonZero: true },
  // No Actives
  { name: "NO ACTIVES, all blank",         input: {},                          activeMode: "No Actives", expectNonZero: true },
  { name: "NO ACTIVES, GUN=5",             input: { Gun: "5" },                activeMode: "No Actives", expectNonZero: true },
  { name: "NO ACTIVES, 4+3+2",             input: { Gun: "4", Vitality: "3", Spirit: "2" }, activeMode: "No Actives", expectNonZero: true },
  // Explicit active counts
  { name: "ACTIVES=0, all blank",          input: {},                          activeMode: 0, expectNonZero: true },
  { name: "ACTIVES=4, all blank",          input: {},                          activeMode: 4, expectNonZero: true },
  { name: "ACTIVES=2, GUN=4+3+blank",      input: { Gun: "4", Vitality: "3" }, activeMode: 2, expectNonZero: true },
];

// ══════════════════════════════════════════════════════════════════════
//  D. REALISTIC USER INPUTS
// ══════════════════════════════════════════════════════════════════════

const realCases = [
  // "I want a few gun items, random everything else"
  { name: "USER: few gun, random else",     input: { Gun: "3" },                expectNonZero: true },
  // "No vitality, split between gun and spirit"
  { name: "USER: no vit, rest random",     input: { Vitality: "0" },           expectNonZero: true },
  // "Exactly 2 of each"
  { name: "USER: 2 of each",               input: { Gun: "2", Vitality: "2", Spirit: "2" }, expectNonZero: true },
  // "Mostly vitality, few spirit"
  { name: "USER: vit=6, spi=2",            input: { Vitality: "6", Spirit: "2" }, expectNonZero: true },
  // "Gun heavy, with tiers T3 and T4 only"
  { name: "USER: gun=6, tiers T3+T4 only", input: { Gun: "6" }, tierSplit: { Gun: { T3: 3, T4: 3 } }, expectNonZero: true },
  // "Mix of everything"
  { name: "USER: 3+3+3, all tiers",        input: { Gun: "3", Vitality: "3", Spirit: "3" }, tierSplit: { Gun: { T1: 1, T2: 1, T3: 1 }, Vitality: { T1: 1, T2: 1, T3: 1 }, Spirit: { T1: 1, T2: 1, T3: 1 } }, expectNonZero: true },
  // "Only actives, only gun"
  { name: "USER: only actives, gun=4",     input: { Gun: "4", Vitality: "0", Spirit: "0" }, activeMode: "Only Actives", expectNonZero: true },
  // "No actives, vit heavy"
  { name: "USER: no actives, vit=8",       input: { Vitality: "8" },            activeMode: "No Actives", expectNonZero: true },
  // "I always want exactly 12 items"
  { name: "USER: 12 mixed",                input: { Gun: "4", Vitality: "4", Spirit: "4" }, expectNonZero: true },
  // "I want all T1 (cheap items)"
  { name: "USER: gun=4, all T1",           input: { Gun: "4" }, tierSplit: { Gun: { T1: 4 } }, expectNonZero: true },
];

// ══════════════════════════════════════════════════════════════════════
//  E. VARIANCE / CONVERGENCE (2000 runs each)
// ══════════════════════════════════════════════════════════════════════

function varianceCheck(label, cases) {
  console.log(`\n╔══ ${label} ══╗`);
  const RUNS = 2000;
  let allPass = true;

  for (const tc of cases) {
    const totals = [];
    const catCounts = { Gun: [], Vitality: [], Spirit: [] };

    for (let i = 0; i < RUNS; i++) {
      const split = buildSplit(tc.input);
      const config = {
        heroCount: 3,
        items: {
          activeMode: tc.activeMode ?? "random",
          categorySplit: split,
          tierSplit: tc.tierSplit,
        },
      };
      const res = randomize(allItems, allHeroes, config);
      totals.push(res.items.length);
      for (const c of CATS) catCounts[c].push(res.items.filter(x => x.category === c).length);
    }

    // Stats
    const mean = totals.reduce((a, b) => a + b, 0) / RUNS;
    const variance = totals.reduce((a, b) => a + (b - mean) ** 2, 0) / RUNS;
    const stddev = Math.sqrt(variance);
    const min = Math.min(...totals);
    const max = Math.max(...totals);
    const range = max - min + 1;
    const valsSeen = new Set(totals).size;

    // Mode
    const modeMap = {};
    for (const t of totals) modeMap[t] = (modeMap[t] || 0) + 1;
    let mode = 0, modeC = 0;
    for (const [v, c] of Object.entries(modeMap)) {
      if (c > modeC) { mode = parseInt(v); modeC = c; }
    }
    const modePct = (modeC / RUNS * 100).toFixed(1);

    // Chi-squared (uniformity across range)
    let chiSq = 0;
    if (range > 1) {
      const expected = RUNS / range;
      for (let v = min; v <= max; v++) {
        const observed = modeMap[v] || 0;
        chiSq += (observed - expected) ** 2 / expected;
      }
    }

    // Category mean spread
    const cMeans = CATS.map(c => catCounts[c].reduce((a, b) => a + b, 0) / RUNS);
    const cAvg = cMeans.reduce((a, b) => a + b, 0) / 3;
    const cSD = Math.sqrt(cMeans.reduce((a, b) => a + (b - cAvg) ** 2, 0) / 3);

    // Convergence flags
    const flags = [];
    if (range <= 2 && tc.name.includes("BLANK")) flags.push("range-too-narrow");
    if (modePct > 25 && valsSeen > 1) flags.push("mode-dominant");
    if (cSD < 0.3 && tc.name.includes("BLANK")) flags.push("converging-444");
    if (range > 1 && chiSq / Math.max(1, range - 1) > 5) flags.push("chi-sq-high");
    const pass = flags.length === 0;
    if (!pass) allPass = false;

    const icon = pass ? "✅" : "⚠️";
    console.log(`${icon} ${tc.name.padEnd(40)} range=${min}–${max}  avg=${mean.toFixed(1)}  σ=${stddev.toFixed(2)}  vals=${valsSeen}  mode=${mode}(${modePct}%)  catSD=${cSD.toFixed(2)}  chi2=${chiSq.toFixed(1)}  ${flags.join(" ")}`);
  }
  console.log(`  ${allPass ? "✅ All passed" : "⚠️ Some checks flagged"}`);
  return allPass;
}

// ══════════════════════════════════════════════════════════════════════
//  RUN ALL
// ══════════════════════════════════════════════════════════════════════

console.log(`╔═══════════════════════════════════════════════════════════════╗`);
console.log(`║  RouletteLock Full Test Suite                                ║`);
console.log(`╚═══════════════════════════════════════════════════════════════╝`);
console.log(`Items: ${allItems.length}  Heroes: ${allHeroes.length}`);

let totalFailures = 0;

totalFailures += runCases("A. EDGE CASES", edgeCases, 200);
totalFailures += runCases("B. TIER PATHS", tierCases, 200);
totalFailures += runCases("C. ACTIVE MODES", activeCases, 200);
totalFailures += runCases("D. REALISTIC USER INPUTS", realCases, 200);

// Variance checks
const varBlank = [
  { name: "ALL BLANK (pure random)",       input: {} },
  { name: "BUG CASE: blank + 0 + blank",   input: { Vitality: "0" } },
  { name: "GUN=5, VIT=blank, SPI=blank",   input: { Gun: "5" } },
  { name: "GUN=0, VIT=blank, SPI=3",       input: { Gun: "0", Spirit: "3" } },
  { name: "GUN=4, VIT=3, SPI=blank",       input: { Gun: "4", Vitality: "3" } },
  { name: "GUN=blank, VIT=0, SPI=0",       input: { Gun: "0" } },
];

const varActive = [
  { name: "ONLY ACTIVES, all blank",       input: {}, activeMode: "Only Actives" },
  { name: "NO ACTIVES, all blank",         input: {}, activeMode: "No Actives" },
  { name: "ONLY ACTIVES, GUN=5",           input: { Gun: "5" }, activeMode: "Only Actives" },
];

const varTiers = [
  { name: "VARIANCE: all blank, tiers auto", input: {} },
  { name: "VARIANCE: gun=4 tiers 2+1",      input: { Gun: "4" }, tierSplit: { Gun: { T1: 2, T2: 1 } } },
  { name: "VARIANCE: over cap + all tiers",  input: { Gun: "10", Vitality: "10", Spirit: "10" }, tierSplit: { Gun: { T1: 5, T2: 5, T3: 5, T4: 5 }, Vitality: { T1: 5, T2: 5, T3: 5, T4: 5 }, Spirit: { T1: 5, T2: 5, T3: 5, T4: 5 } } },
];

varianceCheck("E1. VARIANCE — Blank/Category", varBlank);
varianceCheck("E2. VARIANCE — Active Modes", varActive);
varianceCheck("E3. VARIANCE — Tier Paths", varTiers);

// ══════════════════════════════════════════════════════════════════════
//  SUMMARY
// ══════════════════════════════════════════════════════════════════════

const vCases = [...varBlank, ...varActive, ...varTiers];
const totalEdge = edgeCases.length + tierCases.length + activeCases.length + realCases.length;

console.log(`\n╔═══════════════════════════════════════════════════════════════╗`);
console.log(`║  SUMMARY                                                     ║`);
console.log(`╚═══════════════════════════════════════════════════════════════╝`);
console.log(`  Edge/input tests:     ${totalEdge} × 200 runs = ${totalEdge * 200}`);
console.log(`  Variance tests:       ${vCases.length} × 2000 runs = ${vCases.length * 2000}`);
console.log(`  Total runs:           ${totalEdge * 200 + vCases.length * 2000}`);
console.log(`  Failures:             ${totalFailures}`);
console.log(totalFailures === 0 ? `  ✅ ALL TESTS PASSED` : `  ❌ ${totalFailures} TEST(S) FAILED`);

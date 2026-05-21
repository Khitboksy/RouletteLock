/**
 * RouletteLock Logic — Thin DB-backed wrapper
 *
 * Loads data from SQLite via the adapter, then delegates to the
 * pure randomizer-core for the actual algorithm.
 *
 * The CLI (`main.ts`) and server (`server.ts`) use this module.
 * The React frontend uses a browser-port of the core directly.
 */

import { getAllHeroes, getAllItems } from "./db/adapter";
import { randomize as coreRandomize } from "./randomizer-core";
import type { RandomizerConfig, Item, Hero, ActiveMode, CategoryTierSplit, TierSplit } from "./types";

// ─── Server-side data (loaded once from DB) ─────────────────────────

const heroes = getAllHeroes();
const items = getAllItems();

// ─── Re-export for backward compat ──────────────────────────────────

export { getRandomItems, getTierFromValue, isNumber } from "./randomizer-core";
export type { RandomizerConfig, Item, Hero, ActiveMode, CategoryTierSplit, TierSplit };

/**
 * Randomize using DB-backed data.
 * Delegates to the pure core with server-side data.
 */
export function randomize(config: RandomizerConfig): {
  heroes: Hero[];
  items: Item[];
} {
  return coreRandomize(items, heroes, config);
}

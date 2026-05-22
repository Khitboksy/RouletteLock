/**
 * RouletteLock API Client — Local-First, Static Site
 *
 * No backend server needed. This loads items/heroes from static JSON
 * files that are part of the built site, then caches them in localStorage.
 *
 * Data flow:
 *   1. First visit → fetch /data/items.json + /data/heroes.json → cache in localStorage
 *   2. Subsequent visits → read from localStorage (instant, no network)
 *   3. New deploy → files change → cache expires → re-fetch
 *   4. Dead link → stale cache still works offline
 *
 * The randomizer runs ENTIRELY CLIENT-SIDE.
 * No API server, no database connection, no backend at all.
 */

import {
  randomize as clientRandomize,
  type Item,
  type Hero,
  type RandomizerConfig,
  type RandomizerResult,
} from "./randomizer";

// ─── Cache Keys ────────────────────────────────────────────────────

const CACHE_KEY_ITEMS = "rl_items";
const CACHE_KEY_HEROES = "rl_heroes";
const CACHE_KEY_ITEMS_TS = "rl_items_timestamp";
const CACHE_KEY_HEROES_TS = "rl_heroes_timestamp";

// ─── Cache TTL (24 hours — mostly so new deploys get picked up) ─────

const CACHE_TTL_MS = 1000 * 60 * 60 * 24;

// ─── Cache Helpers ──────────────────────────────────────────────────

function getCache<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function setCache<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    /* localStorage may be full */
  }
}

function isCacheExpired(timestampKey: string): boolean {
  try {
    const ts = localStorage.getItem(timestampKey);
    if (!ts) return true;
    return Date.now() - parseInt(ts, 10) > CACHE_TTL_MS;
  } catch {
    return true;
  }
}

function markCached(timestampKey: string): void {
  try {
    localStorage.setItem(timestampKey, String(Date.now()));
  } catch {}
}

// ─── Static JSON Data Loading ──────────────────────────────────────

/**
 * Fetch items from the static JSON file bundled with the site.
 * Falls back to localStorage cache if the network is unavailable.
 */
export async function getItems(): Promise<Item[]> {
  // Try cache first (instant, works offline)
  const cached = getCache<Item[]>(CACHE_KEY_ITEMS);
  if (cached && !isCacheExpired(CACHE_KEY_ITEMS_TS)) {
    return cached;
  }

  // Fetch from static JSON file
  try {
    const res = await fetch("data/items.json");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const items = (await res.json()) as Item[];
    setCache(CACHE_KEY_ITEMS, items);
    markCached(CACHE_KEY_ITEMS_TS);
    return items;
  } catch (err) {
    // Network unavailable — use stale cache if available
    if (cached) {
      console.warn("Could not fetch items.json, using cached data (stale).");
      return cached;
    }
    throw err;
  }
}

/**
 * Fetch heroes from the static JSON file bundled with the site.
 */
export async function getHeroes(): Promise<Hero[]> {
  const cached = getCache<Hero[]>(CACHE_KEY_HEROES);
  if (cached && !isCacheExpired(CACHE_KEY_HEROES_TS)) {
    return cached;
  }

  try {
    const res = await fetch("data/heroes.json");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const heroes = (await res.json()) as Hero[];
    setCache(CACHE_KEY_HEROES, heroes);
    markCached(CACHE_KEY_HEROES_TS);
    return heroes;
  } catch (err) {
    if (cached) {
      console.warn("Could not fetch heroes.json, using cached data (stale).");
      return cached;
    }
    throw err;
  }
}

// ─── Client-Side Randomizer ────────────────────────────────────────

/**
 * Run the randomizer ENTIRELY ON THE CLIENT using cached data.
 * No network call needed ever. Works offline.
 */
export async function randomizeLocally(config: RandomizerConfig): Promise<RandomizerResult> {
  const allItems = getCache<Item[]>(CACHE_KEY_ITEMS);
  const allHeroes = getCache<Hero[]>(CACHE_KEY_HEROES);

  if (!allItems || !allHeroes) {
    // Cache miss — fetch from static JSON
    const [items, heroes] = await Promise.all([getItems(), getHeroes()]);
    return clientRandomize(items, heroes, config);
  }

  // Zero network calls — pure client-side
  return clientRandomize(allItems, allHeroes, config);
}

/**
 * Force a re-fetch from the static JSON files (e.g. after a new deploy).
 */
export async function refreshCache(): Promise<void> {
  // Bust the cache by removing timestamps
  localStorage.removeItem(CACHE_KEY_ITEMS_TS);
  localStorage.removeItem(CACHE_KEY_HEROES_TS);
  await getItems();
  await getHeroes();
}

/** Check if we have cached data (for instant/no-network start). */
export function hasCachedData(): boolean {
  return getCache(CACHE_KEY_ITEMS) !== null && getCache(CACHE_KEY_HEROES) !== null;
}

// ─── Admin API (local server only) ──────────────────────────────────

/**
 * Check if the local admin server is running.
 * The admin panel uses this to decide whether to show edit/git UI.
 */
export async function isServerAvailable(): Promise<boolean> {
  try {
    const res = await fetch("/api/admin/status", { signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch {
    return false;
  }
}

/** Get git status from the running server. */
export async function getGitStatus(): Promise<{ branch: string; status: string[]; hasChanges: boolean } | null> {
  try {
    const res = await fetch("/api/admin/git-status");
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

/** Commit changes via the local server (exports data → git add → git commit, NO push). */
export async function commitChanges(message: string): Promise<{ message: string; committed: boolean }> {
  const res = await fetch("/api/admin/commit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });
  return res.json();
}

/** Update an item via the local server. */
export async function updateItemApi(originalName: string, updates: Partial<Item>): Promise<Item> {
  const res = await fetch("/api/admin/items", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ originalName, updates }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).error || `HTTP ${res.status}`);
  }
  return res.json();
}

/** Create a new item via the local server. */
export async function createItemApi(item: { name: string; category: string; value: number; active?: boolean; type?: readonly string[] }): Promise<Item> {
  const res = await fetch("/api/admin/items", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(item),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).error || `HTTP ${res.status}`);
  }
  return res.json();
}

/** Delete an item via the local server. */
export async function deleteItemApi(name: string): Promise<void> {
  const res = await fetch(`/api/admin/items/${encodeURIComponent(name)}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).error || `HTTP ${res.status}`);
  }
}

/** Batch update items via the local server. */
export async function batchUpdateItemsApi(names: string[], updates: Partial<Item>): Promise<{ updated: number }> {
  const res = await fetch("/api/admin/items/batch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ names, updates }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).error || `HTTP ${res.status}`);
  }
  return res.json();
}

// ─── Hero Admin API ──────────────────────────────────────────────────

/** Get all heroes (with roles). */
export async function getHeroesAdmin(): Promise<Hero[]> {
  const res = await fetch("/api/admin/heroes");
  return res.json();
}

/** Update a hero via the local server. */
export async function updateHeroApi(originalName: string, updates: Partial<{ name: string; roles: readonly string[] }>): Promise<Hero> {
  const res = await fetch("/api/admin/heroes", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ originalName, updates }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).error || `HTTP ${res.status}`);
  }
  return res.json();
}

/** Create a hero via the local server. */
export async function createHeroApi(name: string, roles?: readonly string[]): Promise<Hero> {
  const res = await fetch("/api/admin/heroes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, roles: roles || [] }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).error || `HTTP ${res.status}`);
  }
  return res.json();
}

/** Delete a hero via the local server. */
export async function deleteHeroApi(name: string): Promise<void> {
  const res = await fetch(`/api/admin/heroes/${encodeURIComponent(name)}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).error || `HTTP ${res.status}`);
  }
}

// ─── Upgrade Chain API ───────────────────────────────────────────────

/** Set upgrade chains for an item. */
export async function setUpgradesApi(itemName: string, upgradesTo?: readonly string[], upgradesFrom?: readonly string[]): Promise<Item> {
  const res = await fetch("/api/admin/upgrades", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ itemName, upgradesTo, upgradesFrom }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).error || `HTTP ${res.status}`);
  }
  return res.json();
}

/** Get all item names (for upgrade chain dropdowns). */
export async function getItemNamesApi(): Promise<string[]> {
  const res = await fetch("/api/admin/item-names");
  return res.json();
}

/**
 * RouletteLock Database Adapter
 *
 * Replaces `import { items } from "./data/items.js"` and
 * `import { heroes } from "./data/heroes.js"` with SQLite-backed queries.
 *
 * Returns data in the EXACT same shape as the hardcoded arrays
 * (same Item/Hero interfaces with name-based upgrade chains).
 */

import { Database } from "bun:sqlite";
import type { Item, Hero } from "../types";
import { CREATE_SCHEMA_SQL } from "./schema";
import { items as sourceItems } from "../data/items";
import { heroes as sourceHeroes } from "../data/heroes";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, "roulettelock.db");

let db: Database;

function getDb(): Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.run("PRAGMA foreign_keys = ON;");
    db.run("PRAGMA journal_mode = WAL;");
  }
  return db;
}

/**
 * Ensure the database exists, has tables, and is seeded.
 * Safe to call repeatedly — does nothing if already seeded.
 */
export function ensureDatabaseReady(): void {
  const d = getDb();

  // Create tables if they don't exist (IF NOT EXISTS is in the schema)
  d.run(CREATE_SCHEMA_SQL);

  // Check if already seeded
  try {
    const result = d.query("SELECT COUNT(*) as cnt FROM items").get() as { cnt: number };
    if (result.cnt > 0) return; // already has data
  } catch {
    // table doesn't exist yet — the schema creation above handles it
  }

  // Seed from source data
  console.log("  ℹ️  Database empty — seeding from source data...");

  // Insert heroes
  const insertHero = d.prepare(
    "INSERT OR IGNORE INTO heroes (name, roles) VALUES ($name, $roles)"
  );
  for (const hero of sourceHeroes) {
    insertHero.run({ $name: hero.name, $roles: JSON.stringify(hero.roles || []) });
  }

  // Insert items (first pass: build name→id map)
  const nameToId: Map<string, number> = new Map();
  const insertItem = d.prepare(`
    INSERT OR IGNORE INTO items (name, category, value, active)
    VALUES ($name, $category, $value, $active)
  `);
  for (const item of sourceItems) {
    const info = insertItem.run({
      $name: item.name,
      $category: item.category,
      $value: item.value,
      $active: item.active ? 1 : 0,
    });
    if (Number(info.lastInsertRowid) > 0) {
      nameToId.set(item.name, Number(info.lastInsertRowid));
    } else {
      // Item already existed — look up existing id
      const existing = d.query("SELECT id FROM items WHERE name = $name").get({ $name: item.name }) as { id: number } | undefined;
      if (existing) nameToId.set(item.name, existing.id);
    }
  }

  // Second pass: type tags and upgrade chains
  const insertType = d.prepare(
    "INSERT OR IGNORE INTO item_types (item_id, type) VALUES ($item_id, $type)"
  );
  const insertUpgrade = d.prepare(
    "INSERT OR IGNORE INTO item_upgrades (item_id, upgrades_to_item_id) VALUES ($item_id, $upgrades_to_item_id)"
  );

  for (const item of sourceItems) {
    const itemId = nameToId.get(item.name);
    if (!itemId) continue;

    // Type tags
    if (item.type && Array.isArray(item.type)) {
      for (const t of item.type) {
        insertType.run({ $item_id: itemId, $type: t });
      }
    }

    // upgradesTo
    if (item.upgradesTo && Array.isArray(item.upgradesTo)) {
      for (const targetName of item.upgradesTo) {
        const targetId = nameToId.get(targetName);
        if (targetId) {
          insertUpgrade.run({ $item_id: itemId, $upgrades_to_item_id: targetId });
        }
      }
    }

    // upgradesFrom
    if (item.upgradesFrom && Array.isArray(item.upgradesFrom)) {
      for (const sourceName of item.upgradesFrom) {
        const sourceId = nameToId.get(sourceName);
        if (sourceId) {
          insertUpgrade.run({ $item_id: sourceId, $upgrades_to_item_id: itemId });
        }
      }
    }
  }

  console.log("  ✅ Database seeded");
}

// ─── Row Types (from SQLite) ────────────────────────────────────────

interface ItemRow {
  id: number;
  name: string;
  category: string;
  value: number;
  active: number;
  image_url: string | null;
}

interface TypeRow {
  type: string;
}

interface UpgradeNameRow {
  name: string;
}

// ─── Item Reconstruction ────────────────────────────────────────────

/**
 * Reconstruct the name-based upgrade arrays for a single item by querying
 * the junction tables. This mirrors the hardcoded `upgradesTo` / `upgradesFrom`
 * arrays in data/items.ts.
 */
function getUpgradeNames(itemId: number): { upgradesTo: string[]; upgradesFrom: string[] } {
  const d = getDb();

  // Items that this item upgrades TO
  const toRows = d.query(`
    SELECT i.name FROM item_upgrades u
    JOIN items i ON i.id = u.upgrades_to_item_id
    WHERE u.item_id = $item_id
    ORDER BY i.name
  `).all({ $item_id: itemId }) as UpgradeNameRow[];

  // Items that upgrade TO this item (i.e. this item is the target)
  const fromRows = d.query(`
    SELECT i.name FROM item_upgrades u
    JOIN items i ON i.id = u.item_id
    WHERE u.upgrades_to_item_id = $item_id
    ORDER BY i.name
  `).all({ $item_id: itemId }) as UpgradeNameRow[];

  return {
    upgradesTo: toRows.map(r => r.name),
    upgradesFrom: fromRows.map(r => r.name),
  };
}

/**
 * Reconstruct the type tags array for an item.
 */
function getTypeTags(itemId: number): string[] {
  const d = getDb();
  const rows = d.query(`
    SELECT type FROM item_types
    WHERE item_id = $item_id
    ORDER BY type
  `).all({ $item_id: itemId }) as TypeRow[];
  return rows.map(r => r.type);
}

/**
 * Convert a raw DB row + junction lookups into an Item matching the
 * original hardcoded shape.
 */
function rowToItem(row: ItemRow): Item {
  const { upgradesTo, upgradesFrom } = getUpgradeNames(row.id);
  return {
    name: row.name,
    category: row.category,
    value: row.value,
    type: getTypeTags(row.id),
    active: row.active === 1,
    upgradesTo,
    upgradesFrom,
  };
}

// ─── Public Query API ───────────────────────────────────────────────

/** Get all items (full reconstruction with upgrade chains & type tags). */
export function getAllItems(): Item[] {
  const d = getDb();
  const rows = d.query("SELECT * FROM items ORDER BY id").all() as ItemRow[];
  return rows.map(rowToItem);
}

/** Get a single item by its database ID. */
export function getItemById(id: number): Item | undefined {
  const d = getDb();
  const row = d.query("SELECT * FROM items WHERE id = $id").get({ $id: id }) as ItemRow | undefined;
  if (!row) return undefined;
  return rowToItem(row);
}

/** Get a single item by its name. Returns undefined if not found. */
export function getItemByName(name: string): Item | undefined {
  const d = getDb();
  const row = d.query("SELECT * FROM items WHERE name = $name").get({ $name: name }) as ItemRow | undefined;
  if (!row) return undefined;
  return rowToItem(row);
}

/** Get all heroes (with roles). */
export function getAllHeroes(): Hero[] {
  const d = getDb();
  const rows = d.query("SELECT name, roles FROM heroes ORDER BY id").all() as { name: string; roles: string }[];
  return rows.map(r => ({ name: r.name, roles: JSON.parse(r.roles || "[]") as string[] }));
}

/** Get a hero by name. */
export function getHeroByName(name: string): Hero | undefined {
  const d = getDb();
  const row = d.query("SELECT name, roles FROM heroes WHERE name = $name").get({ $name: name }) as { name: string; roles: string } | undefined;
  if (!row) return undefined;
  return { name: row.name, roles: JSON.parse(row.roles || "[]") as string[] };
}

/** Get items filtered by category. */
export function getItemsByCategory(category: string): Item[] {
  const d = getDb();
  const rows = d.query("SELECT * FROM items WHERE category = $category ORDER BY id").all({ $category: category }) as ItemRow[];
  return rows.map(rowToItem);
}

/**
 * Get items whose type tags include at least one of the given types.
 * This mirrors the randomizer's `pool.filter(item => config.items.types.some(t => item.type.includes(t)))`.
 */
export function getItemsByTypes(types: string[]): Item[] {
  if (types.length === 0) return getAllItems();
  const d = getDb();

  // Build a parameterized query that finds items with ANY matching type tag
  const placeholders = types.map((_, i) => `$t${i}`).join(", ");
  const params: Record<string, string> = {};
  types.forEach((t, i) => { params[`$t${i}`] = t; });

  const rows = d.query(`
    SELECT DISTINCT i.* FROM items i
    JOIN item_types it ON it.item_id = i.id
    WHERE it.type IN (${placeholders})
    ORDER BY i.id
  `).all(params) as ItemRow[];

  return rows.map(rowToItem);
}

/** Get items filtered by value (tier). */
export function getItemsByValue(value: number): Item[] {
  const d = getDb();
  const rows = d.query("SELECT * FROM items WHERE value = $value ORDER BY id").all({ $value: value }) as ItemRow[];
  return rows.map(rowToItem);
}

/** Count items by category (useful for verification). */
export function getItemCounts(): Record<string, number> {
  const d = getDb();
  const rows = d.query("SELECT category, COUNT(*) as cnt FROM items GROUP BY category").all() as { category: string; cnt: number }[];
  const counts: Record<string, number> = {};
  for (const r of rows) {
    counts[r.category] = r.cnt;
  }
  return counts;
}

/** Check if the database has data. */
export function isSeeded(): boolean {
  try {
    const d = getDb();
    const result = d.query("SELECT COUNT(*) as cnt FROM items").get() as { cnt: number };
    return result.cnt > 0;
  } catch {
    return false;
  }
}

// ─── Write API ──────────────────────────────────────────────────────

/** Update an existing item's fields. Returns the updated item, or undefined if not found. */
export function updateItem(originalName: string, updates: Partial<Omit<Item, 'upgradesTo' | 'upgradesFrom'>> & { type?: readonly string[] }): Item | undefined {
  const d = getDb();

  // Find the item
  const row = d.query("SELECT id FROM items WHERE name = $name").get({ $name: originalName }) as { id: number } | undefined;
  if (!row) return undefined;

  // Build dynamic UPDATE
  const setClauses: string[] = [];
  const params: Record<string, any> = { $id: row.id };

  if (updates.name !== undefined) { setClauses.push("name = $name"); params.$name = updates.name; }
  if (updates.category !== undefined) { setClauses.push("category = $category"); params.$category = updates.category; }
  if (updates.value !== undefined) { setClauses.push("value = $value"); params.$value = updates.value; }
  if (updates.active !== undefined) { setClauses.push("active = $active"); params.$active = updates.active ? 1 : 0; }

  if (setClauses.length > 0) {
    setClauses.push("updated_at = datetime('now')");
    d.run(`UPDATE items SET ${setClauses.join(", ")} WHERE id = $id`, params);
  }

  // Update type tags if provided
  if (updates.type !== undefined) {
    d.run("DELETE FROM item_types WHERE item_id = $id", { $id: row.id });
    const insertType = d.prepare("INSERT OR IGNORE INTO item_types (item_id, type) VALUES ($item_id, $type)");
    for (const t of updates.type) {
      insertType.run({ $item_id: row.id, $type: t });
    }
  }

  return getItemByName(updates.name || originalName);
}

/** Create a new item. Fields: name, category, value, active, type. */
export function createItem(item: { name: string; category: string; value: number; active?: boolean; type?: readonly string[] }): Item {
  const d = getDb();

  const info = d.run(
    "INSERT INTO items (name, category, value, active) VALUES ($name, $category, $value, $active)",
    { $name: item.name, $category: item.category, $value: item.value, $active: item.active ? 1 : 0 }
  );
  const itemId = Number(info.lastInsertRowid);

  // Insert type tags
  if (item.type && item.type.length > 0) {
    const insertType = d.prepare("INSERT OR IGNORE INTO item_types (item_id, type) VALUES ($item_id, $type)");
    for (const t of item.type) {
      insertType.run({ $item_id: itemId, $type: t });
    }
  }

  return getItemByName(item.name)!;
}

/** Delete an item by name. Returns true if deleted, false if not found. */
export function deleteItem(name: string): boolean {
  const d = getDb();
  const result = d.run("DELETE FROM items WHERE name = $name", { $name: name });
  return result.changes > 0;
}

/** Create a hero with optional roles. */
export function createHero(name: string, roles?: readonly string[]): Hero {
  const d = getDb();
  d.run("INSERT INTO heroes (name, roles) VALUES ($name, $roles)", {
    $name: name,
    $roles: JSON.stringify(roles || []),
  });
  return { name, roles: [...(roles || [])] };
}

/** Update a hero's fields. */
export function updateHero(originalName: string, updates: Partial<{ name: string; roles: readonly string[] }>): Hero | undefined {
  const d = getDb();
  const row = d.query("SELECT id FROM heroes WHERE name = $name").get({ $name: originalName }) as { id: number } | undefined;
  if (!row) return undefined;

  const setClauses: string[] = [];
  const params: Record<string, any> = { $id: row.id };

  if (updates.name !== undefined) { setClauses.push("name = $name"); params.$name = updates.name; }
  if (updates.roles !== undefined) { setClauses.push("roles = $roles"); params.$roles = JSON.stringify(updates.roles); }
  setClauses.push("updated_at = datetime('now')");

  d.run(`UPDATE heroes SET ${setClauses.join(", ")} WHERE id = $id`, params);
  return getHeroByName(updates.name || originalName);
}

/** Delete a hero by name. Returns true if deleted. */
export function deleteHero(name: string): boolean {
  const d = getDb();
  const result = d.run("DELETE FROM heroes WHERE name = $name", { $name: name });
  return result.changes > 0;
}

// ─── Upgrade Chain Editing ──────────────────────────────────────────

/** Replace the upgrade chain FOR a given item (what it upgrades TO). */
export function setUpgradesTo(itemName: string, upgradesTo: readonly string[]): void {
  const d = getDb();
  const row = d.query("SELECT id FROM items WHERE name = $name").get({ $name: itemName }) as { id: number } | undefined;
  if (!row) return;

  // Remove old outgoing upgrades
  d.run("DELETE FROM item_upgrades WHERE item_id = $id", { $id: row.id });

  // Insert new ones
  if (upgradesTo.length > 0) {
    const insertUpgrade = d.prepare(
      "INSERT OR IGNORE INTO item_upgrades (item_id, upgrades_to_item_id) VALUES ($item_id, (SELECT id FROM items WHERE name = $target))"
    );
    for (const target of upgradesTo) {
      insertUpgrade.run({ $item_id: row.id, $target: target });
    }
  }
}

/** Replace the reverse upgrade chain (what upgrades FROM a given item TO it). */
export function setUpgradesFrom(itemName: string, upgradesFrom: readonly string[]): void {
  const d = getDb();
  const row = d.query("SELECT id FROM items WHERE name = $name").get({ $name: itemName }) as { id: number } | undefined;
  if (!row) return;

  // Remove old incoming upgrades
  d.run("DELETE FROM item_upgrades WHERE upgrades_to_item_id = $id", { $id: row.id });

  // Insert new ones
  if (upgradesFrom.length > 0) {
    const insertUpgrade = d.prepare(
      "INSERT OR IGNORE INTO item_upgrades (item_id, upgrades_to_item_id) VALUES ((SELECT id FROM items WHERE name = $source), $item_id)"
    );
    for (const source of upgradesFrom) {
      insertUpgrade.run({ $item_id: row.id, $source: source });
    }
  }
}

/** Get available item names for upgrade chain dropdowns. */
export function getAllItemNames(): string[] {
  const d = getDb();
  const rows = d.query("SELECT name FROM items ORDER BY name").all() as { name: string }[];
  return rows.map(r => r.name);
}

// ─── Batch Operations ────────────────────────────────────────────────

/** Update multiple items at once by setting common fields. */
export function batchUpdateItems(
  names: readonly string[],
  updates: Partial<{ category: string; value: number; active: boolean; type: readonly string[] }>
): number {
  let count = 0;
  for (const name of names) {
    const result = updateItem(name, updates);
    if (result) count++;
  }
  return count;
}

/** Export current DB data to the frontend JSON files. */
export function exportToJson(): void {
  const items = getAllItems();
  const heroes = getAllHeroes();
  const PROJECT_ROOT = path.resolve(__dirname, "..", "..");
  const DATA_DIR = path.join(PROJECT_ROOT, "frontend", "public", "data");
  Bun.spawnSync(["mkdir", "-p", DATA_DIR]);
  Bun.write(path.join(DATA_DIR, "items.json"), JSON.stringify(items));
  Bun.write(path.join(DATA_DIR, "heroes.json"), JSON.stringify(heroes));
}

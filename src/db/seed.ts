/**
 * RouletteLock Database Seed Script
 *
 * Creates the SQLite database and populates it from the TypeScript data files.
 * Run with: bun run src/db/seed.ts
 */

import { Database } from "bun:sqlite";
import { CREATE_SCHEMA_SQL } from "./schema";
import { items as sourceItems } from "../dataItems";
import { heroes as sourceHeroes } from "../dataHeroes";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, "roulettelock.db");

console.log(`[seed] Creating database at: ${DB_PATH}`);

// Remove existing DB so we start clean
try {
  Bun.spawnSync(["rm", "-f", DB_PATH]);
} catch {}

const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent access
db.run("PRAGMA journal_mode = WAL;");
db.run("PRAGMA foreign_keys = ON;");

// Create tables
console.log("[seed] Creating tables...");
db.run(CREATE_SCHEMA_SQL);

// --- Seed Heroes ---
console.log(`[seed] Seeding ${sourceHeroes.length} heroes...`);
const insertHero = db.prepare(
  "INSERT INTO heroes (name, roles) VALUES ($name, $roles)"
);

const insertHeroMany = db.transaction((heroes: readonly { name: string; roles?: readonly string[] }[]) => {
  for (const hero of heroes) {
    insertHero.run({ $name: hero.name, $roles: JSON.stringify(hero.roles || []) });
  }
});
insertHeroMany(sourceHeroes);

// --- Seed Items ---
console.log(`[seed] Seeding ${sourceItems.length} items...`);

// First pass: build a name→id lookup map so we can resolve FK references
const nameToId: Map<string, number> = new Map();

const insertItem = db.prepare(`
  INSERT INTO items (name, category, value, active)
  VALUES ($name, $category, $value, $active)
`);

const insertItemMany = db.transaction((items: readonly any[]) => {
  for (const item of items) {
    const info = insertItem.run({
      $name: item.name,
      $category: item.category,
      $value: item.value,
      $active: item.active ? 1 : 0,
    });
    nameToId.set(item.name, Number(info.lastInsertRowid));
  }
});
insertItemMany(sourceItems);

// Second pass: insert type tags and upgrade chains
console.log("[seed] Inserting type tags and upgrade chains...");

const insertType = db.prepare(
  "INSERT OR IGNORE INTO item_types (item_id, type) VALUES ($item_id, $type)"
);

const insertUpgrade = db.prepare(
  "INSERT OR IGNORE INTO item_upgrades (item_id, upgrades_to_item_id) VALUES ($item_id, $upgrades_to_item_id)"
);

const insertRelations = db.transaction((items: readonly any[]) => {
  for (const item of items) {
    const itemId = nameToId.get(item.name);
    if (!itemId) {
      console.warn(`[seed] Warning: Item "${item.name}" not found in name→id map`);
      continue;
    }

    // Insert type tags
    if (item.type && Array.isArray(item.type)) {
      for (const t of item.type) {
        insertType.run({ $item_id: itemId, $type: t });
      }
    }

    // Insert upgradesTo (this item → target item)
    if (item.upgradesTo && Array.isArray(item.upgradesTo)) {
      for (const targetName of item.upgradesTo) {
        const targetId = nameToId.get(targetName);
        if (targetId) {
          insertUpgrade.run({ $item_id: itemId, $upgrades_to_item_id: targetId });
        } else {
          console.warn(`[seed] Warning: upgradesTo target "${targetName}" not found (from "${item.name}")`);
        }
      }
    }

    // Insert upgradesFrom (source item → this item)
    if (item.upgradesFrom && Array.isArray(item.upgradesFrom)) {
      for (const sourceName of item.upgradesFrom) {
        const sourceId = nameToId.get(sourceName);
        if (sourceId) {
          insertUpgrade.run({ $item_id: sourceId, $upgrades_to_item_id: itemId });
        } else {
          console.warn(`[seed] Warning: upgradesFrom source "${sourceName}" not found (from "${item.name}")`);
        }
      }
    }
  }
});
insertRelations(sourceItems);

// Verify counts
const heroCount = db.query("SELECT COUNT(*) as cnt FROM heroes").get() as { cnt: number };
const itemCount = db.query("SELECT COUNT(*) as cnt FROM items").get() as { cnt: number };
const typeCount = db.query("SELECT COUNT(*) as cnt FROM item_types").get() as { cnt: number };
const upgradeCount = db.query("SELECT COUNT(*) as cnt FROM item_upgrades").get() as { cnt: number };

console.log("[seed] Done!");
console.log(`  Heroes:  ${heroCount.cnt}`);
console.log(`  Items:   ${itemCount.cnt}`);
console.log(`  Types:   ${typeCount.cnt} tag entries`);
console.log(`  Upgrades: ${upgradeCount.cnt} chain entries`);

db.close();

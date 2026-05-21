/**
 * RouletteLock — JSON Data Export Script
 *
 * Reads the SQLite database and writes items.json + heroes.json
 * to the frontend's public/data/ directory.
 *
 * These static JSON files replace the API server for the static site.
 * The React frontend loads them on first visit instead of calling /api/items.
 *
 * Run with: bun run src/db/export-json.ts
 */

import { getAllItems, getAllHeroes } from "./adapter";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..", "..");
const DATA_DIR = path.join(PROJECT_ROOT, "frontend", "public", "data");

// Ensure the data directory exists
Bun.spawnSync(["mkdir", "-p", DATA_DIR]);

const itemsPath = path.join(DATA_DIR, "items.json");
const heroesPath = path.join(DATA_DIR, "heroes.json");

console.log("[export] Reading data from SQLite...");
const items = getAllItems();
const heroes = getAllHeroes();

// Write items.json (minified to keep it small)
console.log(`[export] Writing ${items.length} items to ${itemsPath}`);
Bun.write(itemsPath, JSON.stringify(items));

// Write heroes.json (minified)
console.log(`[export] Writing ${heroes.length} heroes to ${heroesPath}`);
Bun.write(heroesPath, JSON.stringify(heroes));

// Calculate sizes
const itemsSize = Buffer.byteLength(JSON.stringify(items));
const heroesSize = Buffer.byteLength(JSON.stringify(heroes));
console.log(`[export] Done! Items: ${(itemsSize / 1024).toFixed(1)}KB, Heroes: ${(heroesSize / 1024).toFixed(1)}KB`);

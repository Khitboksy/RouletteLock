/**
 * RouletteLock SQLite Schema
 *
 * Replaces the hardcoded data/items.ts and data/heroes.ts with a queryable database.
 * Designed for forward-compatibility with React (integer PKs, timestamps, image URLs).
 * All types are JSON-serializable (no SQLite-specific types).
 */

export const CREATE_SCHEMA_SQL = `
-- Heroes table
CREATE TABLE IF NOT EXISTS heroes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  roles TEXT NOT NULL DEFAULT '[]',
  image_url TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Items table
CREATE TABLE IF NOT EXISTS items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL CHECK(category IN ('Gun', 'Vitality', 'Spirit')),
  value INTEGER NOT NULL CHECK(value IN (800, 1600, 3200, 6400)),
  active INTEGER NOT NULL DEFAULT 0,
  image_url TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Item types (junction table for type tags)
CREATE TABLE IF NOT EXISTS item_types (
  item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  PRIMARY KEY (item_id, type)
);

-- Item upgrade chains (junction table, FK references instead of name strings)
CREATE TABLE IF NOT EXISTS item_upgrades (
  item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  upgrades_to_item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  PRIMARY KEY (item_id, upgrades_to_item_id)
);

-- Indexes for query performance
CREATE INDEX IF NOT EXISTS idx_items_category ON items(category);
CREATE INDEX IF NOT EXISTS idx_items_value ON items(value);
CREATE INDEX IF NOT EXISTS idx_items_active ON items(active);
CREATE INDEX IF NOT EXISTS idx_item_types_type ON item_types(type);
CREATE INDEX IF NOT EXISTS idx_item_upgrades_item_id ON item_upgrades(item_id);
`;

/**
 * RouletteLock Web Server
 *
 * Thin backend server that:
 * 1. Serves the database via REST API
 * 2. Runs the randomizer engine
 * 3. Serves the React frontend (from frontend/dist/)
 * 4. Admin endpoints for git sync
 *
 * Run with: bun run src/server.ts
 */

import { randomize } from "../src/logic";
import {
  getAllItems,
  getAllHeroes,
  getItemById,
  getItemsByTypes,
  getItemByName,
  getHeroByName,
  updateItem,
  createItem,
  deleteItem,
  createHero,
  updateHero,
  deleteHero,
  setUpgradesTo,
  setUpgradesFrom,
  getAllItemNames,
  batchUpdateItems,
  exportToJson,
} from "../src/db/adapter";
import type { Item, RandomizerConfig } from "../src/types";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");
const FRONTEND_DIST = path.join(PROJECT_ROOT, "frontend", "dist");

const PORT = parseInt(process.env.PORT || "3000", 10);

// ─── MIME Types ─────────────────────────────────────────────────────

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".ts": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
  ".map": "application/json",
};

// ─── Helpers ────────────────────────────────────────────────────────

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
}

function errorResponse(message: string, status = 400): Response {
  return jsonResponse({ error: message }, status);
}

function parseBody(request: Request): Promise<unknown> {
  return request.json().catch(() => null);
}

// ─── API Router ─────────────────────────────────────────────────────

async function handleApi(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const method = request.method;
  const pathParts = url.pathname.split("/").filter(Boolean); // e.g. ["api", "items", "123"]

  // ── GET /api/items ──────────────────────────────────────────────
  if (method === "GET" && pathParts.length === 2 && pathParts[1] === "items") {
    const typesParam = url.searchParams.get("types");
    const categoryParam = url.searchParams.get("category");
    const valueParam = url.searchParams.get("value");

    let items = getAllItems();

    if (typesParam) {
      const types = typesParam.split(",").map(t => t.trim()).filter(Boolean);
      if (types.length > 0) {
        items = getItemsByTypes(types);
      }
    }

    if (categoryParam) {
      items = items.filter(i => i.category === categoryParam);
    }

    if (valueParam) {
      const val = parseInt(valueParam, 10);
      if (!isNaN(val)) {
        items = items.filter(i => i.value === val);
      }
    }

    return jsonResponse(items);
  }

  // ── GET /api/items/:id ──────────────────────────────────────────
  if (method === "GET" && pathParts.length === 3 && pathParts[1] === "items") {
    const itemId = parseInt(pathParts[2], 10);
    if (isNaN(itemId)) return errorResponse("Invalid item ID");

    const item = getItemById(itemId);
    if (!item) return errorResponse("Item not found", 404);
    return jsonResponse(item);
  }

  // ── GET /api/heroes ─────────────────────────────────────────────
  if (method === "GET" && pathParts.length === 2 && pathParts[1] === "heroes") {
    return jsonResponse(getAllHeroes());
  }

  // ── POST /api/randomize ─────────────────────────────────────────
  if (method === "POST" && pathParts.length === 2 && pathParts[1] === "randomize") {
    const body = await parseBody(request);
    if (!body) return errorResponse("Invalid JSON body");

    const config = body as RandomizerConfig;

    if (typeof config.heroCount !== "number" || config.heroCount < 1) {
      return errorResponse("heroCount must be a positive number");
    }
    if (!config.items || typeof config.items.activeMode !== "string") {
      return errorResponse("items.activeMode is required");
    }

    if (!config.items.totalItems) config.items.totalItems = 0;
    if (!config.items.categorySplit) config.items.categorySplit = {};
    if (!config.items.tierSplit) config.items.tierSplit = {};

    const result = randomize(config);
    return jsonResponse(result);
  }

  // ═════════════════════════════════════════════════════════════════
  //  ADMIN ENDPOINTS
  // ═════════════════════════════════════════════════════════════════

  const isAdmin = pathParts[1] === "admin";

  // ── Item CRUD ─────────────────────────────────────────────────────

  // PUT /api/admin/items — update single item
  if (method === "PUT" && isAdmin && pathParts[2] === "items" && pathParts.length === 3) {
    const body = await parseBody(request) as any;
    if (!body || !body.originalName) return errorResponse("originalName is required");
    const updated = updateItem(body.originalName, body.updates || {});
    if (!updated) return errorResponse("Item not found", 404);
    return jsonResponse(updated);
  }

  // POST /api/admin/items — create item
  if (method === "POST" && isAdmin && pathParts[2] === "items" && pathParts.length === 3) {
    const body = await parseBody(request) as any;
    if (!body || !body.name || !body.category || !body.value) {
      return errorResponse("name, category, and value are required");
    }
    const created = createItem({
      name: body.name,
      category: body.category,
      value: body.value,
      active: body.active ?? true,
      type: body.type || [],
    });
    return jsonResponse(created, 201);
  }

  // POST /api/admin/items/batch — batch update items
  if (method === "POST" && isAdmin && pathParts[2] === "items" && pathParts[3] === "batch" && pathParts.length === 4) {
    const body = await parseBody(request) as any;
    if (!body || !body.names || !Array.isArray(body.names) || body.names.length === 0) {
      return errorResponse("names array is required");
    }
    const count = batchUpdateItems(body.names, body.updates || {});
    return jsonResponse({ updated: count });
  }

  // DELETE /api/admin/items/:name — delete item
  if (method === "DELETE" && isAdmin && pathParts[2] === "items" && pathParts.length === 4) {
    const itemName = decodeURIComponent(pathParts[3]);
    const deleted = deleteItem(itemName);
    if (!deleted) return errorResponse("Item not found", 404);
    return jsonResponse({ deleted: true });
  }

  // ── Hero CRUD ─────────────────────────────────────────────────────

  // GET /api/admin/heroes — list heroes
  if (method === "GET" && isAdmin && pathParts[2] === "heroes" && pathParts.length === 3) {
    return jsonResponse(getAllHeroes());
  }

  // PUT /api/admin/heroes — update hero
  if (method === "PUT" && isAdmin && pathParts[2] === "heroes" && pathParts.length === 3) {
    const body = await parseBody(request) as any;
    if (!body || !body.originalName) return errorResponse("originalName is required");
    const updated = updateHero(body.originalName, body.updates || {});
    if (!updated) return errorResponse("Hero not found", 404);
    return jsonResponse(updated);
  }

  // POST /api/admin/heroes — create hero
  if (method === "POST" && isAdmin && pathParts[2] === "heroes" && pathParts.length === 3) {
    const body = await parseBody(request) as any;
    if (!body || !body.name) return errorResponse("name is required");
    const created = createHero(body.name, body.roles || []);
    return jsonResponse(created, 201);
  }

  // DELETE /api/admin/heroes/:name — delete hero
  if (method === "DELETE" && isAdmin && pathParts[2] === "heroes" && pathParts.length === 4) {
    const heroName = decodeURIComponent(pathParts[3]);
    const deleted = deleteHero(heroName);
    if (!deleted) return errorResponse("Hero not found", 404);
    return jsonResponse({ deleted: true });
  }

  // ── Upgrade Chain Editing ─────────────────────────────────────────

  // PUT /api/admin/upgrades — set upgradesTo and/or upgradesFrom for an item
  if (method === "PUT" && isAdmin && pathParts[2] === "upgrades" && pathParts.length === 3) {
    const body = await parseBody(request) as any;
    if (!body || !body.itemName) return errorResponse("itemName is required");

    if (body.upgradesTo !== undefined) {
      setUpgradesTo(body.itemName, body.upgradesTo);
    }
    if (body.upgradesFrom !== undefined) {
      setUpgradesFrom(body.itemName, body.upgradesFrom);
    }

    // Return the updated item with its chains
    const updated = getItemByName(body.itemName);
    if (!updated) return errorResponse("Item not found", 404);
    return jsonResponse(updated);
  }

  // GET /api/admin/item-names — all item names for upgrade dropdowns
  if (method === "GET" && isAdmin && pathParts[2] === "item-names" && pathParts.length === 3) {
    return jsonResponse(getAllItemNames());
  }

  // ── Git Operations ────────────────────────────────────────────────

  // GET /api/admin/git-status — show changed files
  if (method === "GET" && isAdmin && pathParts[2] === "git-status" && pathParts.length === 3) {
    const branchResult = Bun.spawnSync(["git", "branch", "--show-current"], { cwd: PROJECT_ROOT });
    const statusResult = Bun.spawnSync(["git", "status", "--porcelain"], { cwd: PROJECT_ROOT });
    const branch = branchResult.stdout.toString().trim();
    const status = statusResult.stdout.toString().trim();
    const hasChanges = status.length > 0;
    return jsonResponse({ branch, status: hasChanges ? status.split("\n") : [], hasChanges });
  }

  // POST /api/admin/commit — export data + git add + git commit (NO push)
  if (method === "POST" && isAdmin && pathParts[2] === "commit" && pathParts.length === 3) {
    const body = await parseBody(request) as any;
    if (!body || typeof body.message !== "string" || !body.message.trim()) {
      return errorResponse("Commit message is required");
    }
    const message = body.message.trim();

    try {
      exportToJson();
      const addResult = Bun.spawnSync(["git", "add", "-A"], { cwd: PROJECT_ROOT });
      if (!addResult.success) return errorResponse(`git add failed: ${addResult.stderr.toString()}`);

      const statusResult = Bun.spawnSync(["git", "status", "--porcelain"], { cwd: PROJECT_ROOT });
      const status = statusResult.stdout.toString().trim();
      if (!status) return jsonResponse({ message: "Nothing to commit — working tree clean." });

      const commitResult = Bun.spawnSync(["git", "commit", "-m", message], { cwd: PROJECT_ROOT });
      if (!commitResult.success) {
        return errorResponse(`git commit failed: ${commitResult.stderr.toString()}`);
      }

      return jsonResponse({ message: commitResult.stdout.toString().trim(), committed: true });
    } catch (err) {
      return errorResponse(`Git error: ${err}`);
    }
  }

  // ── Status / Health Check ─────────────────────────────────────────

  // GET /api/admin/status — server detection + summary
  if (method === "GET" && isAdmin && pathParts[2] === "status" && pathParts.length === 3) {
    const branchResult = Bun.spawnSync(["git", "branch", "--show-current"], { cwd: PROJECT_ROOT });
    const branch = branchResult.stdout.toString().trim();
    return jsonResponse({
      status: "ok",
      project: "RouletteLock",
      branch,
      items: getAllItems().length,
      heroes: getAllHeroes().length,
    });
  }

  // ── 404 for unknown API routes ──────────────────────────────────
  return errorResponse("Not found", 404);
}

// ─── Static File Server ─────────────────────────────────────────────

async function serveStatic(url: URL): Promise<Response | null> {
  let filePath = path.join(FRONTEND_DIST, url.pathname === "/" ? "index.html" : url.pathname);

  const file = Bun.file(filePath);
  const exists = await file.exists();

  if (exists) {
    const ext = path.extname(filePath).toLowerCase();
    const mimeType = MIME[ext] || "application/octet-stream";
    return new Response(file, {
      headers: { "Content-Type": mimeType },
    });
  }

  // SPA fallback: serve index.html for non-file routes
  const indexFile = Bun.file(path.join(FRONTEND_DIST, "index.html"));
  const indexExists = await indexFile.exists();
  if (indexExists) {
    return new Response(indexFile, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  return null;
}

// ─── Main Server ────────────────────────────────────────────────────

const server = Bun.serve({
  port: PORT,
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    // API routes
    if (url.pathname.startsWith("/api/")) {
      return handleApi(request);
    }

    // Static files (React frontend)
    const staticResponse = await serveStatic(url);
    if (staticResponse) return staticResponse;

    return new Response("Not found", { status: 404 });
  },
});

console.log(`\n  🎲 RouletteLock Server running at http://localhost:${PORT}`);
console.log(`  📡 API: http://localhost:${PORT}/api/items`);
console.log(`  🌐 Frontend: http://localhost:${PORT}/\n`);

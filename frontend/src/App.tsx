/**
 * RouletteLock React Frontend
 *
 * The main application component with:
 * - Randomizer form (mirroring CLI flow)
 * - Results display with Catppuccin Mocha colors
 * - Admin dashboard (CRUD + git integration)
 * - Local-first caching via the API client
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  getItems,
  getHeroes,
  randomizeLocally,
  refreshCache,
  isServerAvailable,
  getGitStatus,
  commitChanges,
  updateItemApi,
  createItemApi,
  deleteItemApi,
  batchUpdateItemsApi,
  getHeroesAdmin,
  updateHeroApi,
  createHeroApi,
  deleteHeroApi,
  setUpgradesApi,
  getItemNamesApi,
} from "./api";
import type {
  Item,
  Hero,
  ActiveMode,
  RandomizerConfig,
  RandomizerResult,
} from "./randomizer";

// ─── Constants ──────────────────────────────────────────────────────

const CATEGORIES = ["Gun", "Vitality", "Spirit"] as const;
type Category = (typeof CATEGORIES)[number];
type TierKey = "T1" | "T2" | "T3" | "T4";
const TIERS: TierKey[] = ["T1", "T2", "T3", "T4"];

const TIER_VALUES: Record<TierKey, number> = {
  T1: 800,
  T2: 1600,
  T3: 3200,
  T4: 6400,
};

const CATEGORY_COLORS: Record<string, string> = {
  Gun: "#fab387",
  Vitality: "#a6e3a1",
  Spirit: "#cba6f7",
};

const CATEGORY_BG: Record<string, string> = {
  Gun: "rgba(250, 179, 135, 0.1)",
  Vitality: "rgba(166, 227, 161, 0.1)",
  Spirit: "rgba(203, 166, 247, 0.1)",
};

const CATEGORY_BORDER: Record<string, string> = {
  Gun: "rgba(250, 179, 135, 0.3)",
  Vitality: "rgba(166, 227, 161, 0.3)",
  Spirit: "rgba(203, 166, 247, 0.3)",
};

// ─── Types ──────────────────────────────────────────────────────────

type ServerPage = "randomizer" | "admin";
type RandomizerTab = "custom" | "all_random";

type ActiveTab = "normal" | "no_actives" | "only_actives";
type ActiveCount = "random" | 1 | 2 | 3 | 4;

interface FormState {
  activeTab: ActiveTab;
  activeCount: ActiveCount;
  heroCount: number;
  categoryCounts: Record<Category, string>; // "" = random, "0"-"10" = explicit
  tierCounts: Record<Category, Record<TierKey, string>>;
}

// ─── Helper Functions ───────────────────────────────────────────────

function tierFromValue(value: number): TierKey {
  return TIERS.find((t) => TIER_VALUES[t] === value) || "T1";
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

// ─── Main App ───────────────────────────────────────────────────────

export default function App() {
  const [randomizerTab, setRandomizerTab] = useState<RandomizerTab>("custom");
  const [serverPage, setServerPage] = useState<ServerPage>("randomizer");
  const [items, setItems] = useState<Item[]>([]);
  const [heroes, setHeroes] = useState<Hero[]>([]);
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<RandomizerResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isServerMode, setIsServerMode] = useState(false);

  // Form state
  const [form, setForm] = useState<FormState>({
    activeTab: "normal",
    activeCount: "random",
    heroCount: 3,
    categoryCounts: { Gun: "", Vitality: "", Spirit: "" },
    tierCounts: {
      Gun: { T1: "", T2: "", T3: "", T4: "" },
      Vitality: { T1: "", T2: "", T3: "", T4: "" },
      Spirit: { T1: "", T2: "", T3: "", T4: "" },
    },
  });

  // Load data and detect server mode on mount
  useEffect(() => {
    async function load() {
      try {
        const [loadedItems, loadedHeroes, serverAvail] = await Promise.all([
          getItems(),
          getHeroes(),
          isServerAvailable(),
        ]);
        setItems(loadedItems);
        setHeroes(loadedHeroes);
        setIsServerMode(serverAvail);
      } catch (err) {
        setError(String(err));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // ── Form handlers ───────────────────────────────────────────────

  const setActiveTab = (tab: ActiveTab) =>
    setForm((f) => ({ ...f, activeTab: tab }));
  const setActiveCount = (count: ActiveCount) =>
    setForm((f) => ({ ...f, activeCount: count }));

  const setHeroCount = (n: number) =>
    setForm((f) => ({ ...f, heroCount: clamp(n, 3, 10) }));

  const setCategoryCount = (cat: Category, val: string) =>
    setForm((f) => ({
      ...f,
      categoryCounts: { ...f.categoryCounts, [cat]: val },
    }));

  const setTierCount = (cat: Category, tier: TierKey, val: string) =>
    setForm((f) => ({
      ...f,
      tierCounts: {
        ...f.tierCounts,
        [cat]: { ...f.tierCounts[cat], [tier]: val },
      },
    }));

  // ── Randomize ───────────────────────────────────────────────────

  const handleRandomize = useCallback(async () => {
    try {
      const totalItemCount = items.length;

      // Compute the active mode value for the randomizer
      const activeMode: string | number =
        form.activeTab === "no_actives"
          ? "No Actives"
          : form.activeTab === "only_actives"
            ? "Only Actives"
            : form.activeCount;

      // Build category split from form
      const catCounts = form.categoryCounts;
      const categorySplit: Record<string, number> = {};
      let totalItems = 0;

      for (const cat of CATEGORIES) {
        const val = catCounts[cat].trim();
        if (val !== "") {
          const n = clamp(parseInt(val, 10) || 0, 0, 12);
          categorySplit[cat] = n;
          totalItems += n;
        }
      }

      if (Object.keys(categorySplit).length === 0) {
        // Random split
        const rand = () => Math.floor(Math.random() * 4) + 3;
        const gun = catCounts.Gun ? parseInt(catCounts.Gun, 10) || rand() : rand();
        const vit = catCounts.Vitality ? parseInt(catCounts.Vitality, 10) || rand() : rand();
        const spi = catCounts.Spirit ? parseInt(catCounts.Spirit, 10) || rand() : rand();
        totalItems = gun + vit + spi;

        // Meet min actives
        const minItems =
          typeof activeMode === "number" ? activeMode : 4;
        if (activeMode !== "No Actives" && totalItems < minItems) {
          categorySplit.Gun = gun + Math.ceil((minItems - totalItems) / 2);
          categorySplit.Vitality =
            vit + Math.floor((minItems - totalItems) / 2);
          categorySplit.Spirit = spi + ((minItems - totalItems) % 2);
          totalItems = minItems;
        } else if (totalItems > 12) {
          // Cap proportionally
          const scale = 12 / totalItems;
          categorySplit.Gun = Math.round(gun * scale);
          categorySplit.Vitality = Math.round(vit * scale);
          categorySplit.Spirit =
            12 - categorySplit.Gun - categorySplit.Vitality;
          totalItems = 12;
        } else {
          categorySplit.Gun = gun;
          categorySplit.Vitality = vit;
          categorySplit.Spirit = spi;
        }
      }

      // Parse tier counts (build expected TierSplit structure)
      const tierSplit: Record<string, Record<string, number>> = {};
      for (const cat of CATEGORIES) {
        const catMax = categorySplit[cat];
        if (!catMax || catMax <= 0) continue;

        const tSplit: Record<string, number> = {};
        for (const tier of TIERS) {
          const val = form.tierCounts[cat][tier].trim();
          if (val !== "") {
            tSplit[tier] = clamp(parseInt(val, 10) || 0, 0, catMax);
          }
        }
        if (Object.keys(tSplit).length > 0) {
          tierSplit[cat] = tSplit;
        }
      }

      // Null out tierSplit if empty (so logic.ts handles it with random fill)
      const effectiveTierSplit =
        Object.keys(tierSplit).length > 0 ? tierSplit : undefined;

      const config: RandomizerConfig = {
        heroCount: form.heroCount,
        items: {
          categorySplit,
          tierSplit: effectiveTierSplit as any,
          activeMode: activeMode as ActiveMode,
        },
      };

      const res = await randomizeLocally(config);
      setResult(res);

      // Store result in URL hash for shareability
      const hashData = btoa(
        JSON.stringify({
          config,
          result: { heroes: res.heroes, items: res.items.map((i) => i.name) },
        }),
      );
      window.location.hash = `build/${hashData}`;
    } catch (err) {
      setError(String(err));
    }
  }, [form]);

  // ── All Random ─────────────────────────────────────────────────

  const handleAllRandomize = useCallback(async () => {
    try {
      const heroCount = clamp(
        3 + Math.floor(Math.random() * (heroes.length - 2)),
        3,
        heroes.length,
      );

      const config: RandomizerConfig = {
        heroCount,
        items: {
          activeMode: "random",
        },
      };

      const res = await randomizeLocally(config);
      setResult(res);

      const hashData = btoa(
        JSON.stringify({
          config,
          result: { heroes: res.heroes, items: res.items.map((i) => i.name) },
        }),
      );
      window.location.hash = `build/${hashData}`;
    } catch (err) {
      setError(String(err));
    }
  }, [heroes]);

  // ── Share URL ───────────────────────────────────────────────────

  const copyShareUrl = () => {
    navigator.clipboard.writeText(window.location.href).catch(() => {});
  };

  // ── Render ──────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="app">
        <div className="loading">
          <div className="loading-spinner" />
          <p>Loading RouletteLock...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="header">
        <h1 className="title">🎲 RouletteLock</h1>
        <p className="subtitle">Deadlock Item Randomizer</p>
        {isServerMode ? (
          <nav className="nav">
            <button
              className={`nav-btn ${serverPage === "randomizer" ? "active" : ""}`}
              onClick={() => setServerPage("randomizer")}
            >
              Randomizer
            </button>
            <button
              className={`nav-btn ${serverPage === "admin" ? "active" : ""}`}
              onClick={() => setServerPage("admin")}
            >
              Admin
            </button>
          </nav>
        ) : (
          <nav className="nav">
            <button
              className={`nav-btn ${randomizerTab === "custom" ? "active" : ""}`}
              onClick={() => setRandomizerTab("custom")}
            >
              Custom
            </button>
            <button
              className={`nav-btn ${randomizerTab === "all_random" ? "active" : ""}`}
              onClick={() => setRandomizerTab("all_random")}
            >
              All Random
            </button>
          </nav>
        )}
      </header>

      {/* Sub-nav: between header border and main content, transitions smoothly */}
      <Collapse show={isServerMode && serverPage === "randomizer"}>
        <div className="sub-nav">
          <button
            className={`btn-option${randomizerTab === "custom" ? " selected" : ""}`}
            onClick={() => setRandomizerTab("custom")}
          >
            Custom
          </button>
          <button
            className={`btn-option${randomizerTab === "all_random" ? " selected" : ""}`}
            onClick={() => setRandomizerTab("all_random")}
          >
            All Random
          </button>
        </div>
      </Collapse>

      <main className="main">
        {error && (
          <FadeIn>
            <div className="error-banner">
              <span>Error: {error}</span>
              <button onClick={() => setError(null)}>×</button>
            </div>
          </FadeIn>
        )}

        {/* Randomizer content: transitions smoothly via Collapse */}
        <Collapse show={!isServerMode || serverPage === "randomizer"}>
          <>
            {randomizerTab === "custom" && (
              <FadeIn>
                <RandomizerForm
                  form={form}
                  setActiveTab={setActiveTab}
                  setActiveCount={setActiveCount}
                  setHeroCount={setHeroCount}
                  setCategoryCount={setCategoryCount}
                  setTierCount={setTierCount}
                  onRandomize={handleRandomize}
                  itemsCount={items.length}
                  heroesCount={heroes.length}
                />

                <Collapse show={!!result}>
                  {result && (
                    <ResultsDisplay result={result} onCopyUrl={copyShareUrl} />
                  )}
                </Collapse>
              </FadeIn>
            )}

            {randomizerTab === "all_random" && (
              <FadeIn>
                <div className="card" style={{ textAlign: "center" }}>
                  <h2>All Random</h2>
                  <p className="hint">
                    One-click full random. Picks 3 to {heroes.length} heroes,
                    random active count, random items.
                  </p>
                  <button
                    className="btn-randomize"
                    onClick={handleAllRandomize}
                  >
                    🎲 Randomize!
                  </button>
                </div>

                <Collapse show={!!result}>
                  {result && (
                    <ResultsDisplay result={result} onCopyUrl={copyShareUrl} />
                  )}
                </Collapse>
              </FadeIn>
            )}
          </>
        </Collapse>

        {/* Admin content: server mode only, transitions smoothly via Collapse */}
        {isServerMode && (
          <Collapse show={serverPage === "admin"}>
            <AdminDashboard
            items={items}
            heroes={heroes}
            isServerMode={isServerMode}
            onRefresh={async () => {
              try {
                await refreshCache();
                const [freshItems, freshHeroes] = await Promise.all([
                  getItems(),
                  getHeroes(),
                ]);
                setItems(freshItems);
                setHeroes(freshHeroes);
              } catch (err) {
                setError(String(err));
              }
            }}
            onItemsChanged={async () => {
              // Re-fetch data after edit via server API
              const [freshItems, freshHeroes] = await Promise.all([
                getItems(),
                getHeroes(),
              ]);
              setItems(freshItems);
              setHeroes(freshHeroes);
            }}
          />
          </Collapse>
        )}
      </main>

      <footer className="footer">
        <span>
          Data: {items.length} items, {heroes.length} heroes
        </span>
        <span>·</span>
        <span>
          <a href="https://github.com/Khitboksy/RouletteLock">Github</a>
        </span>
        <span>·</span>
        <span>Powered by SQLite + React</span>
      </footer>
    </div>
  );
}

// ─── Collapse Component (grid-template-rows animation) ──────────────

/**
 * Collapses/expands children with a smooth height + opacity animation.
 * Uses CSS Grid's `grid-template-rows` transition so the browser
 * interpolates between the actual content height (1fr) and 0 (0fr)
 * — no arbitrary max-height or manual measurement needed.
 */
function Collapse({ show, children }: { show: boolean; children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateRows: show ? "1fr" : "0fr",
        opacity: show ? 1 : 0,
        transition:
          "grid-template-rows 0.35s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
      }}
    >
      <div style={{ overflow: "hidden", minHeight: 0 }}>{children}</div>
    </div>
  );
}

// ─── FadeIn Component (mount animation) ─────────────────────────────

/** Wraps children in a fade-in + translate-up animation on mount. */
function FadeIn({ children }: { children: React.ReactNode }) {
  return <div className="fade-in">{children}</div>;
}

// ─── Randomizer Form Component ──────────────────────────────────────

function RandomizerForm({
  form,
  setActiveTab,
  setActiveCount,
  setHeroCount,
  setCategoryCount,
  setTierCount,
  onRandomize,
  itemsCount,
  heroesCount,
}: {
  form: FormState;
  setActiveTab: (t: ActiveTab) => void;
  setActiveCount: (c: ActiveCount) => void;
  setHeroCount: (n: number) => void;
  setCategoryCount: (c: Category, v: string) => void;
  setTierCount: (c: Category, t: TierKey, v: string) => void;
  onRandomize: () => void;
  itemsCount: number;
  heroesCount: number;
}) {
  const tabs: { label: string; value: ActiveTab }[] = [
    { label: "Normal", value: "normal" },
    { label: "No Actives", value: "no_actives" },
    { label: "Only Actives", value: "only_actives" },
  ];

  const subOptions: { label: string; value: ActiveCount }[] = [
    { label: "Random", value: "random" },
    { label: "1", value: 1 },
    { label: "2", value: 2 },
    { label: "3", value: 3 },
    { label: "4", value: 4 },
  ];

  return (
    <section className="randomizer-form">
      <div className="card">
        <h2>Active Items Mode</h2>
        <div className="button-group">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              className={`btn-option ${form.activeTab === tab.value ? "selected" : ""}`}
              onClick={() => setActiveTab(tab.value)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <Collapse show={form.activeTab === "normal"}>
          <div className="button-group sub-group">
            {subOptions.map((opt) => (
              <button
                key={String(opt.value)}
                className={`btn-option btn-small-option ${form.activeCount === opt.value ? "selected" : ""}`}
                onClick={() => setActiveCount(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </Collapse>
      </div>

      <div className="card">
        <h2>Heroes</h2>
        <div className="hero-input">
          <button
            className="btn-small"
            onClick={() => setHeroCount(form.heroCount - 1)}
            disabled={form.heroCount <= 3}
          >
            −
          </button>
          <span className="hero-count">{form.heroCount}</span>
          <button
            className="btn-small"
            onClick={() => setHeroCount(form.heroCount + 1)}
            disabled={form.heroCount >= 10}
          >
            +
          </button>
          <span className="hero-label">heroes (3–10)</span>
        </div>
      </div>

      <Collapse show={form.activeTab !== "only_actives"}>
        <div className="card">
          <h2>Category Distribution</h2>
          <p className="hint">
            Leave blank for random, enter 0–10 for specific count
          </p>
          <div className="category-grid">
            {CATEGORIES.map((cat) => (
              <div
                key={cat}
                className="category-input"
                style={{ borderColor: CATEGORY_BORDER[cat] }}
              >
                <label style={{ color: CATEGORY_COLORS[cat] }}>{cat}</label>
                <input
                  type="number"
                  min={0}
                  max={12}
                  placeholder="4"
                  value={form.categoryCounts[cat]}
                  onChange={(e) => setCategoryCount(cat, e.target.value)}
                  className="num-input"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h2>Tier Distribution</h2>
          <p className="hint">
            Per category, per tier. Leave blank for random, 0 for none.
          </p>
          {CATEGORIES.map((cat) => {
            const isCollapsed = form.categoryCounts[cat] === "0";
            return (
              <div
                key={cat}
                className={`tier-section-wrapper ${isCollapsed ? "collapsed" : ""}`}
              >
                <div
                  className="tier-section"
                  style={{ borderColor: CATEGORY_BORDER[cat] }}
                >
                  <h3 style={{ color: CATEGORY_COLORS[cat] }}>{cat}</h3>
                  <div className="tier-grid">
                    {TIERS.map((tier) => (
                      <div key={tier} className="tier-input">
                        <label>{tier}</label>
                        <input
                          type="number"
                          min={0}
                          max={12}
                          placeholder="1"
                          value={form.tierCounts[cat][tier]}
                          onChange={(e) =>
                            setTierCount(cat, tier, e.target.value)
                          }
                          className="num-input small"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Collapse>

      <button className="btn-randomize" onClick={onRandomize}>
        🎲 Randomize!
      </button>
    </section>
  );
}

// ─── Results Display Component ──────────────────────────────────────

function ResultsDisplay({
  result,
  onCopyUrl,
}: {
  result: RandomizerResult;
  onCopyUrl: () => void;
}) {
  const sortedItems = [...result.items].sort((a, b) => {
    const catOrder = { Gun: 1, Vitality: 2, Spirit: 3 };
    const catDiff =
      (catOrder[a.category as keyof typeof catOrder] || 0) -
      (catOrder[b.category as keyof typeof catOrder] || 0);
    if (catDiff !== 0) return catDiff;
    return a.value - b.value;
  });

  return (
    <section className="results">
      <div className="card results-card">
        <h2>🎯 Results</h2>

        <div className="heroes-display">
          <span className="heroes-label">Heroes: </span>
          <span className="heroes-names">
            {result.heroes.map((h, i) => (
              <span key={h.name} className="hero-name">
                {h.name}
                {i < result.heroes.length - 1 ? ", " : ""}
              </span>
            ))}
          </span>
        </div>

        <div className="items-list">
          {sortedItems.map((item) => {
            const tier = tierFromValue(item.value);
            return (
              <div
                key={item.name}
                className="item-row"
                style={{
                  backgroundColor: CATEGORY_BG[item.category],
                  borderLeft: `3px solid ${CATEGORY_COLORS[item.category]}`,
                }}
              >
                <span
                  className="item-category-badge"
                  style={{ backgroundColor: CATEGORY_COLORS[item.category] }}
                >
                  {item.category}
                </span>
                <span
                  className="item-name"
                  style={{ color: CATEGORY_COLORS[item.category] }}
                >
                  {item.name}
                  {item.active && (
                    <span className="item-active-badge">Active</span>
                  )}
                </span>
                <span className="item-tier">{tier}</span>
                {item.type.length > 0 && (
                  <span className="item-types">
                    {item.type.slice(0, 3).join(", ")}
                    {item.type.length > 3 && "…"}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        <div className="results-actions">
          <button className="btn-secondary" onClick={onCopyUrl}>
            📋 Copy Share URL
          </button>
          <span className="items-count">{result.items.length} items</span>
        </div>
      </div>
    </section>
  );
}

// ─── Admin Dashboard Component ──────────────────────────────────────

function AdminDashboard({
  items,
  heroes,
  isServerMode,
  onRefresh,
  onItemsChanged,
}: {
  items: Item[];
  heroes: Hero[];
  isServerMode: boolean;
  onRefresh: () => void;
  onItemsChanged: () => void;
}) {
  const [activeTab, setActiveTab] = useState<"items" | "heroes">("items");
  const [search, setSearch] = useState("");
  const [editError, setEditError] = useState<string | null>(null);

  // Git state
  const [gitStatus, setGitStatus] = useState<{
    branch: string;
    status: string[];
    hasChanges: boolean;
  } | null>(null);
  const [gitMessage, setGitMessage] = useState("");
  const [gitResult, setGitResult] = useState<string | null>(null);
  const [gitLoading, setGitLoading] = useState(false);

  // Item edit state
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [itemEditForm, setItemEditForm] = useState({
    name: "",
    category: "Gun" as string,
    value: 800,
    active: true,
    type: "",
    upgradesTo: "" as string,
    upgradesFrom: "" as string,
  });
  const [allItemNames, setAllItemNames] = useState<string[]>([]);

  // Add item state
  const [showAddItem, setShowAddItem] = useState(false);
  const [addItemForm, setAddItemForm] = useState({
    name: "",
    category: "Gun" as string,
    value: 800,
    active: true,
    type: "",
  });

  // Batch edit state
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [showBatchEdit, setShowBatchEdit] = useState(false);
  const [batchForm, setBatchForm] = useState({
    category: "" as string,
    value: "" as string,
    active: "" as string,
    type: "" as string,
  });

  // Hero edit state
  const [editingHero, setEditingHero] = useState<Hero | null>(null);
  const [heroEditForm, setHeroEditForm] = useState({ name: "", roles: "" });
  const [showAddHero, setShowAddHero] = useState(false);
  const [addHeroForm, setAddHeroForm] = useState({ name: "", roles: "" });

  const filteredItems = items.filter((i) =>
    i.name.toLowerCase().includes(search.toLowerCase()),
  );
  const filteredHeroes = heroes.filter((h) =>
    h.name.toLowerCase().includes(search.toLowerCase()),
  );

  // Fetch git status + item names periodically in server mode
  useEffect(() => {
    if (!isServerMode) return;
    let cancelled = false;
    const fetch = async () => {
      const [s, names] = await Promise.all([
        getGitStatus(),
        getItemNamesApi().catch(() => []),
      ]);
      if (!cancelled) {
        if (s) setGitStatus(s);
        setAllItemNames(names);
      }
    };
    fetch();
    const interval = setInterval(fetch, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [isServerMode]);

  // ── Item Operations ─────────────────────────────────────────────

  const startEdit = (item: Item) => {
    setEditingItem(item);
    setItemEditForm({
      name: item.name,
      category: item.category,
      value: item.value,
      active: item.active,
      type: item.type.join(", "),
      upgradesTo: item.upgradesTo.join(", "),
      upgradesFrom: item.upgradesFrom.join(", "),
    });
    setEditError(null);
  };

  const handleSaveItem = async () => {
    if (!editingItem) return;
    setEditError(null);
    try {
      const types = itemEditForm.type
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      const upgradesTo = itemEditForm.upgradesTo
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      const upgradesFrom = itemEditForm.upgradesFrom
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      await updateItemApi(editingItem.name, {
        name: itemEditForm.name,
        category: itemEditForm.category,
        value: itemEditForm.value,
        active: itemEditForm.active,
        type: types,
      });

      // Update upgrade chains
      await setUpgradesApi(itemEditForm.name, upgradesTo, upgradesFrom);

      setEditingItem(null);
      onItemsChanged();
    } catch (err) {
      setEditError(String(err));
    }
  };

  const handleDeleteItem = async (name: string) => {
    if (!window.confirm(`Delete "${name}"?`)) return;
    try {
      await deleteItemApi(name);
      onItemsChanged();
    } catch (err) {
      setEditError(String(err));
    }
  };

  const handleAddItem = async () => {
    if (!addItemForm.name.trim()) return;
    setEditError(null);
    try {
      const types = addItemForm.type
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      await createItemApi({
        name: addItemForm.name.trim(),
        category: addItemForm.category,
        value: addItemForm.value,
        active: addItemForm.active,
        type: types,
      });
      setShowAddItem(false);
      setAddItemForm({
        name: "",
        category: "Gun",
        value: 800,
        active: true,
        type: "",
      });
      onItemsChanged();
    } catch (err) {
      setEditError(String(err));
    }
  };

  // ── Batch Edit ──────────────────────────────────────────────────

  const toggleSelect = (name: string) => {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedItems.size === filteredItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filteredItems.map((i) => i.name)));
    }
  };

  const handleBatchEdit = async () => {
    if (selectedItems.size === 0) return;
    setEditError(null);
    try {
      const names = [...selectedItems];
      const updates: Record<string, any> = {};
      if (batchForm.category) updates.category = batchForm.category;
      if (batchForm.value) updates.value = Number(batchForm.value);
      if (batchForm.active === "true") updates.active = true;
      else if (batchForm.active === "false") updates.active = false;
      if (batchForm.type.trim()) {
        updates.type = batchForm.type
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean);
      }

      if (Object.keys(updates).length === 0) return;
      await batchUpdateItemsApi(names, updates);
      setShowBatchEdit(false);
      setSelectedItems(new Set());
      setBatchForm({ category: "", value: "", active: "", type: "" });
      onItemsChanged();
    } catch (err) {
      setEditError(String(err));
    }
  };

  // ── Hero Operations ─────────────────────────────────────────────

  const startEditHero = (hero: Hero) => {
    setEditingHero(hero);
    setHeroEditForm({ name: hero.name, roles: (hero.roles || []).join(", ") });
    setEditError(null);
  };

  const handleSaveHero = async () => {
    if (!editingHero) return;
    setEditError(null);
    try {
      const roles = heroEditForm.roles
        .split(",")
        .map((r) => r.trim())
        .filter(Boolean);
      await updateHeroApi(editingHero.name, { name: heroEditForm.name, roles });
      setEditingHero(null);
      onItemsChanged();
    } catch (err) {
      setEditError(String(err));
    }
  };

  const handleDeleteHero = async (name: string) => {
    if (!window.confirm(`Delete hero "${name}"?`)) return;
    try {
      await deleteHeroApi(name);
      onItemsChanged();
    } catch (err) {
      setEditError(String(err));
    }
  };

  const handleAddHero = async () => {
    if (!addHeroForm.name.trim()) return;
    setEditError(null);
    try {
      const roles = addHeroForm.roles
        .split(",")
        .map((r) => r.trim())
        .filter(Boolean);
      await createHeroApi(addHeroForm.name.trim(), roles);
      setShowAddHero(false);
      setAddHeroForm({ name: "", roles: "" });
      onItemsChanged();
    } catch (err) {
      setEditError(String(err));
    }
  };

  // ── Git Commit ──────────────────────────────────────────────────

  const handleGitCommit = async () => {
    if (!gitMessage.trim()) return;
    setGitLoading(true);
    setGitResult(null);
    try {
      const result = await commitChanges(gitMessage.trim());
      setGitResult(result.message);
      setGitMessage("");
      const s = await getGitStatus();
      if (s) setGitStatus(s);
    } catch (err) {
      setGitResult(`Error: ${err}`);
    } finally {
      setGitLoading(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────

  return (
    <section className="admin-dashboard">
      <div className="card">
        <h2>🛠️ Admin Dashboard</h2>
        {isServerMode && gitStatus && (
          <p
            className="hint"
            style={{ marginBottom: 8, color: "var(--green)" }}
          >
            Server mode · Branch: <code>{gitStatus.branch}</code>
            {gitStatus.hasChanges &&
              ` · ${gitStatus.status.length} file(s) changed`}
          </p>
        )}

        <div className="admin-tabs">
          <button
            className={`tab-btn ${activeTab === "items" ? "active" : ""}`}
            onClick={() => setActiveTab("items")}
          >
            Items ({items.length})
          </button>
          <button
            className={`tab-btn ${activeTab === "heroes" ? "active" : ""}`}
            onClick={() => setActiveTab("heroes")}
          >
            Heroes ({heroes.length})
          </button>
          {isServerMode && activeTab === "items" && (
            <>
              <button className="tab-btn" onClick={() => setShowAddItem(true)}>
                + Add Item
              </button>
              {selectedItems.size > 0 && (
                <button
                  className="tab-btn"
                  style={{ background: "var(--peach)", color: "var(--base)" }}
                  onClick={() => setShowBatchEdit(true)}
                >
                  Batch ({selectedItems.size})
                </button>
              )}
            </>
          )}
          {isServerMode && activeTab === "heroes" && (
            <button className="tab-btn" onClick={() => setShowAddHero(true)}>
              + Add Hero
            </button>
          )}
          <button className="tab-btn" onClick={onRefresh}>
            🔄 Refresh
          </button>
        </div>

        <input
          type="text"
          className="search-input"
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {editError && (
          <div className="error-banner" style={{ marginTop: 8 }}>
            <span>Error: {editError}</span>
            <button onClick={() => setEditError(null)}>×</button>
          </div>
        )}

        {/* ═══ ITEMS TABLE ═══ */}
        {activeTab === "items" && (
          <>
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    {isServerMode && (
                      <th style={{ width: 30 }}>
                        <input
                          type="checkbox"
                          onChange={toggleSelectAll}
                          checked={
                            selectedItems.size === filteredItems.length &&
                            filteredItems.length > 0
                          }
                        />
                      </th>
                    )}
                    <th>Name</th>
                    <th>Category</th>
                    <th>Tier</th>
                    <th>Active</th>
                    <th>Types</th>
                    <th>Upgrades</th>
                    {isServerMode && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item) => (
                    <tr
                      key={item.name}
                      style={
                        selectedItems.has(item.name)
                          ? { background: "rgba(137, 180, 250, 0.08)" }
                          : {}
                      }
                    >
                      {isServerMode && (
                        <td>
                          <input
                            type="checkbox"
                            checked={selectedItems.has(item.name)}
                            onChange={() => toggleSelect(item.name)}
                          />
                        </td>
                      )}
                      <td>{item.name}</td>
                      <td>
                        <span style={{ color: CATEGORY_COLORS[item.category] }}>
                          {item.category}
                        </span>
                      </td>
                      <td>{tierFromValue(item.value)}</td>
                      <td>{item.active ? "✓" : ""}</td>
                      <td className="types-cell">
                        {item.type.slice(0, 2).join(", ")}
                      </td>
                      <td
                        style={{
                          fontSize: "0.75rem",
                          color: "var(--overlay0)",
                        }}
                      >
                        {item.upgradesTo.length > 0 && (
                          <>
                            → {item.upgradesTo.slice(0, 1).join(", ")}
                            {item.upgradesTo.length > 1 ? "…" : ""}
                          </>
                        )}
                      </td>
                      {isServerMode && (
                        <td>
                          <button
                            className="btn-small"
                            style={{ color: "var(--green)" }}
                            onClick={() => startEdit(item)}
                          >
                            ✎
                          </button>{" "}
                          <button
                            className="btn-small"
                            style={{ color: "var(--red)" }}
                            onClick={() => handleDeleteItem(item.name)}
                          >
                            ×
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ═══ HEROES TABLE ═══ */}
        {activeTab === "heroes" && (
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Roles</th>
                  {isServerMode && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filteredHeroes.map((hero) => (
                  <tr key={hero.name}>
                    <td>{hero.name}</td>
                    <td style={{ fontSize: "0.8rem", color: "var(--teal)" }}>
                      {hero.roles && hero.roles.length > 0 ? (
                        hero.roles.join(", ")
                      ) : (
                        <span style={{ color: "var(--overlay0)" }}>—</span>
                      )}
                    </td>
                    {isServerMode && (
                      <td>
                        <button
                          className="btn-small"
                          style={{ color: "var(--green)" }}
                          onClick={() => startEditHero(hero)}
                        >
                          ✎
                        </button>{" "}
                        <button
                          className="btn-small"
                          style={{ color: "var(--red)" }}
                          onClick={() => handleDeleteHero(hero.name)}
                        >
                          ×
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ═══ ADD ITEM MODAL ═══ */}
        {isServerMode && showAddItem && (
          <div
            className="edit-modal-overlay"
            onClick={() => setShowAddItem(false)}
          >
            <div className="edit-modal" onClick={(e) => e.stopPropagation()}>
              <h3>Add Item</h3>
              <ModalTextField
                label="Name"
                value={addItemForm.name}
                onChange={(v) => setAddItemForm((f) => ({ ...f, name: v }))}
              />
              <ModalSelect
                label="Category"
                value={addItemForm.category}
                onChange={(v) => setAddItemForm((f) => ({ ...f, category: v }))}
                options={["Gun", "Vitality", "Spirit"]}
              />
              <ModalSelect
                label="Tier"
                value={String(addItemForm.value)}
                onChange={(v) =>
                  setAddItemForm((f) => ({ ...f, value: Number(v) }))
                }
                options={["800 (T1)", "1600 (T2)", "3200 (T3)", "6400 (T4)"]}
                values={["800", "1600", "3200", "6400"]}
              />
              <ModalCheckbox
                label="Active"
                checked={addItemForm.active}
                onChange={(v) => setAddItemForm((f) => ({ ...f, active: v }))}
              />
              <ModalTextField
                label="Types (comma-separated)"
                value={addItemForm.type}
                onChange={(v) => setAddItemForm((f) => ({ ...f, type: v }))}
                placeholder="Weapon, Melee, ..."
              />
              <div className="edit-modal-actions">
                <button
                  className="btn-secondary"
                  onClick={() => setShowAddItem(false)}
                >
                  Cancel
                </button>
                <button
                  className="btn-randomize"
                  style={{ padding: "8px 16px", fontSize: "0.9rem" }}
                  onClick={handleAddItem}
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ═══ EDIT ITEM MODAL ═══ */}
        {isServerMode && editingItem && (
          <div
            className="edit-modal-overlay"
            onClick={() => setEditingItem(null)}
          >
            <div className="edit-modal" onClick={(e) => e.stopPropagation()}>
              <h3>Edit Item</h3>
              <ModalTextField
                label="Name"
                value={itemEditForm.name}
                onChange={(v) => setItemEditForm((f) => ({ ...f, name: v }))}
              />
              <ModalSelect
                label="Category"
                value={itemEditForm.category}
                onChange={(v) =>
                  setItemEditForm((f) => ({ ...f, category: v }))
                }
                options={["Gun", "Vitality", "Spirit"]}
              />
              <ModalSelect
                label="Tier"
                value={String(itemEditForm.value)}
                onChange={(v) =>
                  setItemEditForm((f) => ({ ...f, value: Number(v) }))
                }
                options={["800 (T1)", "1600 (T2)", "3200 (T3)", "6400 (T4)"]}
                values={["800", "1600", "3200", "6400"]}
              />
              <ModalCheckbox
                label="Active"
                checked={itemEditForm.active}
                onChange={(v) => setItemEditForm((f) => ({ ...f, active: v }))}
              />
              <ModalTextField
                label="Types (comma-separated)"
                value={itemEditForm.type}
                onChange={(v) => setItemEditForm((f) => ({ ...f, type: v }))}
                placeholder="Weapon, Melee, Tech, ..."
              />
              <ModalTextField
                label="Upgrades To (item names, comma-separated)"
                value={itemEditForm.upgradesTo}
                onChange={(v) =>
                  setItemEditForm((f) => ({ ...f, upgradesTo: v }))
                }
                placeholder="Gunblade, Silencer, ..."
              />
              <ModalTextField
                label="Upgrades From (item names, comma-separated)"
                value={itemEditForm.upgradesFrom}
                onChange={(v) =>
                  setItemEditForm((f) => ({ ...f, upgradesFrom: v }))
                }
                placeholder="Ammo Scavenger, ..."
              />
              <div className="edit-modal-actions">
                <button
                  className="btn-secondary"
                  onClick={() => setEditingItem(null)}
                >
                  Cancel
                </button>
                <button
                  className="btn-randomize"
                  style={{ padding: "8px 16px", fontSize: "0.9rem" }}
                  onClick={handleSaveItem}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ═══ BATCH EDIT MODAL ═══ */}
        {isServerMode && showBatchEdit && (
          <div
            className="edit-modal-overlay"
            onClick={() => setShowBatchEdit(false)}
          >
            <div className="edit-modal" onClick={(e) => e.stopPropagation()}>
              <h3>Batch Edit ({selectedItems.size} items)</h3>
              <p className="hint">
                Only filled fields will be applied. Leave blank to keep current
                values.
              </p>
              <ModalSelect
                label="Category"
                value={batchForm.category}
                onChange={(v) => setBatchForm((f) => ({ ...f, category: v }))}
                options={["", "Gun", "Vitality", "Spirit"]}
              />
              <ModalSelect
                label="Tier"
                value={batchForm.value}
                onChange={(v) => setBatchForm((f) => ({ ...f, value: v }))}
                options={[
                  "",
                  "800 (T1)",
                  "1600 (T2)",
                  "3200 (T3)",
                  "6400 (T4)",
                ]}
                values={["", "800", "1600", "3200", "6400"]}
              />
              <ModalSelect
                label="Active"
                value={batchForm.active}
                onChange={(v) => setBatchForm((f) => ({ ...f, active: v }))}
                options={["(keep current)", "Active ✓", "Inactive ✗"]}
                values={["", "true", "false"]}
              />
              <ModalTextField
                label="Types (comma-separated)"
                value={batchForm.type}
                onChange={(v) => setBatchForm((f) => ({ ...f, type: v }))}
                placeholder="Leave blank to keep"
              />
              <div className="edit-modal-actions">
                <button
                  className="btn-secondary"
                  onClick={() => setShowBatchEdit(false)}
                >
                  Cancel
                </button>
                <button
                  className="btn-randomize"
                  style={{ padding: "8px 16px", fontSize: "0.9rem" }}
                  onClick={handleBatchEdit}
                >
                  Apply to {selectedItems.size} items
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ═══ EDIT HERO MODAL ═══ */}
        {isServerMode && editingHero && (
          <div
            className="edit-modal-overlay"
            onClick={() => setEditingHero(null)}
          >
            <div className="edit-modal" onClick={(e) => e.stopPropagation()}>
              <h3>Edit Hero</h3>
              <ModalTextField
                label="Name"
                value={heroEditForm.name}
                onChange={(v) => setHeroEditForm((f) => ({ ...f, name: v }))}
              />
              <ModalTextField
                label="Roles (comma-separated)"
                value={heroEditForm.roles}
                onChange={(v) => setHeroEditForm((f) => ({ ...f, roles: v }))}
                placeholder="initiator, laner, ganker, ..."
              />
              <div className="edit-modal-actions">
                <button
                  className="btn-secondary"
                  onClick={() => setEditingHero(null)}
                >
                  Cancel
                </button>
                <button
                  className="btn-randomize"
                  style={{ padding: "8px 16px", fontSize: "0.9rem" }}
                  onClick={handleSaveHero}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ═══ ADD HERO MODAL ═══ */}
        {isServerMode && showAddHero && (
          <div
            className="edit-modal-overlay"
            onClick={() => setShowAddHero(false)}
          >
            <div className="edit-modal" onClick={(e) => e.stopPropagation()}>
              <h3>Add Hero</h3>
              <ModalTextField
                label="Name"
                value={addHeroForm.name}
                onChange={(v) => setAddHeroForm((f) => ({ ...f, name: v }))}
              />
              <ModalTextField
                label="Roles (comma-separated)"
                value={addHeroForm.roles}
                onChange={(v) => setAddHeroForm((f) => ({ ...f, roles: v }))}
                placeholder="initiator, laner, ..."
              />
              <div className="edit-modal-actions">
                <button
                  className="btn-secondary"
                  onClick={() => setShowAddHero(false)}
                >
                  Cancel
                </button>
                <button
                  className="btn-randomize"
                  style={{ padding: "8px 16px", fontSize: "0.9rem" }}
                  onClick={handleAddHero}
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ═══ GIT SYNC ═══ */}
        {isServerMode && (
          <div
            className="git-section"
            style={{
              marginTop: 16,
              borderTop: "1px solid var(--surface1)",
              paddingTop: 16,
            }}
          >
            <h3>📦 Git Sync</h3>

            {gitStatus && gitStatus.status.length > 0 && (
              <div
                className="git-status-list"
                style={{
                  marginBottom: 8,
                  fontSize: "0.8rem",
                  color: "var(--overlay0)",
                }}
              >
                {gitStatus.status.map((line, i) => (
                  <div
                    key={i}
                    style={{ fontFamily: "monospace", whiteSpace: "pre" }}
                  >
                    {line}
                  </div>
                ))}
              </div>
            )}

            <div className="git-input-row" style={{ display: "flex", gap: 8 }}>
              <input
                type="text"
                className="git-input"
                placeholder="Commit message..."
                value={gitMessage}
                onChange={(e) => setGitMessage(e.target.value)}
                style={{ flex: 1 }}
              />
              <button
                className="btn-secondary"
                onClick={handleGitCommit}
                disabled={!gitMessage.trim() || gitLoading}
              >
                {gitLoading ? "Committing..." : "Commit"}
              </button>
            </div>
            {gitResult && (
              <p
                className="git-status"
                style={{
                  marginTop: 4,
                  fontSize: "0.85rem",
                  color: "var(--green)",
                }}
              >
                {gitResult}
              </p>
            )}
            <p
              className="hint"
              style={{
                marginTop: 8,
                fontSize: "0.8rem",
                color: "var(--overlay0)",
              }}
            >
              Commits are local only. Run <code>bun run deploy</code> to build
              the static site, then <code>git push origin --all</code> to push
              both branches.
            </p>
          </div>
        )}

        {!isServerMode && (
          <p
            className="hint"
            style={{ marginTop: 12, color: "var(--overlay0)" }}
          >
            Read-only view. To edit data, run <code>bun run serve</code>{" "}
            locally, make your changes in the admin panel, then{" "}
            <code>bun run deploy</code>.
          </p>
        )}
      </div>
    </section>
  );
}

// ─── Modal Helper Components ────────────────────────────────────────

function ModalTextField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label>
      {label}:
      <input
        type="text"
        className="num-input"
        style={{ width: "100%", marginTop: 4, marginBottom: 8 }}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}

function ModalSelect({
  label,
  value,
  onChange,
  options,
  values,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  values?: string[];
}) {
  return (
    <label>
      {label}:
      <select
        className="num-input"
        style={{ width: "100%", marginTop: 4, marginBottom: 8 }}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((opt, i) => (
          <option key={opt} value={values ? values[i] : opt}>
            {opt}
          </option>
        ))}
      </select>
    </label>
  );
}

function ModalCheckbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        marginBottom: 12,
        fontSize: "0.85rem",
        color: "var(--overlay1)",
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  );
}

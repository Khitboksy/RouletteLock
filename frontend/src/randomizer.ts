/**
 * RouletteLock Randomizer — Browser-compatible
 *
 * Pure randomizer with no tier/pattern constraints unless explicitly
 * requested via tierSplit.  Always caps at 12 items / 4 actives.
 */

// ─── Types ──────────────────────────────────────────────────────────

export interface Hero {
  name: string;
  roles: readonly string[];
}

export interface Item {
  name: string;
  category: string;
  value: number;
  type: readonly string[];
  active: boolean;
  upgradesTo: readonly string[];
  upgradesFrom: readonly string[];
}

export type ActiveMode = "No Actives" | "Only Actives" | "random" | number;

export interface CategorySplit {
  Gun?: number;
  Vitality?: number;
  Spirit?: number;
}

export interface TierSplit {
  T1?: number;
  T2?: number;
  T3?: number;
  T4?: number;
}

export interface CategoryTierSplit {
  Gun?: TierSplit;
  Vitality?: TierSplit;
  Spirit?: TierSplit;
}

export interface ItemRandomizerConfig {
  activeMode: ActiveMode;
  types?: readonly string[];
  categorySplit?: CategorySplit;
  tierSplit?: CategoryTierSplit;
}

export interface RandomizerConfig {
  heroCount: number;
  items: ItemRandomizerConfig;
  heroRoles?: readonly string[];
  itemTypes?: readonly string[];
}

export interface RandomizerResult {
  heroes: Hero[];
  items: Item[];
}

// ─── Helpers ────────────────────────────────────────────────────────

function isRandomMode(mode: ActiveMode): boolean {
  return (mode as string) === "random";
}

function hasTierValues(tierSplit: CategoryTierSplit | undefined): boolean {
  if (!tierSplit) return false;
  for (const cat of ["Gun", "Vitality", "Spirit"] as const) {
    const catSplit = tierSplit[cat];
    if (catSplit && (catSplit.T1 || catSplit.T2 || catSplit.T3 || catSplit.T4)) {
      return true;
    }
  }
  return false;
}

export function getRandomItems<T>(list: T[], count: number): T[] {
  const shuffled = [...list];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
}

export function getTierFromValue(value: number): "T1" | "T2" | "T3" | "T4" {
  const tierMap: Record<number, "T1" | "T2" | "T3" | "T4"> = {
    800: "T1",
    1600: "T2",
    3200: "T3",
    6400: "T4",
  };
  return tierMap[value] || "T1";
}

// ─── Cap helper ─────────────────────────────────────────────────────

function capSplit(split: CategorySplit): { gun: number; vit: number; spi: number; total: number } {
  let gun = split.Gun ?? 0;
  let vit = split.Vitality ?? 0;
  let spi = split.Spirit ?? 0;

  if (gun < 0) gun = 0;
  if (vit < 0) vit = 0;
  if (spi < 0) spi = 0;

  let total = gun + vit + spi;

  if (total > 12) {
    // Random slot distribution: each of the 12 slots independently picks
    // a category weighted by the raw counts.  This produces truly varied
    // results instead of always giving the same proportional split.
    const w = [gun, vit, spi];
    const totalW = gun + vit + spi || 1;

    gun = 0; vit = 0; spi = 0;
    for (let i = 0; i < 12; i++) {
      const r = Math.random() * totalW;
      if (r < w[0]) gun++;
      else if (r < w[0] + w[1]) vit++;
      else spi++;
    }

    total = 12;
  }

  return { gun, vit, spi, total };
}

// ─── Main Entry Point ───────────────────────────────────────────────

export function randomize(
  allItems: Item[],
  allHeroes: Hero[],
  config: RandomizerConfig
): RandomizerResult {
  const randomHeroes = getRandomItems(allHeroes, config.heroCount);

  // ─── Item pool (type filter) ────────────────────────────────────
  let pool = [...allItems];
  if (config.items.types?.length) {
    pool = pool.filter((item) =>
      config.items.types!.some((t) => item.type.includes(t))
    );
  }

  // ─── Determine category split (capped to 12) ───────────────────
  const rawSplit = config.items.categorySplit || {};
  const { gun, vit, spi, total } = capSplit(rawSplit);

  // ─── Category slot map (used by both Only‑Actives and normal path) ─
  const catSlots: Record<string, number> = { Gun: gun, Vitality: vit, Spirit: spi };

  // ─── Determine active count ─────────────────────────────────────
  const activeMode = config.items.activeMode;
  let targetActives = 0;
  if (activeMode === "No Actives") {
    targetActives = 0;
  } else if (activeMode === "Only Actives") {
    targetActives = Math.min(4, total);
  } else if (isRandomMode(activeMode)) {
    targetActives = Math.min(Math.floor(Math.random() * 5), total);
  } else if (typeof activeMode === "number") {
    targetActives = Math.min(activeMode, 4, total);
  }

  const isOnlyActives = activeMode === "Only Actives";
  if (isOnlyActives) {
    // Pick active items per category, capped at 4 total (max actives)
    const allItems: Item[] = [];
    let activesRemaining = Math.min(4, total);
    for (const category of ["Gun", "Vitality", "Spirit"] as const) {
      if (activesRemaining <= 0) break;
      const count = Math.min(catSlots[category] || 0, activesRemaining);
      if (count <= 0) continue;
      const catPool = pool.filter((i) => i.category === category && i.active);
      const picked = getRandomItems(catPool, Math.min(count, catPool.length));
      allItems.push(...picked);
      activesRemaining -= picked.length;
    }
    return { heroes: randomHeroes, items: allItems };
  }

  // ─── Distribute actives across categories ───────────────────────
  // Random slot-by-slot assignment so no pattern emerges
  const catActives: Record<string, number> = { Gun: 0, Vitality: 0, Spirit: 0 };

  let remActives = targetActives;
  const catsWithSlots = (["Gun", "Vitality", "Spirit"] as const).filter(c => (catSlots[c] || 0) > 0);

  // Shuffle the category list so we don't always start from Gun
  const shuffledCats = getRandomItems(catsWithSlots, catsWithSlots.length);

  while (remActives > 0 && shuffledCats.length > 0) {
    // Pick a random category from the shuffled list
    const idx = Math.floor(Math.random() * shuffledCats.length);
    const cat = shuffledCats[idx];
    if (catActives[cat] >= catSlots[cat]) {
      shuffledCats.splice(idx, 1); // exhausted
      continue;
    }
    catActives[cat]++;
    remActives--;
  }

  // ─── Pick items per category ────────────────────────────────────
  const selectedItems: Item[] = [];
  const allUpgradeNames = new Set<string>();

  for (const category of ["Gun", "Vitality", "Spirit"] as const) {
    const count = catSlots[category] || 0;
    if (count <= 0) continue;

    const activesWanted = Math.min(catActives[category] || 0, count);
    const inactivesWanted = count - activesWanted;

    // Active picks
    const activePool = pool.filter((i) => i.category === category && i.active);
    const pickedActives = getRandomItems(activePool, activesWanted);

    // Inactive picks — exclude already-picked actives AND upgrade
    // relatives so a build doesn't contain both a base item and its upgrade.
    const activeNames = new Set(pickedActives.map((i) => i.name));
    for (const a of pickedActives) {
      a.upgradesTo.forEach((n) => allUpgradeNames.add(n));
      a.upgradesFrom.forEach((n) => allUpgradeNames.add(n));
    }
    const inactivePool = pool.filter(
      (i) =>
        i.category === category &&
        !i.active &&
        !activeNames.has(i.name) &&
        !allUpgradeNames.has(i.name)
    );
    let pickedInactives = getRandomItems(inactivePool, inactivesWanted);

    // If we couldn't fill from the filtered pool, grab from the full
    // category pool (just exclude already-picked names).
    if (pickedInactives.length < inactivesWanted) {
      const short = inactivesWanted - pickedInactives.length;
      const pickedNames = new Set(pickedInactives.map((i) => i.name));
      const fallbackPool = pool.filter(
        (i) =>
          i.category === category &&
          !i.active &&
          !activeNames.has(i.name) &&
          !pickedNames.has(i.name)
      );
      const extra = getRandomItems(fallbackPool, short);
      pickedInactives = [...pickedInactives, ...extra];
    }

    for (const i of pickedInactives) {
      i.upgradesTo.forEach((n) => allUpgradeNames.add(n));
      i.upgradesFrom.forEach((n) => allUpgradeNames.add(n));
    }

    selectedItems.push(...pickedActives, ...pickedInactives);
  }

  return { heroes: randomHeroes, items: selectedItems };
}

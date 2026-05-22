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

// ─── Tier helper ────────────────────────────────────────────────────

function generateRandomTierSplit(totalItems: number): TierSplit {
  const tiers: Array<"T1" | "T2" | "T3" | "T4"> = ["T1", "T2", "T3", "T4"];
  const split: TierSplit = { T1: 0, T2: 0, T3: 0, T4: 0 };
  for (let i = 0; i < totalItems; i++) {
    const t = tiers[Math.floor(Math.random() * 4)];
    split[t] = (split[t] ?? 0) + 1;
  }
  return split;
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

  // ─── Pick items per category (tier-aware) ────────────────────────
  const selectedItems: Item[] = [];
  const allUpgradeNames = new Set<string>();

  const tierValues: Record<string, number> = { T1: 800, T2: 1600, T3: 3200, T4: 6400 };

  for (const category of ["Gun", "Vitality", "Spirit"] as const) {
    const count = catSlots[category] || 0;
    if (count <= 0) continue;

    const activesWanted = Math.min(catActives[category] || 0, count);
    const inactivesWanted = count - activesWanted;

    // ── Active picks ───────────────────────────────────────────────
    const activePool = pool.filter((i) => i.category === category && i.active);
    const pickedActives = getRandomItems(activePool, activesWanted);

    // Track names and upgrade relatives for actives
    const activeNames = new Set(pickedActives.map((i) => i.name));
    for (const a of pickedActives) {
      a.upgradesTo.forEach((n) => allUpgradeNames.add(n));
      a.upgradesFrom.forEach((n) => allUpgradeNames.add(n));
    }

    // ── Resolve tier distribution ─────────────────────────────────
    // Check if user specified tiers for this category
    const userTiers = config.items.tierSplit?.[category as keyof CategoryTierSplit];
    const hasUserTiers = userTiers !== undefined && (
      userTiers.T1 !== undefined || userTiers.T2 !== undefined ||
      userTiers.T3 !== undefined || userTiers.T4 !== undefined
    );

    // Use a plain record for tier counts (all fields always defined)
    // to avoid TS issues with TierSplit's optional fields.
    const getDist = (): Record<string, number> => {
      if (hasUserTiers) {
        const d: Record<string, number> = {
          T1: userTiers!.T1 ?? 0,
          T2: userTiers!.T2 ?? 0,
          T3: userTiers!.T3 ?? 0,
          T4: userTiers!.T4 ?? 0,
        };
        const sum = d.T1 + d.T2 + d.T3 + d.T4;
        if (sum < count) {
          const fill = generateRandomTierSplit(count - sum);
          d.T1 += fill.T1 ?? 0;
          d.T2 += fill.T2 ?? 0;
          d.T3 += fill.T3 ?? 0;
          d.T4 += fill.T4 ?? 0;
        } else if (sum > count) {
          const scale = count / sum;
          d.T1 = Math.round(d.T1 * scale);
          d.T2 = Math.round(d.T2 * scale);
          d.T3 = Math.round(d.T3 * scale);
          d.T4 = count - d.T1 - d.T2 - d.T3;
          const adj = d.T1 + d.T2 + d.T3 + d.T4;
          if (adj < count) d.T1 += count - adj;
          else if (adj > count) d.T1 -= adj - count;
        }
        return d;
      }
      // No user tiers — auto-generate
      const fill = generateRandomTierSplit(count);
      return { T1: fill.T1 ?? 0, T2: fill.T2 ?? 0, T3: fill.T3 ?? 0, T4: fill.T4 ?? 0 };
    };

    const tierDist = getDist();

    // Deduct actives from tier distribution.
    // Every active must consume exactly one slot from the tier pool so
    // total items never exceeds the category count. If the active's tier
    // is at 0, steal a slot from whichever tier still has room.
    for (const active of pickedActives) {
      const tier = getTierFromValue(active.value);
      if ((tierDist[tier] ?? 0) > 0) {
        tierDist[tier] = (tierDist[tier] ?? 0) - 1;
      } else {
        for (const fallback of ["T1", "T2", "T3", "T4"]) {
          if ((tierDist[fallback] ?? 0) > 0) {
            tierDist[fallback] = (tierDist[fallback] ?? 0) - 1;
            break;
          }
        }
      }
    }

    // ── Per-tier inactive picks ────────────────────────────────────
    // We never pick more than inactivesWanted across all tiers.
    const inactivePicks: Item[] = [];

    for (const [tier, slots] of Object.entries(tierDist)) {
      if (slots <= 0) continue;
      const remaining = inactivesWanted - inactivePicks.length;
      if (remaining <= 0) break;
      const val = tierValues[tier];
      const tierPool = pool.filter(
        (i) =>
          i.category === category &&
          i.value === val &&
          !i.active &&
          !activeNames.has(i.name) &&
          !allUpgradeNames.has(i.name)
      );
      const take = Math.min(slots, tierPool.length, remaining);
      const picked = getRandomItems(tierPool, take);
      inactivePicks.push(...picked);
      for (const i of picked) {
        i.upgradesTo.forEach((n) => allUpgradeNames.add(n));
        i.upgradesFrom.forEach((n) => allUpgradeNames.add(n));
      }
    }

    // ── Fallback: any remaining slots from full category pool ──────
    if (inactivePicks.length < inactivesWanted) {
      const short = inactivesWanted - inactivePicks.length;
      const pickedNames = new Set(inactivePicks.map((i) => i.name));
      const fallbackPool = pool.filter(
        (i) =>
          i.category === category &&
          !i.active &&
          !activeNames.has(i.name) &&
          !pickedNames.has(i.name) &&
          !allUpgradeNames.has(i.name)
      );
      const extra = getRandomItems(fallbackPool, short);
      inactivePicks.push(...extra);
      for (const i of extra) {
        i.upgradesTo.forEach((n) => allUpgradeNames.add(n));
        i.upgradesFrom.forEach((n) => allUpgradeNames.add(n));
      }
    }

    selectedItems.push(...pickedActives, ...inactivePicks);
  }

  return { heroes: randomHeroes, items: selectedItems };
}

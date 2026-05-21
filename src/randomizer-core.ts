/**
 * RouletteLock Randomizer Core
 *
 * Pure algorithm — no DB, no Bun, no Node.js dependencies.
 * Takes items, heroes, and config as parameters.
 * Can run anywhere: server (Bun/Node), browser, or CLI.
 *
 * This is the heart of the local-first architecture:
 * the client caches items/heroes and runs this locally.
 */

// ─── Types (self-contained, no external deps) ───────────────────────

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
  /** Future: opt-in — only select heroes with ANY matching role. Skip/empty for current behavior. */
  heroRoles?: readonly string[];
  /** Future: opt-in — only select items with ANY matching type tag (in addition to ItemRandomizerConfig.types). Skip/empty for current behavior. */
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

function generateRandomTierSplit(totalItems: number): TierSplit {
  const tiers: Array<"T1" | "T2" | "T3" | "T4"> = ["T1", "T2", "T3", "T4"];
  const split: TierSplit = { T1: 0, T2: 0, T3: 0, T4: 0 };
  for (let i = 0; i < totalItems; i++) {
    const randomTier = tiers[Math.floor(Math.random() * 4)];
    split[randomTier] = (split[randomTier] || 0) + 1;
  }
  return split;
}

function fillRandomTierSplit(
  tierSplit: CategoryTierSplit | undefined,
  categorySplit: { Gun?: number; Vitality?: number; Spirit?: number }
): CategoryTierSplit {
  if (!tierSplit) tierSplit = {};
  if (hasTierValues(tierSplit)) return tierSplit;
  const result = { ...tierSplit };
  for (const cat of ["Gun", "Vitality", "Spirit"] as const) {
    const count = categorySplit[cat];
    if (count && count > 0) {
      result[cat] = generateRandomTierSplit(count);
    }
  }
  return result;
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

export function isNumber(value: unknown): value is number {
  return typeof value === "number" && !isNaN(value);
}

// ─── Main Entry Point ───────────────────────────────────────────────

/**
 * Pure randomizer — no side effects, no module state.
 * Pass in the items, heroes, and config, get back a result.
 */
export function randomize(
  allItems: Item[],
  allHeroes: Hero[],
  config: RandomizerConfig
): RandomizerResult {
  const randomHeroes = getRandomItems(allHeroes, config.heroCount);
  let selectedItems: Item[] = [];

  // Build pool, optionally filtered by type
  let pool = [...allItems];
  if (config.items.types?.length) {
    pool = pool.filter((item) =>
      config.items.types!.some((t) => item.type.includes(t))
    );
  }

  // Category counts
  const cs = config.items.categorySplit;
  const gunCount = cs?.Gun ?? 0;
  const vitalityCount = cs?.Vitality ?? 0;
  const spiritCount = cs?.Spirit ?? 0;
  const totalItems = gunCount + vitalityCount + spiritCount;

  // Active count
  const activeMode = config.items.activeMode;
  let totalActivesNeeded = 0;
  if (activeMode === "No Actives") {
    totalActivesNeeded = 0;
  } else if (activeMode === "Only Actives") {
    totalActivesNeeded = Math.min(totalItems, 4);
  } else if (isRandomMode(activeMode)) {
    totalActivesNeeded = Math.floor(Math.random() * 5);
  } else if (typeof activeMode === "number") {
    totalActivesNeeded = Math.min(activeMode, 4, totalItems);
  }

  // Tier split
  const tierSplit = fillRandomTierSplit(
    config.items.tierSplit,
    config.items.categorySplit || {}
  );

  // ── Active Selection ──────────────────────────────────────────────
  const activeItems: Item[] = [];
  const isOnlyActives = activeMode === "Only Actives";
  const targetActives = isOnlyActives ? 4 : totalActivesNeeded;

  if (targetActives > 0) {
    let availableActives = pool.filter((item) => item.active);
    const upgradeNames = new Set<string>();
    availableActives = availableActives.filter(
      (item) => !upgradeNames.has(item.name)
    );

    if (tierSplit) {
      const categoriesToPickFrom: string[] = [];
      if (gunCount > 0 && tierSplit.Gun) categoriesToPickFrom.push("Gun");
      if (vitalityCount > 0 && tierSplit.Vitality)
        categoriesToPickFrom.push("Vitality");
      if (spiritCount > 0 && tierSplit.Spirit)
        categoriesToPickFrom.push("Spirit");

      if (categoriesToPickFrom.length > 0) {
        const filteredByCategory: Item[] = [];
        for (const cat of categoriesToPickFrom) {
          const catTierSplit = tierSplit[cat as keyof typeof tierSplit];
          if (!catTierSplit) continue;

          for (const tier of ["T1", "T2", "T3", "T4"] as const) {
            const tierCount = catTierSplit[tier];
            if (tierCount && tierCount > 0) {
              const tierValue =
                tier === "T1"
                  ? 800
                  : tier === "T2"
                    ? 1600
                    : tier === "T3"
                      ? 3200
                      : 6400;
              let tierItems = availableActives.filter(
                (i) => i.category === cat && i.value === tierValue
              );

              // Tier-up fallback
              if (tierItems.length < tierCount) {
                const tiersAbove = ["T2", "T3", "T4"];
                const tierIndex = tiersAbove.indexOf(tier);
                for (let i = tierIndex + 1; i < tiersAbove.length; i++) {
                  const higherTier = tiersAbove[i];
                  const higherTierValue =
                    higherTier === "T2"
                      ? 1600
                      : higherTier === "T3"
                        ? 3200
                        : 6400;
                  const higherItems = availableActives.filter(
                    (x) => x.category === cat && x.value === higherTierValue
                  );
                  tierItems = [...tierItems, ...higherItems];
                  if (tierItems.length >= tierCount) break;
                }
              }

              const shuffled = getRandomItems(tierItems, tierItems.length);
              filteredByCategory.push(
                ...shuffled.slice(0, Math.min(tierCount, tierItems.length))
              );
            }
          }
        }
        if (filteredByCategory.length > 0) {
          availableActives = filteredByCategory;
        }
      }
    }

    const shuffled = getRandomItems(availableActives, availableActives.length);
    const picked = shuffled.slice(
      0,
      Math.min(targetActives, availableActives.length)
    );
    activeItems.push(...picked);
  }

  // Only Actives short-circuit
  if (isOnlyActives) {
    return { heroes: randomHeroes, items: activeItems };
  }

  // ── Inactive Selection ────────────────────────────────────────────
  const activeNames = new Set(activeItems.map((i) => i.name));

  const categories: Array<[string, number]> = [
    ["Gun", gunCount],
    ["Vitality", vitalityCount],
    ["Spirit", spiritCount],
  ];

  for (const [category, totalCount] of categories) {
    if (totalCount === 0) continue;

    const activesInCategory = activeItems.filter(
      (i) => i.category === category
    ).length;
    const inactivesNeededInCategory = totalCount - activesInCategory;
    if (inactivesNeededInCategory <= 0) continue;

    const categoryTierSplit =
      tierSplit?.[category as keyof typeof tierSplit] || {
        T1: 0,
        T2: 0,
        T3: 0,
        T4: 0,
      };

    const tiers: Array<[string, number]> = [
      ["T1", categoryTierSplit.T1 ?? 0],
      ["T2", categoryTierSplit.T2 ?? 0],
      ["T3", categoryTierSplit.T3 ?? 0],
      ["T4", categoryTierSplit.T4 ?? 0],
    ];

    const activeCountByTier: Record<string, number> = {
      T1: 0,
      T2: 0,
      T3: 0,
      T4: 0,
    };
    for (const active of activeItems.filter((i) => i.category === category)) {
      const tier = getTierFromValue(active.value);
      activeCountByTier[tier]++;
    }

    const inactiveSlotsByTier: Record<string, number> = {};
    for (const [tier, totalTierSlots] of tiers) {
      const activeCount = activeCountByTier[tier];
      inactiveSlotsByTier[tier] = Math.max(0, totalTierSlots - activeCount);
    }

    const inactiveItems: Item[] = [];
    const upgradeNames = new Set<string>();

    for (const selected of selectedItems) {
      selected.upgradesTo.forEach((name) => upgradeNames.add(name));
      selected.upgradesFrom.forEach((name) => upgradeNames.add(name));
    }
    for (const active of activeItems) {
      active.upgradesTo.forEach((name) => upgradeNames.add(name));
      active.upgradesFrom.forEach((name) => upgradeNames.add(name));
    }

    for (const [tier, slots] of Object.entries(inactiveSlotsByTier)) {
      if (slots <= 0) continue;

      const tierValue =
        tier === "T1"
          ? 800
          : tier === "T2"
            ? 1600
            : tier === "T3"
              ? 3200
              : 6400;

      const tierPool = pool.filter(
        (item) =>
          item.category === category &&
          item.value === tierValue &&
          !item.active &&
          !activeNames.has(item.name) &&
          !upgradeNames.has(item.name)
      );

      const picked = getRandomItems(tierPool, Math.min(slots, tierPool.length));
      inactiveItems.push(...picked);
    }

    // Fill remaining randomly
    if (inactiveItems.length < inactivesNeededInCategory) {
      const remaining = inactivesNeededInCategory - inactiveItems.length;
      const pickedNames = new Set(inactiveItems.map((i) => i.name));
      const remainingPool = pool.filter(
        (item) =>
          item.category === category &&
          !item.active &&
          !activeNames.has(item.name) &&
          !pickedNames.has(item.name) &&
          !upgradeNames.has(item.name)
      );
      const extra = getRandomItems(remainingPool, remaining);
      inactiveItems.push(...extra);
    }

    selectedItems.push(...inactiveItems);
  }

  selectedItems = [...activeItems, ...selectedItems];
  return { heroes: randomHeroes, items: selectedItems };
}

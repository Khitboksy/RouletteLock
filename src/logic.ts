import { heroes } from "./dataHeroes";
import { items } from "./dataItems";
import { RandomizerConfig, Item, Hero, ActiveMode } from "./types";

function isRandomMode(mode: ActiveMode): boolean {
  return (mode as string) === "random";
}

export function getRandomItems<T>(list: T[], count: number): T[] {
  const shuffled = [...list];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
}

export function randomize(config: RandomizerConfig): {
  heroes: Hero[];
  items: Item[];
} {
  const randomHeroes = getRandomItems(heroes, config.heroCount);
  let selectedItems: Item[] = [];

  // Build full pool of all items for swapping
  let pool = [...items];

  // Apply type filter to pool if specified
  if (config.items.types?.length) {
    pool = pool.filter((item) =>
      config.items.types!.some((t) => item.type.includes(t)),
    );
  }

  // Apply tier filter to pool if specified
  if (config.items.tierSplit) {
    pool = pool.filter((item) => {
      const itemTier = getTierFromValue(item.value);
      return config.items.tierSplit![itemTier] !== undefined;
    });
  }

  // Calculate total items and determine active distribution
  const cs = config.items.categorySplit;
  const gunCount = cs?.Gun ?? 0;
  const vitalityCount = cs?.Vitality ?? 0;
  const spiritCount = cs?.Spirit ?? 0;
  const totalItems = gunCount + vitalityCount + spiritCount;

  const activeMode = config.items.activeMode;
  let totalActivesNeeded = 0;

  // Determine total actives needed (max 4)
  if (activeMode === "No Actives") {
    totalActivesNeeded = 0;
  } else if (activeMode === "Only Actives") {
    totalActivesNeeded = Math.min(totalItems, 4);
  } else if (isRandomMode(activeMode)) {
    totalActivesNeeded = Math.floor(Math.random() * 5); // 0-4
  } else if (typeof activeMode === "number") {
    totalActivesNeeded = Math.min(activeMode, 4, totalItems);
  }

  // FIRST: Pick active items from pool
  const activeItems: Item[] = [];
  const isOnlyActives = activeMode === "Only Actives";
  
  // For Only Actives mode, we always want max 4 active items
  const targetActives = isOnlyActives ? 4 : totalActivesNeeded;
  
  if (targetActives > 0) {
    // Get all available actives from pool
    let availableActives = pool.filter((item) => item.active);
    
    // Exclude upgrades
    const upgradeNames = new Set<string>();
    availableActives = availableActives.filter((item) => !upgradeNames.has(item.name));

    // Shuffle and pick randomly - fully random, can get any combination
    const shuffled = getRandomItems(availableActives, availableActives.length);
    const picked = shuffled.slice(0, Math.min(targetActives, availableActives.length));
    activeItems.push(...picked);
  }

  // For Only Actives mode: return only the actives (exactly 4)
  if (isOnlyActives) {
    return { heroes: randomHeroes, items: activeItems };
  }

  // SECOND: Pick inactive items to fill remaining slots
  const inactiveCount = totalItems - activeItems.length;
  const activeNames = new Set(activeItems.map((i) => i.name));

  const categories: Array<[string, number, typeof pool]> = [
    ["Gun", gunCount, pool],
    ["Vitality", vitalityCount, pool],
    ["Spirit", spiritCount, pool],
  ];

  for (const [category, totalCount, fullPool] of categories) {
    if (totalCount === 0) continue;

    // Count how many actives we already have in this category
    const activesInCategory = activeItems.filter((i) => i.category === category).length;
    const inactivesNeededInCategory = totalCount - activesInCategory;

    if (inactivesNeededInCategory <= 0) continue;

    let categoryPool = fullPool.filter(
      (item) => item.category === category && !item.active && !activeNames.has(item.name)
    );

    // Exclude upgrades of already-selected items
    const upgradeNames = new Set<string>();
    for (const selected of selectedItems) {
      selected.upgradesTo.forEach((name) => upgradeNames.add(name));
      selected.upgradesFrom.forEach((name) => upgradeNames.add(name));
    }
    // Also exclude upgrades from active items
    for (const active of activeItems) {
      active.upgradesTo.forEach((name) => upgradeNames.add(name));
      active.upgradesFrom.forEach((name) => upgradeNames.add(name));
    }
    categoryPool = categoryPool.filter((item) => !upgradeNames.has(item.name));

    // Pick inactive items for this category
    const inactiveItems = getRandomItems(categoryPool, inactivesNeededInCategory);
    selectedItems.push(...inactiveItems);
  }

  // Combine active and inactive items
  selectedItems = [...activeItems, ...selectedItems];

  return { heroes: randomHeroes, items: selectedItems };
}

export function getTierFromValue(value: number): "T1" | "T2" | "T3" | "T4" {
  const tiers: Record<number, "T1" | "T2" | "T3" | "T4"> = {
    800: "T1",
    1600: "T2",
    3200: "T3",
    6400: "T4",
  };
  return tiers[value];
}

export function doRandomization(config: RandomizerConfig) {
  return randomize(config);
}

export function isNumber(value: unknown): value is number {
  return typeof value === "number" && !isNaN(value);
}



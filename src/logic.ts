import { heroes } from "./dataHeroes";
import { items } from "./dataItems";
import { RandomizerConfig, Item, Hero } from "./types";

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

  // Determine total actives needed
  if (activeMode === "No Actives") {
    totalActivesNeeded = 0;
  } else if (activeMode === "Only Actives") {
    totalActivesNeeded = Math.min(4, totalItems);
  } else if (typeof activeMode === "number") {
    totalActivesNeeded = Math.min(activeMode, 4);
  }

  // Select items by category
  const categories: Array<[string, number]> = [
    ["Gun", gunCount],
    ["Vitality", vitalityCount],
    ["Spirit", spiritCount],
  ];

  for (const [category, totalCount] of categories) {
    let categoryPool = pool.filter((item) => item.category === category);

    // Exclude upgrades of already-selected items
    const upgradeNames = new Set<string>();
    for (const selected of selectedItems) {
      selected.upgradesTo.forEach((name) => upgradeNames.add(name));
      selected.upgradesFrom.forEach((name) => upgradeNames.add(name));
    }
    categoryPool = categoryPool.filter((item) => !upgradeNames.has(item.name));

    // Calculate active count for this category (proportional distribution)
    const categoryRatio = totalCount / totalItems;
    let activeCount = Math.round(categoryRatio * totalActivesNeeded);

    // Adjust for rounding - make sure we hit exact total
    const remainingToSelect = totalCount;
    const remainingActivesNeeded =
      totalActivesNeeded - selectedItems.filter((i) => i.active).length;

    // Cap at what's available and needed
    const maxActivesInCategory = categoryPool.filter((i) => i.active).length;
    activeCount = Math.min(
      activeCount,
      maxActivesInCategory,
      remainingActivesNeeded,
    );

    // Ensure we don't exceed remaining items
    const inactiveCount = Math.max(0, remainingToSelect - activeCount);

    // Select exactly that many
    const activeItems = getRandomItems(
      categoryPool.filter((i) => i.active),
      activeCount,
    );
    const inactiveItems = getRandomItems(
      categoryPool.filter((i) => !i.active),
      inactiveCount,
    );

    selectedItems.push(...activeItems, ...inactiveItems);
  }

  // Final adjustment: fix active count after rounding
  const finalActives = selectedItems.filter((i) => i.active).length;
  const activeDiff = totalActivesNeeded - finalActives;

  if (activeDiff > 0) {
    // Too few actives - convert some inactives to actives
    const inactives = selectedItems.filter((i) => !i.active);
    const availableActives = pool.filter(
      (i) => i.active && !selectedItems.map((s) => s.name).includes(i.name),
    );
    const toConvert = Math.min(
      activeDiff,
      inactives.length,
      availableActives.length,
    );

    if (toConvert > 0) {
      const newActives = getRandomItems(availableActives, toConvert);
      const remainingInactives = inactives.slice(toConvert);
      selectedItems = [
        ...selectedItems.filter((i) => i.active),
        ...newActives,
        ...remainingInactives,
      ];
    }
  } else if (activeDiff < 0) {
    // Too many actives - convert some to inactives
    const excess = -activeDiff;
    const activeItems = selectedItems.filter((i) => i.active);
    const availableInactives = pool.filter(
      (i) => !i.active && !selectedItems.map((s) => s.name).includes(i.name),
    );
    const toConvert = Math.min(
      excess,
      activeItems.length,
      availableInactives.length,
    );

    if (toConvert > 0) {
      const newInactives = getRandomItems(availableInactives, toConvert);
      const remainingActives = activeItems.slice(toConvert);
      selectedItems = [
        ...remainingActives,
        ...selectedItems.filter((i) => !i.active),
        ...newInactives,
      ];
    }
  }

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

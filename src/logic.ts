import { heroes } from "./dataHeroes";
import { items } from "./dataItems";
import { RandomizerConfig, Item, Hero, ActiveMode, CategoryTierSplit, TierSplit, Tier } from "./types";

function isRandomMode(mode: ActiveMode): boolean {
  return (mode as string) === "random";
}

// Check if tierSplit has any actual values (not just empty object)
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

// Generate random tier split for a category
function generateRandomTierSplit(totalItems: number): TierSplit {
  const tiers: Array<"T1" | "T2" | "T3" | "T4"> = ["T1", "T2", "T3", "T4"];
  const split: TierSplit = { T1: 0, T2: 0, T3: 0, T4: 0 };
  
  // Pure random distribution - NO ROUND ROBIN
  for (let i = 0; i < totalItems; i++) {
    const randomTier = tiers[Math.floor(Math.random() * 4)];
    split[randomTier] = (split[randomTier] || 0) + 1;
  }
  
  return split;
}

// Fill empty tierSplit with random values for categories that have items
function fillRandomTierSplit(tierSplit: CategoryTierSplit | undefined, categorySplit: { Gun?: number; Vitality?: number; Spirit?: number }): CategoryTierSplit {
  if (!tierSplit) {
    tierSplit = {};
  }
  
  // If already has values, return as-is
  if (hasTierValues(tierSplit)) {
    return tierSplit;
  }
  
  // Generate random tier splits for each category with items
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

  // Note: Tier filtering is now done per-category when selecting items

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

  // Get tier split from config (per-category), fill with random if empty
  const tierSplit = fillRandomTierSplit(config.items.tierSplit, config.items.categorySplit || {});

  // FIRST: Pick active items from pool, respecting per-category tierSplit
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

    // If tierSplit is specified per-category, filter actives to respect those limits
    if (tierSplit) {
      // Group by category first
      const categoriesToPickFrom: string[] = [];
      if (gunCount > 0 && tierSplit.Gun) categoriesToPickFrom.push("Gun");
      if (vitalityCount > 0 && tierSplit.Vitality) categoriesToPickFrom.push("Vitality");
      if (spiritCount > 0 && tierSplit.Spirit) categoriesToPickFrom.push("Spirit");
      
      // If no category-specific tier splits, use all available
      if (categoriesToPickFrom.length === 0) {
        // Use all - no tier filtering
      } else {
        // Filter to only categories with tier specs
        const filteredByCategory: Item[] = [];
        for (const cat of categoriesToPickFrom) {
          const catTierSplit = tierSplit[cat as keyof typeof tierSplit];
          if (!catTierSplit) continue;
          
          for (const tier of ["T1", "T2", "T3", "T4"] as const) {
            const tierCount = catTierSplit[tier];
            if (tierCount && tierCount > 0) {
              const tierValue = tier === "T1" ? 800 : tier === "T2" ? 1600 : tier === "T3" ? 3200 : 6400;
              let tierItems = availableActives.filter(i => i.category === cat && i.value === tierValue);
              
              // If not enough items in this tier, try tier-up fallback
              if (tierItems.length < tierCount) {
                const tiersAbove = ["T2", "T3", "T4"];
                const tierIndex = tiersAbove.indexOf(tier);
                for (let i = tierIndex + 1; i < tiersAbove.length; i++) {
                  const higherTier = tiersAbove[i];
                  const higherTierValue = higherTier === "T2" ? 1600 : higherTier === "T3" ? 3200 : 6400;
                  const higherItems = availableActives.filter(x => x.category === cat && x.value === higherTierValue);
                  tierItems = [...tierItems, ...higherItems];
                  if (tierItems.length >= tierCount) break;
                }
              }
              
              // Allow up to tierCount actives from this tier (plus fallbacks)
              const shuffled = getRandomItems(tierItems, tierItems.length);
              filteredByCategory.push(...shuffled.slice(0, Math.min(tierCount, tierItems.length)));
            }
          }
        }
        
        if (filteredByCategory.length > 0) {
          availableActives = filteredByCategory;
        }
      }
    }

    // Shuffle and pick randomly
    const shuffled = getRandomItems(availableActives, availableActives.length);
    const picked = shuffled.slice(0, Math.min(targetActives, availableActives.length));
    activeItems.push(...picked);
  }

  // For Only Actives mode: return only the actives (exactly 4)
  if (isOnlyActives) {
    return { heroes: randomHeroes, items: activeItems };
  }

  // SECOND: Pick inactive items to fill remaining slots, respecting tierSplit
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

    // Get tier split for this category
    const categoryTierSplit = tierSplit?.[category as keyof typeof tierSplit] || { T1: 0, T2: 0, T3: 0, T4: 0 };
    
    // Calculate how many inactive slots per tier
    const tiers: Array<[string, number]> = [
      ["T1", categoryTierSplit.T1 ?? 0],
      ["T2", categoryTierSplit.T2 ?? 0],
      ["T3", categoryTierSplit.T3 ?? 0],
      ["T4", categoryTierSplit.T4 ?? 0],
    ];

    // Count how many active items we have in each tier of this category
    const activeCountByTier: Record<string, number> = { T1: 0, T2: 0, T3: 0, T4: 0 };
    for (const active of activeItems.filter(i => i.category === category)) {
      const tier = getTierFromValue(active.value);
      activeCountByTier[tier]++;
    }

    // Determine inactive slots per tier = total tier slots - active slots
    const inactiveSlotsByTier: Record<string, number> = {};
    for (const [tier, totalTierSlots] of tiers) {
      const activeCount = activeCountByTier[tier];
      inactiveSlotsByTier[tier] = Math.max(0, totalTierSlots - activeCount);
    }

    // Pick inactive items for each tier
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
      
      const tierValue = tier === "T1" ? 800 : tier === "T2" ? 1600 : tier === "T3" ? 3200 : 6400;
      
      let tierPool = fullPool.filter(
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

    // If we still need more items (because tierSplit was null/undefined), fill randomly
    const currentInactives = inactiveItems.length;
    if (currentInactives < inactivesNeededInCategory) {
      const remaining = inactivesNeededInCategory - currentInactives;
      
      // Get remaining items that weren't picked
      const pickedNames = new Set(inactiveItems.map(i => i.name));
      let remainingPool = fullPool.filter(
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

  // Combine active and inactive items
  selectedItems = [...activeItems, ...selectedItems];

  return { heroes: randomHeroes, items: selectedItems };
}

export function getTierFromValue(value: number): "T1" | "T2" | "T3" | "T4" {
  const tierMap: Record<number, "T1" | "T2" | "T3" | "T4"> = {
    [Tier.T1]: "T1",
    [Tier.T2]: "T2",
    [Tier.T3]: "T3",
    [Tier.T4]: "T4",
  };
  return tierMap[value] || "T1";
}

export function isNumber(value: unknown): value is number {
  return typeof value === "number" && !isNaN(value);
}



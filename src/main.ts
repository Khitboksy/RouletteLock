import select from "@inquirer/select";
import number from "@inquirer/number";
import input from "@inquirer/input";
import chalk from "chalk";
import { randomize, getRandomItems } from "./logic.js";
import { items } from "./dataItems.js";
import { ActiveMode, CategorySplit, TierSplit, CategoryTierSplit } from "./types.js";

// Color palette (Catppuccin Mocha)
const colors = {
  text: chalk.hex("#89b4fa"),
  heroes: chalk.hex("#94e2d5"),
  gun: chalk.hex("#fab387"),
  vitality: chalk.hex("#a6e3a1"),
  spirit: chalk.hex("#cba6f7"),
  active: chalk.hex("#f9e2af"),
};

function colorForCategory(category: string): typeof colors.gun {
  return category === "Gun" ? colors.gun :
         category === "Vitality" ? colors.vitality :
         colors.spirit;
}

function formatHeroes(heroes: { name: string }[]): string {
  return heroes.map((h) => colors.heroes(h.name)).join(", ");
}

function formatItems(items: { name: string; category: string; active: boolean }[]): string {
  return items.map((item) => {
    const color = item.category === "Gun" ? colors.gun :
                  item.category === "Vitality" ? colors.vitality :
                  colors.spirit;
    const activeIndicator = item.active ? colors.active(" (active)") : "";
    return color(item.name) + colors.text(activeIndicator);
  }).join("\n");
}

async function askActiveMode(): Promise<ActiveMode> {
  const answer = await select({
    message: "Active items mode?",
    choices: [
      { name: "No Actives", value: "No Actives" },
      { name: "Only Actives", value: "Only Actives" },
      { name: "Mix (specify count)", value: "mix" },
    ],
  });

  if (answer === "mix") {
    // Use input instead of number - allows blank for random, or 0-4 for explicit
    const answerStr = await input({
      message: "How many actives? (0-4, or blank for random)",
    });
    if (answerStr.trim() === "") {
      return "random" as ActiveMode; // special case - will be handled in logic
    }
    const parsed = parseInt(answerStr, 10);
    if (isNaN(parsed)) {
      return "random" as ActiveMode;
    }
    return Math.min(parsed, 4);
  }

  return answer as "No Actives" | "Only Actives";
}

async function askHeroCount(): Promise<number> {
  const result = await number({
    message: "How many heroes? (minimum 3)",
    min: 3,
    max: 10,
    default: 3,
  });
  return result ?? 3;
}

async function askCategoryCount(category: string): Promise<number | null> {
  const result = await input({
    message: `How many ${colorForCategory(category)(category)} items? (0-10, or blank for random)`,
  });
  const trimmed = result.trim();
  if (trimmed === "") return null; // blank = random
  const parsed = parseInt(trimmed, 10);
  if (isNaN(parsed)) return null; // invalid = random
  return Math.min(parsed, 10);
}

async function askTierCounts(category: string, maxItems: number): Promise<TierSplit> {
  const askSingleTier = async (tier: string, max: number): Promise<number | null> => {
    const result = await input({
      message: `  ${colorForCategory(category)(category)} - ${colorForCategory(category)(tier)} count? (max ${max}, enter 0 for none, blank for random)`,
    });
    const trimmed = result.trim();
    if (trimmed === "") return null; // blank = random
    const parsed = parseInt(trimmed, 10);
    if (isNaN(parsed)) return null; // invalid = random
    return Math.min(parsed, max);
  };

  // Ask T1
  const t1 = await askSingleTier("T1", maxItems);
  
  // If T1 fills the quota, remaining tiers get 0
  if (t1 !== null && t1 >= maxItems) {
    return { T1: t1, T2: 0, T3: 0, T4: 0 };
  }

  // Ask T2
  const t2 = await askSingleTier("T2", maxItems - (t1 ?? 0));
  
  // If T1 + T2 fills the quota
  const currentSum = (t1 ?? 0) + (t2 ?? 0);
  if (currentSum >= maxItems) {
    const remaining = maxItems - currentSum;
    return { 
      T1: t1 ?? 0, 
      T2: t2 ?? 0, 
      T3: remaining > 0 ? remaining : 0,
      T4: 0 
    };
  }

  // Ask T3
  const t3 = await askSingleTier("T3", maxItems - currentSum);
  
  // If T1 + T2 + T3 fills the quota
  const currentSum2 = currentSum + (t3 ?? 0);
  if (currentSum2 >= maxItems) {
    const remaining = maxItems - currentSum2;
    return { 
      T1: t1 ?? 0, 
      T2: t2 ?? 0, 
      T3: t3 ?? 0,
      T4: remaining > 0 ? remaining : 0
    };
  }

  // Ask T4
  const t4 = await askSingleTier("T4", maxItems - currentSum2);

// Get final values
  const t1Val = t1 ?? 0;
  const t2Val = t2 ?? 0;
  const t3Val = t3 ?? 0;
  const t4Val = t4 ?? 0;
  const totalSpecified = t1Val + t2Val + t3Val + t4Val;
  
  // If tier sum exceeds maxItems, proportionally prune
  if (totalSpecified > maxItems) {
    const scale = maxItems / totalSpecified;
    return {
      T1: Math.round(t1Val * scale),
      T2: Math.round(t2Val * scale),
      T3: Math.round(t3Val * scale),
      T4: Math.round(t4Val * scale),
    };
  }
  
  const remaining = maxItems - totalSpecified;
  
  if (remaining > 0) {
    // Check if any tiers are blank (null)
    const hasBlanks = (t1 === null || t2 === null || t3 === null || t4 === null);
    
    if (hasBlanks) {
      // Fill blanks with remaining items (100% RANDOM - no round robin)
      const nullIndices: number[] = [];
      if (t1 === null) nullIndices.push(0);
      if (t2 === null) nullIndices.push(1);
      if (t3 === null) nullIndices.push(2);
      if (t4 === null) nullIndices.push(3);
      
      const newValues = [t1Val, t2Val, t3Val, t4Val];
      for (let i = 0; i < remaining; i++) {
        // Pure random - each item randomly assigned to a blank tier
        const randomIdx = nullIndices[Math.floor(Math.random() * nullIndices.length)];
        newValues[randomIdx]++;
      }
      
      return { T1: newValues[0], T2: newValues[1], T3: newValues[2], T4: newValues[3] };
    } else {
      // No blanks - all explicit values
      // Check if all are explicitly zero
      const nonZeroIndices: number[] = [];
      if (t1Val > 0) nonZeroIndices.push(0);
      if (t2Val > 0) nonZeroIndices.push(1);
      if (t3Val > 0) nonZeroIndices.push(2);
      if (t4Val > 0) nonZeroIndices.push(3);
      
      if (nonZeroIndices.length === 0) {
        // All explicit zeros - FULL RANDOM
        const tiers = ["T1", "T2", "T3", "T4"];
        const split: Record<string, number> = { T1: 0, T2: 0, T3: 0, T4: 0 };
        for (let i = 0; i < maxItems; i++) {
          const randomTier = tiers[Math.floor(Math.random() * 4)];
          split[randomTier]++;
        }
        return { T1: split.T1, T2: split.T2, T3: split.T3, T4: split.T4 };
      } else {
        // Some non-zero values - increment non-zero round-robin
        // Shuffle non-zero indices
        for (let i = nonZeroIndices.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [nonZeroIndices[i], nonZeroIndices[j]] = [nonZeroIndices[j], nonZeroIndices[i]];
        }
        
        const newValues = [t1Val, t2Val, t3Val, t4Val];
        for (let i = 0; i < remaining; i++) {
          newValues[nonZeroIndices[i % nonZeroIndices.length]]++;
        }
        
        return { T1: newValues[0], T2: newValues[1], T3: newValues[2], T4: newValues[3] };
      }
    }
  }

return { T1: t1Val, T2: t2Val, T3: t3Val, T4: t4Val };
}

async function main() {
  console.log("=== Deadlock Randomizer ===\n");

  const activeMode = await askActiveMode();
  const heroCount = await askHeroCount();

  // Only Actives mode - skip category/tier prompts, output 4 random actives
  if (activeMode === "Only Actives") {
    // Pure random: pick 4 random active items from entire pool
    // NO ROUND ROBIN - completely random, could get 4 T4 Spirit items
    const allActives = items.filter((item) => item.active);
    const pickedActives = getRandomItems(allActives, 4);
    
    // Get random heroes
    const result = randomize({ heroCount, items: { totalItems: 0, activeMode: "No Actives" } });

    // Sort items by category then tier
    const sortedItems = [...pickedActives].sort((a, b) => {
      const catOrder = { Gun: 1, Vitality: 2, Spirit: 3 };
      const catDiff = catOrder[a.category as keyof typeof catOrder] - catOrder[b.category as keyof typeof catOrder];
      if (catDiff !== 0) return catDiff;
      return a.value - b.value;
    });

    console.log(colors.text("\n=== Results ==="));
    console.log(colors.text("Heroes: ") + formatHeroes(result.heroes));
    console.log(colors.text("Items:"));
    const itemsFormatted = formatItems(sortedItems).split("\n").map((line) => "  " + line).join("\n");
    console.log(itemsFormatted);
    return;
  }

  // First pass: Category counts
  console.log("\n--- Category Selection ---\n");
  const gunCountInput = await askCategoryCount("Gun");
  const vitalityCountInput = await askCategoryCount("Vitality");
  const spiritCountInput = await askCategoryCount("Spirit");

  // If all blank, random distribution (1-12 total items, distributed randomly)
  // If some blank, those become random, others use specified value
  
  const isAllRandom = gunCountInput === null && vitalityCountInput === null && spiritCountInput === null;
  
  // Initialize tierSplit early so we can modify it when adding extra items
  let tierSplit: CategoryTierSplit = {};
  
  let finalGun = 0;
  let finalVit = 0;
  let finalSpirit = 0;
  let totalItems = 0;

  if (isAllRandom) {
    // Completely random - 1 to 12 items total, distributed randomly across categories
    totalItems = Math.floor(Math.random() * 12) + 1; // 1-12 items
    // Ensure total >= active count
    if (activeMode !== "No Actives" && totalItems < 4) {
      totalItems = 4; // Minimum 4 when actives are involved
    }
    
    // Distribute randomly across categories
    let remaining = totalItems;
    finalGun = Math.floor(Math.random() * (remaining + 1));
    remaining = totalItems - finalGun;
    finalVit = Math.floor(Math.random() * (remaining + 1));
    finalSpirit = remaining - finalVit;
  } else {
    // Some categories specified - use randomCategoryCount for unspecified
    const randomCategoryCount = () => Math.floor(Math.random() * 4) + 3; // 3-6 items
    
    const gunCount = gunCountInput ?? randomCategoryCount();
    const vitalityCount = vitalityCountInput ?? randomCategoryCount();
    const spiritCount = spiritCountInput ?? randomCategoryCount();

    // Cap at 12 items total, but ensure minimum equals active count
    totalItems = gunCount + vitalityCount + spiritCount;
    
    // Ensure total >= active count
    if (activeMode !== "No Actives" && totalItems < (typeof activeMode === "number" ? activeMode : 4)) {
      // Distribute additional items to meet minimum
      const minItems = typeof activeMode === "number" ? activeMode : 4;
      const diff = minItems - totalItems;
      
      // Add to categories and randomize their tier splits
      if (gunCount > 0) {
        finalGun = gunCount + Math.ceil(diff / 2);
        // Add random tier counts for the extra items
        if (tierSplit.Gun) {
          const extraTiers = Math.ceil(diff / 2);
          const randomExtraTier = Math.floor(Math.random() * 4); // 0-3 = T1-T4
          const tierKeys: Array<"T1" | "T2" | "T3" | "T4"> = ["T1", "T2", "T3", "T4"];
          tierSplit.Gun[tierKeys[randomExtraTier]] = (tierSplit.Gun[tierKeys[randomExtraTier]] ?? 0) + extraTiers;
        }
      }
      if (vitalityCount > 0) {
        finalVit = vitalityCount + Math.floor(diff / 2);
        if (tierSplit.Vitality) {
          const extraTiers = Math.floor(diff / 2);
          const randomExtraTier = Math.floor(Math.random() * 4);
          const tierKeys: Array<"T1" | "T2" | "T3" | "T4"> = ["T1", "T2", "T3", "T4"];
          tierSplit.Vitality[tierKeys[randomExtraTier]] = (tierSplit.Vitality[tierKeys[randomExtraTier]] ?? 0) + extraTiers;
        }
      }
      if (spiritCount > 0) {
        finalSpirit = spiritCount + (diff % 2);
        if (tierSplit.Spirit) {
          const extraTiers = diff % 2;
          const randomExtraTier = Math.floor(Math.random() * 4);
          const tierKeys: Array<"T1" | "T2" | "T3" | "T4"> = ["T1", "T2", "T3", "T4"];
          tierSplit.Spirit[tierKeys[randomExtraTier]] = (tierSplit.Spirit[tierKeys[randomExtraTier]] ?? 0) + extraTiers;
        }
      }
      totalItems = minItems;
    }
    
    if (totalItems > 12) {
      // Reduce proportionally
      const scale = 12 / totalItems;
      totalItems = 12;
      // Distribute 12 items across categories proportionally
      finalGun = Math.round(gunCount * scale);
      finalVit = Math.round(vitalityCount * scale);
      finalSpirit = totalItems - finalGun - finalVit;
    } else {
      // Use the values from category inputs
      finalGun = gunCount;
      finalVit = vitalityCount;
      finalSpirit = spiritCount;
    }
  }

  const categorySplit: CategorySplit = {
    Gun: finalGun,
    Vitality: finalVit,
    Spirit: finalSpirit,
  };

  // Second pass: Tier counts (only for categories with items)
  console.log("\n--- Tier Selection ---\n");

  if (finalGun > 0) {
    console.log(`(Gun items: ${finalGun})`);
    const gunTier = await askTierCounts("Gun", finalGun);
    if (gunTier) tierSplit.Gun = gunTier;
  }

  if (finalVit > 0) {
    console.log(`(Vitality items: ${finalVit})`);
    const vitalityTier = await askTierCounts("Vitality", finalVit);
    if (vitalityTier) tierSplit.Vitality = vitalityTier;
  }

  if (finalSpirit > 0) {
    console.log(`(Spirit items: ${finalSpirit})`);
    const spiritTier = await askTierCounts("Spirit", finalSpirit);
    if (spiritTier) tierSplit.Spirit = spiritTier;
  }

  const result = randomize({
    heroCount,
    items: {
      totalItems: totalItems,
      categorySplit,
      tierSplit: tierSplit || undefined,
      activeMode,
    },
  });

  // Sort items by category then tier
  const sortedItems = [...result.items].sort((a, b) => {
    // Category order: Gun, Vitality, Spirit
    const catOrder = { Gun: 1, Vitality: 2, Spirit: 3 };
    const catDiff = catOrder[a.category as keyof typeof catOrder] - catOrder[b.category as keyof typeof catOrder];
    if (catDiff !== 0) return catDiff;
    // Within category, sort by tier (value: 800, 1600, 3200, 6400)
    return a.value - b.value;
  });

  console.log(colors.text("\n=== Results ==="));
  console.log(colors.text("Heroes: ") + formatHeroes(result.heroes));
  console.log(colors.text("Items:"));
  const itemsFormatted = formatItems(sortedItems).split("\n").map((line) => "  " + line).join("\n");
  console.log(itemsFormatted);
}

main();
import select from "@inquirer/select";
import number from "@inquirer/number";
import input from "@inquirer/input";
import chalk from "chalk";
import { randomize } from "./logic.js";
import { ActiveMode, CategorySplit, TierSplit } from "./types.js";

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

async function askTierCounts(category: string, maxItems: number): Promise<TierSplit | null> {
  const askSingleTier = async (tier: string, max: number): Promise<number | null> => {
    const result = await input({
      message: `  ${colorForCategory(category)(category)} - ${colorForCategory(category)(tier)} count? (max ${max}, blank for random)`,
    });
    if (result.trim() === "") return null;
    const parsed = parseInt(result, 10);
    if (isNaN(parsed)) return null;
    return Math.min(parsed, max);
  };

  // Ask T1
  const t1 = await askSingleTier("T1", maxItems);
  
  // If T1 fills the quota, no need to ask for more
  if (t1 === maxItems) {
    return { T1: t1 };
  }

  // Ask T2
  const t2 = await askSingleTier("T2", maxItems - (t1 ?? 0));
  
  // If T1 + T2 fills the quota
  const currentSum = (t1 ?? 0) + (t2 ?? 0);
  if (currentSum === maxItems) {
    return {
      ...(t1 !== null && { T1: t1 }),
      ...(t2 !== null && { T2: t2 }),
    };
  }

  // Ask T3
  const t3 = await askSingleTier("T3", maxItems - currentSum);
  
  // If T1 + T2 + T3 fills the quota
  const currentSum2 = currentSum + (t3 ?? 0);
  if (currentSum2 === maxItems) {
    return {
      ...(t1 !== null && { T1: t1 }),
      ...(t2 !== null && { T2: t2 }),
      ...(t3 !== null && { T3: t3 }),
    };
  }

  // Ask T4
  const t4 = await askSingleTier("T4", maxItems - currentSum2);

  // If all blank, return null (random)
  if (t1 === null && t2 === null && t3 === null && t4 === null) {
    return null;
  }

  return {
    ...(t1 !== null && { T1: t1 }),
    ...(t2 !== null && { T2: t2 }),
    ...(t3 !== null && { T3: t3 }),
    ...(t4 !== null && { T4: t4 }),
  };
}

function calculateTotal(categorySplit: CategorySplit): number {
  let total = 0;
  if (categorySplit.Gun) total += categorySplit.Gun;
  if (categorySplit.Vitality) total += categorySplit.Vitality;
  if (categorySplit.Spirit) total += categorySplit.Spirit;
  return total;
}

async function main() {
  console.log("=== Deadlock Randomizer ===\n");

  const activeMode = await askActiveMode();
  const heroCount = await askHeroCount();

  // Only Actives mode - skip category/tier prompts, output 4 actives max
  if (activeMode === "Only Actives") {
    // For Only Actives, we want exactly 4 items (all active)
    const totalItems = 4;
    const result = randomize({
      heroCount,
      items: {
        totalItems,
        categorySplit: {
          Gun: Math.floor(totalItems / 3) || 1,
          Vitality: Math.floor(totalItems / 3) || 1,
          Spirit: totalItems - Math.floor(totalItems / 3) * 2 || 1,
        },
        activeMode: "Only Actives",
      },
    });

    // Sort items by category then tier
    const sortedItems = [...result.items].sort((a, b) => {
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
  
  let finalGun: number;
  let finalVit: number;
  let finalSpirit: number;
  let totalItems: number;

  if (isAllRandom) {
    // Completely random - 1 to 12 items total, distributed randomly across categories
    totalItems = Math.floor(Math.random() * 12) + 1; // 1-12 items
    
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

    // Cap at 12 items total
    totalItems = gunCount + vitalityCount + spiritCount;
    
    if (totalItems > 12) {
      // Reduce proportionally
      const scale = 12 / totalItems;
      totalItems = 12;
      // Distribute 12 items across categories proportionally
      finalGun = Math.round(gunCount * scale);
      finalVit = Math.round(vitalityCount * scale);
      finalSpirit = totalItems - finalGun - finalVit;
    } else {
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

  let tierSplit: TierSplit | undefined;

  if (finalGun > 0) {
    console.log(`(Gun items: ${finalGun})`);
    const gunTier = await askTierCounts("Gun", finalGun);
    if (gunTier) tierSplit = { ...tierSplit, ...gunTier };
  }

  if (finalVit > 0) {
    console.log(`(Vitality items: ${finalVit})`);
    const vitalityTier = await askTierCounts("Vitality", finalVit);
    if (vitalityTier) tierSplit = { ...tierSplit, ...vitalityTier };
  }

  if (finalSpirit > 0) {
    console.log(`(Spirit items: ${finalSpirit})`);
    const spiritTier = await askTierCounts("Spirit", finalSpirit);
    if (spiritTier) tierSplit = { ...tierSplit, ...spiritTier };
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
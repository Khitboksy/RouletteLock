import { randomize } from "./logic";

const result = randomize({
  heroCount: 3,
  items: {
    totalItems: 7,
    categorySplit: { Spirit: 3, Gun: 3, Vitality: 1 },
    activeMode: 3,
  },
});

console.log(
  "Heroes:",
  result.heroes.map((h) => h.name),
);
console.log(
  "Items:",
  result.items.map((i) => i.name),
);

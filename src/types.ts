export interface Hero {
  name: string;
  roles: string[];
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

export const Category = {
  Gun: "Gun",
  Vitality: "Vitality",
  Spirit: "Spirit",
} as const;

export const Tier = {
  T1: 800,
  T2: 1600,
  T3: 3200,
  T4: 6400,
} as const;

export const defaultItem = {
  active: false,
  upgradesTo: [],
  upgradesFrom: [],
} as const;

export type CategoryType = (typeof Category)[keyof typeof Category];

export type TierSplit = {
  T1?: number;
  T2?: number;
  T3?: number;
  T4?: number;
};

// Per-category tier splits
export type CategoryTierSplit = {
  Gun?: TierSplit;
  Vitality?: TierSplit;
  Spirit?: TierSplit;
};

export type ActiveMode = "No Actives" | "Only Actives" | "random" | number;

export interface CategorySplit {
  Gun?: number;
  Vitality?: number;
  Spirit?: number;
}

export interface ItemRandomizerConfig {
  totalItems: number;
  categorySplit?: CategorySplit; // Optional - if blank, random distribution
  tierSplit?: CategoryTierSplit; // Per-category tier splits
  activeMode: ActiveMode;
  types?: string[];
}

export interface RandomizerConfig {
  heroCount: number;
  items: ItemRandomizerConfig;
  // Future: opt-in role/type-based filtering
  // When set, only heroes with ANY matching role are selected
  heroRoles?: string[];
  // When set, only items with ANY matching type tag are selected
  // (applied IN ADDITION to the item-level type filtering in ItemRandomizerConfig)
  itemTypes?: string[];
}

import { Item, Category, Tier, defaultItem } from "../types";

export const items: Item[] = [
  // =-=-=-=-=-=  -T1-  =-=-=-=-=-= \\
  {
    ...defaultItem,
    name: "Close Quarters",
    category: Category.Gun,
    value: Tier.T1,
    type: ["Damage"],
    upgradesTo: ["Point Blank"],
  },

  {
    ...defaultItem,
    name: "Extended Magazine",
    category: Category.Gun,
    value: Tier.T1,
    type: ["Damage"],
    upgradesTo: ["Titanic Magazine", "Escalating Resilience"],
  },

  {
    ...defaultItem,
    name: "Headshot Booster",
    category: Category.Gun,
    value: Tier.T1,
    type: ["Damage"],
    upgradesTo: ["Headhunter"],
  },

  {
    ...defaultItem,
    name: "High Velocity Rounds",
    category: Category.Gun,
    value: Tier.T1,
    type: ["Damage"],
    upgradesTo: ["Opening Rounds", "Express Shot", "Armor Piercing Rounds"],
  },

  {
    ...defaultItem,
    name: "Monster Rounds",
    category: Category.Gun,
    value: Tier.T1,
    type: ["Damage", "Economy"],
    upgradesTo: ["Cultist Sacrifice"],
  },

  {
    ...defaultItem,
    name: "Rapid Rounds",
    category: Category.Gun,
    value: Tier.T1,
    type: ["Damage"],
    upgradesTo: ["Swift Striker", "Burst Fire"],
  },

  {
    ...defaultItem,
    name: "Restorative Shot",
    category: Category.Gun,
    value: Tier.T1,
    type: ["Damage", "Healing"],
  },

  {
    ...defaultItem,
    name: "Extra Health",
    category: Category.Vitality,
    value: Tier.T1,
    type: ["Health"],
    upgradesTo: ["Fortitude", "Colossus"],
  },

  {
    ...defaultItem,
    name: "Extra Regen",
    category: Category.Vitality,
    value: Tier.T1,
    type: ["Healing"],
    upgradesTo: ["Healing Booster"],
  },

  {
    ...defaultItem,
    name: "Extra Stamina",
    category: Category.Vitality,
    value: Tier.T1,
    type: ["Mobility"],
    upgradesTo: ["Kinetic Dash", "Arcane Surge", "Stamina Mastery"],
  },

  {
    ...defaultItem,
    name: "Healing Rite",
    category: Category.Vitality,
    value: Tier.T1,
    type: ["Healing"],
    active: true,
    upgradesTo: ["Healing Nova", "Rescue Beam"],
  },

  {
    ...defaultItem,
    name: "Melee Lifesteal",
    category: Category.Vitality,
    value: Tier.T1,
    type: ["Healing"],
    upgradesTo: ["Lifestrike"],
  },

  {
    ...defaultItem,
    name: "Rebuttal",
    category: Category.Vitality,
    value: Tier.T1,
    type: ["Resistance", "Utility"],
  },

  {
    ...defaultItem,
    name: "Sprint Boots",
    category: Category.Vitality,
    value: Tier.T1,
    type: ["Mobility"],
    upgradesTo: ["Enduring Speed", "Trophy Collector"],
  },

  {
    ...defaultItem,
    name: "Extra Charge",
    category: Category.Spirit,
    value: Tier.T1,
    type: ["Abilities"],
    upgradesTo: ["Rapid Recharge"],
  },

  {
    ...defaultItem,
    name: "Extra Spirit",
    category: Category.Spirit,
    value: Tier.T1,
    type: ["Abilities", "Damage"],
    upgradesTo: ["Improved Spirit", "Surge of Power"],
  },

  {
    ...defaultItem,
    name: "Golden Goose Egg",
    category: Category.Spirit,
    value: Tier.T1,
    type: ["Economy", "Damage Reduction"],
    active: true,
  },

  {
    ...defaultItem,
    name: "Mystic Burst",
    category: Category.Spirit,
    value: Tier.T1,
    type: ["Abilities", "Damage"],
    upgradesTo: ["Tankbuster"],
  },

  {
    ...defaultItem,
    name: "Mystic Expansion",
    category: Category.Spirit,
    value: Tier.T1,
    type: ["Abilities", "Imbued"],
    upgradesTo: ["Greater Expansion"],
  },

  {
    ...defaultItem,
    name: "Mystic Regeneration",
    category: Category.Spirit,
    value: Tier.T1,
    type: ["Healing"],
    upgradesTo: ["Radiant Regeneration"],
  },

  {
    ...defaultItem,
    name: "Rusted Barrel",
    category: Category.Spirit,
    value: Tier.T1,
    type: ["Utility", "Damage Reduction", "Debuff"],
    active: true,
    upgradesTo: ["Disarming Hex"],
  },

  {
    ...defaultItem,
    name: "Spirit Strike",
    category: Category.Spirit,
    value: Tier.T1,
    type: ["Damage", "Shred", "Debuff"],
    upgradesTo: ["Spirit Snatch"],
  },

  // =-=-=-=-=-=  -T2-  =-=-=-=-=-= \\
  {
    ...defaultItem,
    name: "Active Reload",
    category: Category.Gun,
    value: Tier.T2,
    type: ["Damage"],
  },

  {
    ...defaultItem,
    name: "Fleetfoot",
    category: Category.Gun,
    value: Tier.T2,
    type: ["Mobility"],
    active: true,
  },

  {
    ...defaultItem,
    name: "Intensifying Magazine",
    category: Category.Gun,
    value: Tier.T2,
    type: ["Damage"],
  },

  {
    ...defaultItem,
    name: "Kinetic Dash",
    category: Category.Gun,
    value: Tier.T2,
    type: ["Damage", "Mobility"],
    upgradesFrom: ["Extra Stamina"],
  },

  {
    ...defaultItem,
    name: "Long Range",
    category: Category.Gun,
    value: Tier.T2,
    type: ["Damage"],
    upgradesTo: ["Sharpshooter"],
  },

  {
    ...defaultItem,
    name: "Melee Charge",
    category: Category.Gun,
    value: Tier.T2,
    type: ["Damage"],
    upgradesTo: ["Crushing Fists"],
  },

  {
    ...defaultItem,
    name: "Mystic Shot",
    category: Category.Gun,
    value: Tier.T2,
    type: ["Damage"],
  },

  {
    ...defaultItem,
    name: "Opening Rounds",
    category: Category.Gun,
    value: Tier.T2,
    type: ["Damage"],
    upgradesFrom: ["High Velocity Rounds"],
  },

  {
    ...defaultItem,
    name: "Recharging Rush",
    category: Category.Gun,
    value: Tier.T2,
    type: ["Damage", "Abilities", "Utility"],
  },

  {
    ...defaultItem,
    name: "Slowing Bullets",
    category: Category.Gun,
    value: Tier.T2,
    type: ["Damage", "Utility", "Soft CC", "Debuff"],
    upgradesTo: ["Weighted Shots"],
  },

  {
    ...defaultItem,
    name: "Spirit Shredder Bullets",
    category: Category.Gun,
    value: Tier.T2,
    type: ["Shred", "Debuff"],
    upgradesTo: ["Spirit Rend"],
  },

  {
    ...defaultItem,
    name: "Split Shot",
    category: Category.Gun,
    value: Tier.T2,
    type: ["Damage"],
    active: true,
  },

  {
    ...defaultItem,
    name: "Stalker",
    category: Category.Gun,
    value: Tier.T2,
    type: ["Damage", "DOT", "Shred", "Debuff"],
  },

  {
    ...defaultItem,
    name: "Swift Striker",
    category: Category.Gun,
    value: Tier.T2,
    type: ["Damage"],
    upgradesFrom: ["Rapid Rounds"],
  },

  {
    ...defaultItem,
    name: "Titanic Magazine",
    category: Category.Gun,
    value: Tier.T2,
    type: ["Damage"],
    upgradesFrom: ["Extended Magazine"],
  },

  {
    ...defaultItem,
    name: "Weakening Headshot",
    category: Category.Gun,
    value: Tier.T2,
    type: ["Shred", "Debuff"],
    upgradesTo: ["Crippling Headshot"],
  },

  {
    ...defaultItem,
    name: "Battle Vest",
    category: Category.Vitality,
    value: Tier.T2,
    type: ["Resistance", "Damage"],
  },

  {
    ...defaultItem,
    name: "Bullet Lifesteal",
    category: Category.Vitality,
    value: Tier.T2,
    type: ["Lifesteal"],
    upgradesTo: ["Fury Trance", "Vampiric Burst", "Leech"],
  },

  {
    ...defaultItem,
    name: "Debuff Reducer",
    category: Category.Vitality,
    value: Tier.T2,
    type: ["Resistance"],
    upgradesTo: ["Unstoppable", "Spellbreaker"],
  },

  {
    ...defaultItem,
    name: "Enchanter's Emblem",
    category: Category.Vitality,
    value: Tier.T2,
    type: ["Resistance", "Damage"],
  },

  {
    ...defaultItem,
    name: "Enduring Speed",
    category: Category.Vitality,
    value: Tier.T2,
    type: ["Mobility"],
    upgradesTo: ["Juggernaut"],
    upgradesFrom: ["Sprint Boots"],
  },

  {
    ...defaultItem,
    name: "Guardian Ward",
    category: Category.Vitality,
    value: Tier.T2,
    type: ["Utility", "Shields"],
    active: true,
    upgradesTo: ["Divine Barrier"],
  },

  {
    ...defaultItem,
    name: "Healbane",
    category: Category.Vitality,
    value: Tier.T2,
    type: ["Anti-Heal", "Debuff"],
  },

  {
    ...defaultItem,
    name: "Healing Booster",
    category: Category.Vitality,
    value: Tier.T2,
    type: ["Healing"],
    upgradesTo: ["Healing Tempo"],
    upgradesFrom: ["Extra Regen"],
  },

  {
    ...defaultItem,
    name: "Reactive Barrier",
    category: Category.Vitality,
    value: Tier.T2,
    type: ["Shields"],
    upgradesTo: ["Indomitable"],
  },

  {
    ...defaultItem,
    name: "Restorative Locket",
    category: Category.Vitality,
    value: Tier.T2,
    type: ["Healing"],
    active: true,
  },

  {
    ...defaultItem,
    name: "Return Fire",
    category: Category.Vitality,
    value: Tier.T2,
    type: ["Utility", "Resistance"],
    active: true,
  },

  {
    ...defaultItem,
    name: "Spirit Lifesteal",
    category: Category.Vitality,
    value: Tier.T2,
    type: ["Lifesteal"],
    upgradesTo: ["Infuser", "Leech"],
  },

  {
    ...defaultItem,
    name: "Spirit Shielding",
    category: Category.Vitality,
    value: Tier.T2,
    type: ["Shields"],
  },

  {
    ...defaultItem,
    name: "Trophy Collector",
    category: Category.Vitality,
    value: Tier.T2,
    type: ["Economy"],
    upgradesFrom: ["Sprint Boots"],
  },

  {
    ...defaultItem,
    name: "Weapon Shielding",
    category: Category.Vitality,
    value: Tier.T2,
    type: ["Shields"],
  },

  {
    ...defaultItem,
    name: "Arcane Surge",
    category: Category.Spirit,
    value: Tier.T2,
    type: ["Abilities", "Mobility"],
    upgradesFrom: ["Extra Stamina"],
  },

  {
    ...defaultItem,
    name: "Bullet Resist Shredder",
    category: Category.Spirit,
    value: Tier.T2,
    type: ["Shred", "Debuff"],
  },

  {
    ...defaultItem,
    name: "Cold Front",
    category: Category.Spirit,
    value: Tier.T2,
    type: ["Damage"],
    active: true,
    upgradesTo: ["Arctic Blast"],
  },

  {
    ...defaultItem,
    name: "Compress Cooldown",
    category: Category.Spirit,
    value: Tier.T2,
    type: ["Abilities", "Imbued"],
    upgradesTo: ["Superior Cooldown"],
  },

  {
    ...defaultItem,
    name: "Duration Extender",
    category: Category.Spirit,
    value: Tier.T2,
    type: ["Abilities", "Imbued"],
    upgradesTo: ["Superior Duration"],
  },

  {
    ...defaultItem,
    name: "Improved Spirit",
    category: Category.Spirit,
    value: Tier.T2,
    type: ["Abilities", "Damage"],
    upgradesTo: ["Boundless Spirit"],
    upgradesFrom: ["Extra Spirit"],
  },

  {
    ...defaultItem,
    name: "Mystic Slow",
    category: Category.Spirit,
    value: Tier.T2,
    type: ["Utility", "Soft CC", "Debuff"],
    upgradesTo: ["Lightning Scroll"],
  },

  {
    ...defaultItem,
    name: "Mystic Vulnerability",
    category: Category.Spirit,
    value: Tier.T2,
    type: ["Shred", "Debuff"],
    upgradesTo: ["Escalating Exposure"],
  },

  {
    ...defaultItem,
    name: "Quicksilver Reload",
    category: Category.Spirit,
    value: Tier.T2,
    type: ["Damage", "Imbued"],
    upgradesTo: ["Mercurial Magnum"],
  },

  {
    ...defaultItem,
    name: "Slowing Hex",
    category: Category.Spirit,
    value: Tier.T2,
    type: ["Utility", "Soft CC", "Debuff"],
    active: true,
    upgradesTo: ["Vortex Web"],
  },

  {
    ...defaultItem,
    name: "Spirit Sap",
    category: Category.Spirit,
    value: Tier.T2,
    type: ["Shred", "Damage Reduction", "Debuff"],
    active: true,
    upgradesTo: ["Focus Lens"],
  },

  {
    ...defaultItem,
    name: "Supressor",
    category: Category.Spirit,
    value: Tier.T2,
    type: ["Damage Reduction", "Debuff"],
  },

  // =-=-=-=-=-=  -T3-  =-=-=-=-=-= \\
  {
    ...defaultItem,
    name: "Alchemical Fire",
    category: Category.Gun,
    value: Tier.T3,
    type: ["Damage", "DOT", "Shred", "Debuff"],
    active: true,
  },

  {
    ...defaultItem,
    name: "Ballistic Enchantment",
    category: Category.Gun,
    value: Tier.T3,
    type: ["Abilities", "Imbued"],
  },

  {
    ...defaultItem,
    name: "Berserker",
    category: Category.Gun,
    value: Tier.T3,
    type: ["Damage"],
  },

  {
    ...defaultItem,
    name: "Blood Tribute",
    category: Category.Gun,
    value: Tier.T3,
    type: ["Damage", "Resistance"],
    active: true,
  },

  {
    ...defaultItem,
    name: "Burst Fire",
    category: Category.Gun,
    value: Tier.T3,
    type: ["Damage"],
    upgradesFrom: ["Rapid Rounds"],
  },

  {
    ...defaultItem,
    name: "Cultist Sacrifice",
    category: Category.Gun,
    value: Tier.T3,
    type: ["Damage", "Economy"],
    active: true,
    upgradesFrom: ["Monster Rounds"],
  },

  {
    ...defaultItem,
    name: "Escalating Resilience",
    category: Category.Gun,
    value: Tier.T3,
    type: ["Damage", "Resistance"],
    upgradesFrom: ["Extended Magazine"],
  },

  {
    ...defaultItem,
    name: "Express Shot",
    category: Category.Gun,
    value: Tier.T3,
    type: ["Damage"],
    upgradesFrom: ["High Velocity Rounds"],
  },

  {
    ...defaultItem,
    name: "Headhunter",
    category: Category.Gun,
    value: Tier.T3,
    type: ["Damage"],
    upgradesFrom: ["Headshot Booster"],
  },

  {
    ...defaultItem,
    name: "Heroic Aura",
    category: Category.Gun,
    value: Tier.T3,
    type: ["Damage", "Utility"],
    active: true,
  },

  {
    ...defaultItem,
    name: "Hollow Point",
    category: Category.Gun,
    value: Tier.T3,
    type: ["Damage", "Shred", "Debuff"],
  },

  {
    ...defaultItem,
    name: "Hunter's Aura",
    category: Category.Gun,
    value: Tier.T3,
    type: ["Damage", "Shred", "Debuff"],
  },

  {
    ...defaultItem,
    name: "Point Blank",
    category: Category.Gun,
    value: Tier.T3,
    type: ["Damage"],
    upgradesFrom: ["Close Quarters"],
  },

  {
    ...defaultItem,
    name: "Shadow Weave",
    category: Category.Gun,
    value: Tier.T3,
    type: ["Utility"],
    active: true,
  },

  {
    ...defaultItem,
    name: "Sharpshooter",
    category: Category.Gun,
    value: Tier.T3,
    type: ["Damage"],
    upgradesFrom: ["Long Range"],
  },

  {
    ...defaultItem,
    name: "Spirit Rend",
    category: Category.Gun,
    value: Tier.T3,
    type: ["Shred", "Debuff"],
    upgradesFrom: ["Spirit Shredder Bullets"],
  },

  {
    ...defaultItem,
    name: "Tesla Bullets",
    category: Category.Gun,
    value: Tier.T3,
    type: ["Damage"],
    upgradesTo: ["Capacitor"],
  },

  {
    ...defaultItem,
    name: "Toxic Bullets",
    category: Category.Gun,
    value: Tier.T3,
    type: ["Damage", "Anti-Heal", "DOT", "Debuff"],
  },

  {
    ...defaultItem,
    name: "Weighted Shots",
    category: Category.Gun,
    value: Tier.T3,
    type: ["Damage", "Resistance", "Utility", "Soft CC", "Debuff"],
    upgradesFrom: ["Slowing Bullets"],
  },

  {
    ...defaultItem,
    name: "Bullet Resilience",
    category: Category.Vitality,
    value: Tier.T3,
    type: ["Resistance"],
  },

  {
    ...defaultItem,
    name: "Counterspell",
    category: Category.Vitality,
    value: Tier.T3,
    type: ["Resistance", "Utility"],
  },

  {
    ...defaultItem,
    name: "Dispell Magic",
    category: Category.Vitality,
    value: Tier.T3,
    type: ["Utility"],
    active: true,
  },

  {
    ...defaultItem,
    name: "Fortitude",
    category: Category.Vitality,
    value: Tier.T3,
    type: ["Health", "Healing"],
    upgradesFrom: ["Extra Health"],
  },

  {
    ...defaultItem,
    name: "Fury Trance",
    category: Category.Vitality,
    value: Tier.T3,
    type: ["Lifesteal", "Resistance", "Damage"],
    active: true,
    upgradesFrom: ["Bullet Lifesteal"],
  },

  {
    ...defaultItem,
    name: "Healing Nova",
    category: Category.Vitality,
    value: Tier.T3,
    type: ["Healing"],
    active: true,
    upgradesFrom: ["Healing Rite"],
  },

  {
    ...defaultItem,
    name: "Lifestrike",
    category: Category.Vitality,
    value: Tier.T3,
    type: ["Healing", "Damage"],
    upgradesTo: ["Melee Lifesteal"],
  },

  {
    ...defaultItem,
    name: "Majestic Leap",
    category: Category.Vitality,
    value: Tier.T3,
    type: ["Mobility"],
    active: true,
  },

  {
    ...defaultItem,
    name: "Metal Skin",
    category: Category.Vitality,
    value: Tier.T3,
    type: ["Resistance", "Utility"],
    active: true,
  },

  {
    ...defaultItem,
    name: "Rescue Beam",
    category: Category.Vitality,
    value: Tier.T3,
    type: ["Healing"],
    active: true,
    upgradesFrom: ["Healing Rite"],
  },

  {
    ...defaultItem,
    name: "Spirit Resilience",
    category: Category.Vitality,
    value: Tier.T3,
    type: ["Resistance"],
  },

  {
    ...defaultItem,
    name: "Stamina Mastery",
    category: Category.Vitality,
    value: Tier.T3,
    type: ["Mobility"],
    upgradesFrom: ["Extra Stamina"],
  },

  {
    ...defaultItem,
    name: "Veil Walker",
    category: Category.Vitality,
    value: Tier.T3,
    type: ["Utility"],
  },

  {
    ...defaultItem,
    name: "Warp Stone",
    category: Category.Vitality,
    value: Tier.T3,
    type: ["Mobility", "Utility"],
    active: true,
  },

  {
    ...defaultItem,
    name: "Decay",
    category: Category.Spirit,
    value: Tier.T3,
    type: ["Anti-Heal", "DOT", "Utility", "Debuff"],
    active: true,
  },

  {
    ...defaultItem,
    name: "Disarming Hex",
    category: Category.Spirit,
    value: Tier.T3,
    type: ["Disarm", "Utility", "Debuff"],
    active: true,
  },

  {
    ...defaultItem,
    name: "Greater Expansion",
    category: Category.Spirit,
    value: Tier.T3,
    type: ["Abilities"],
    upgradesFrom: ["Mystic Expansion"],
  },

  {
    ...defaultItem,
    name: "Knockdown",
    category: Category.Spirit,
    value: Tier.T3,
    type: ["Hard CC", "Utility", "Debuff"],
    active: true,
  },

  {
    ...defaultItem,
    name: "Radiant Regeneration",
    category: Category.Spirit,
    value: Tier.T3,
    type: ["Healing"],
    upgradesFrom: ["Mystic Regeneration"],
  },

  {
    ...defaultItem,
    name: "Rapid Recharge",
    category: Category.Spirit,
    value: Tier.T3,
    type: ["Abilities"],
    upgradesFrom: ["Extra Charge"],
  },

  {
    ...defaultItem,
    name: "Silence Wave",
    category: Category.Spirit,
    value: Tier.T3,
    type: ["Damage", "Utility", "Debuff", "Silence"],
    active: true,
  },

  {
    ...defaultItem,
    name: "Spirit Snatch",
    category: Category.Spirit,
    value: Tier.T3,
    type: ["Shred", "Damage Reduction", "Debuff"],
    upgradesFrom: ["Spirit Strike"],
  },

  {
    ...defaultItem,
    name: "Superior Cooldown",
    category: Category.Spirit,
    value: Tier.T3,
    type: ["Abilities"],
    upgradesTo: ["Transcendent Cooldown"],
    upgradesFrom: ["Compress Cooldown"],
  },

  {
    ...defaultItem,
    name: "Superior Duration",
    category: Category.Spirit,
    value: Tier.T3,
    type: ["Abilities"],
    upgradesFrom: ["Duration Extender"],
  },

  {
    ...defaultItem,
    name: "Surge of Power",
    category: Category.Spirit,
    value: Tier.T3,
    type: ["Abilites", "Damage", "Imbued"],
    upgradesFrom: ["Extra Spirit"],
  },

  {
    ...defaultItem,
    name: "Tankbuster",
    category: Category.Spirit,
    value: Tier.T3,
    type: ["Abilites", "Damage"],
    upgradesFrom: ["Mystic Burst"],
  },

  {
    ...defaultItem,
    name: "Torment Pulse",
    category: Category.Spirit,
    value: Tier.T3,
    type: ["Damage"],
  },

  // =-=-=-=-=-=  -T4-  =-=-=-=-=-= \\
  {
    ...defaultItem,
    name: "Armor Piercing Rounds",
    category: Category.Gun,
    value: Tier.T4,
    type: ["Damage", "Shred"],
    upgradesFrom: ["High Velocity Rounds"],
  },

  {
    ...defaultItem,
    name: "Capacitor",
    category: Category.Gun,
    value: Tier.T4,
    type: ["Damage", "Utility", "Debuff"],
    active: true,
    upgradesFrom: ["Tesla Bullets"],
  },

  {
    ...defaultItem,
    name: "Crippling Headshot",
    category: Category.Gun,
    value: Tier.T4,
    type: ["Shred", "Anti-Heal", "Debuff"],
    upgradesFrom: ["Weakening Headshot"],
  },

  {
    ...defaultItem,
    name: "Crushing Fists",
    category: Category.Gun,
    value: Tier.T4,
    type: ["Damage", "Hard CC", "Debuff"],
    upgradesFrom: ["Melee Charge"],
  },

  {
    ...defaultItem,
    name: "Frenzy",
    category: Category.Gun,
    value: Tier.T4,
    type: ["Damage", "Resistance"],
  },

  {
    ...defaultItem,
    name: "Glass Cannon",
    category: Category.Gun,
    value: Tier.T4,
    type: ["Damage"],
  },

  {
    ...defaultItem,
    name: "Lucky Shot",
    category: Category.Gun,
    value: Tier.T4,
    type: ["Damage"],
  },

  {
    ...defaultItem,
    name: "Ricochet",
    category: Category.Gun,
    value: Tier.T4,
    type: ["Damage"],
  },

  {
    ...defaultItem,
    name: "Silencer",
    category: Category.Gun,
    value: Tier.T4,
    type: ["Damage Reduction", "Utility", "Debuff", "Silence"],
  },

  {
    ...defaultItem,
    name: "Spellslinger",
    category: Category.Gun,
    value: Tier.T4,
    type: ["Damage"],
  },

  {
    ...defaultItem,
    name: "Spiritual Overflow",
    category: Category.Gun,
    value: Tier.T4,
    type: ["Damage", "Healing"],
  },

  {
    ...defaultItem,
    name: "Cheat Death",
    category: Category.Vitality,
    value: Tier.T4,
    type: ["Utility"],
  },

  {
    ...defaultItem,
    name: "Colossus",
    category: Category.Vitality,
    value: Tier.T4,
    type: ["Health", "Resistance", "Damage"],
    active: true,
    upgradesFrom: ["Extra Health"],
  },

  {
    ...defaultItem,
    name: "Divine Barrier",
    category: Category.Vitality,
    value: Tier.T4,
    type: ["Shields"],
    active: true,
    upgradesFrom: ["Guardian Ward"],
  },

  {
    ...defaultItem,
    name: "Diviner's Kevlar",
    category: Category.Vitality,
    value: Tier.T4,
    type: ["Shields", "Abilities"],
  },

  {
    ...defaultItem,
    name: "Healing Tempo",
    category: Category.Vitality,
    value: Tier.T4,
    type: ["Healing", "Utility"],
    upgradesFrom: ["Healing Booster"],
  },

  {
    ...defaultItem,
    name: "Indomitable",
    category: Category.Vitality,
    value: Tier.T4,
    type: ["Utility", "Resistance", "Shields"],
    upgradesFrom: ["Reactive Barrier"],
  },

  {
    ...defaultItem,
    name: "Infuser",
    category: Category.Vitality,
    value: Tier.T4,
    type: ["Lifesteal", "Abilities"],
    active: true,
    upgradesFrom: ["Spirit Lifesteal"],
  },

  {
    ...defaultItem,
    name: "Inhibitor",
    category: Category.Vitality,
    value: Tier.T4,
    type: ["Damage Reduction", "Anti-Heal", "Debuff"],
  },

  {
    ...defaultItem,
    name: "Juggernaut",
    category: Category.Vitality,
    value: Tier.T4,
    type: ["Resistance"],
    upgradesFrom: ["Enduring Speed"],
  },

  {
    ...defaultItem,
    name: "Leech",
    category: Category.Vitality,
    value: Tier.T4,
    type: ["Lifesteal", "Damage", "Abilities"],
    upgradesFrom: ["Spirit Lifesteal", "Bullet Lifesteal"],
  },

  {
    ...defaultItem,
    name: "Phantom Strike",
    category: Category.Vitality,
    value: Tier.T4,
    type: ["Utility", "Soft CC"],
    active: true,
  },

  {
    ...defaultItem,
    name: "Plated Armor",
    category: Category.Vitality,
    value: Tier.T4,
    type: ["Resistance"],
  },

  {
    ...defaultItem,
    name: "Siphon Bullets",
    category: Category.Vitality,
    value: Tier.T4,
    type: ["Healing"],
  },

  {
    ...defaultItem,
    name: "Spellbreaker",
    category: Category.Vitality,
    value: Tier.T4,
    type: ["Resistance"],
    upgradesFrom: ["Debuff Reducer"],
  },

  {
    ...defaultItem,
    name: "Unstoppable",
    category: Category.Vitality,
    value: Tier.T4,
    type: ["Resistance"],
    active: true,
    upgradesFrom: ["Debuff Reducer"],
  },

  {
    ...defaultItem,
    name: "Vampiric Burst",
    category: Category.Vitality,
    value: Tier.T4,
    type: ["Lifesteal", "Damage"],
    active: true,
    upgradesFrom: ["Bullet Lifesteal"],
  },

  {
    ...defaultItem,
    name: "Witchmail",
    category: Category.Vitality,
    value: Tier.T4,
    type: ["Resistance", "Abilities"],
  },

  {
    ...defaultItem,
    name: "Arctic Blast",
    category: Category.Spirit,
    value: Tier.T4,
    type: ["Damage", "Damage AMP", "Debuff"],
    active: true,
    upgradesFrom: ["Cold Front"],
  },

  {
    ...defaultItem,
    name: "Boundless Spirit",
    category: Category.Spirit,
    value: Tier.T4,
    type: ["Abilities", "Damage"],
    upgradesFrom: ["Improved Spirit"],
  },

  {
    ...defaultItem,
    name: "Cursed Relic",
    category: Category.Spirit,
    value: Tier.T4,
    type: [
      "Damage Reduction",
      "Utility",
      "Debuff",
      "Silence",
      "Disarm",
      "Hard CC",
    ],
    active: true,
  },

  {
    ...defaultItem,
    name: "Echo Shard",
    category: Category.Spirit,
    value: Tier.T4,
    type: ["Utility", "Imbued"],
    active: true,
  },

  {
    ...defaultItem,
    name: "Escalating Exposure",
    category: Category.Spirit,
    value: Tier.T4,
    type: ["Damage AMP"],
    upgradesFrom: ["Mystic Vulnerability"],
  },

  {
    ...defaultItem,
    name: "Ethereal Shift",
    category: Category.Spirit,
    value: Tier.T4,
    type: ["Utility"],
    active: true,
  },

  {
    ...defaultItem,
    name: "Focus Lens",
    category: Category.Spirit,
    value: Tier.T4,
    type: ["Silence", "Damage", "Damage Reduction", "Debuff"],
    active: true,
    upgradesFrom: ["Spirit Sap"],
  },

  {
    ...defaultItem,
    name: "Lightning Scroll",
    category: Category.Spirit,
    value: Tier.T4,
    type: ["Abilities", "Hard CC"],
    upgradesFrom: ["Mystic Slow"],
  },

  {
    ...defaultItem,
    name: "Magic Carpet",
    category: Category.Spirit,
    value: Tier.T4,
    type: ["Mobility"],
    active: true,
  },

  {
    ...defaultItem,
    name: "Mercurial Magnum",
    category: Category.Spirit,
    value: Tier.T4,
    type: ["Damage", "Imbued"],
    upgradesFrom: ["Quicksilver Reload"],
  },

  {
    ...defaultItem,
    name: "Mystic Reverb",
    category: Category.Spirit,
    value: Tier.T4,
    type: ["Damage", "Debuff", "Imbued"],
  },

  {
    ...defaultItem,
    name: "Refresher",
    category: Category.Spirit,
    value: Tier.T4,
    type: ["Utility"],
    active: true,
  },

  {
    ...defaultItem,
    name: "Scourge",
    category: Category.Spirit,
    value: Tier.T4,
    type: ["Utility", "Damage", "Resistance"],
    active: true,
  },

  {
    ...defaultItem,
    name: "Spirit Burn",
    category: Category.Spirit,
    value: Tier.T4,
    type: ["Damage", "Anti-Heal", "DOT", "Debuff"],
  },

  {
    ...defaultItem,
    name: "Transcendent Cooldown",
    category: Category.Spirit,
    value: Tier.T4,
    type: ["Abilities"],
    upgradesFrom: ["Superior Cooldown"],
  },

  {
    ...defaultItem,
    name: "Vortex Web",
    category: Category.Spirit,
    value: Tier.T4,
    type: ["Utility", "Soft CC", "Debuff"],
    active: true,
  },
] as const;

export const COLS = 16;
export const ROWS = 9;
export const CELL = 80;
export const WORLD_W = COLS * CELL;
export const WORLD_H = ROWS * CELL;
export const TICK = 1 / 60;
export const START_GOLD = 120;
export const START_LIVES = 20;
export const WAVE_COUNT = 12;
export const SELL_RATE = 0.55;
export const UPGRADE_SELL_RATE = 0.5;

/** Cell waypoints — S-curve from west spawn to east gate. */
export const PATH: readonly [number, number][] = [
  [0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1], [10, 1], [11, 1],
  [11, 2], [11, 3], [11, 4],
  [10, 4], [9, 4], [8, 4], [7, 4], [6, 4], [5, 4], [4, 4], [3, 4],
  [3, 5], [3, 6], [3, 7],
  [4, 7], [5, 7], [6, 7], [7, 7], [8, 7], [9, 7], [10, 7], [11, 7], [12, 7], [13, 7], [14, 7], [15, 7],
];

export const PATH_SET = new Set(PATH.map(([c, r]) => `${c},${r}`));

export type TowerKind = "sentry" | "mortar" | "frost" | "lance";
export type EnemyKind = "mite" | "runner" | "brute" | "boss";

export type UpgradeEffect = {
  damage?: number;
  fireRate?: number;
  range?: number;
  splash?: number;
  pierce?: number;
  slow?: number;
  slowDuration?: number;
  burn?: number;
};

export type UpgradeNode = {
  id: string;
  name: string;
  cost: number;
  desc: string;
  effect: UpgradeEffect;
  requires?: string;
};

export type UpgradePath = { label: string; nodes: UpgradeNode[] };

export type TowerDef = {
  kind: TowerKind;
  name: string;
  cost: number;
  color: string;
  range: number;
  damage: number;
  fireRate: number;
  projectileSpeed: number;
  splash: number;
  pierce: number;
  slow: number;
  slowDuration: number;
  description: string;
  trees: Record<string, UpgradePath>;
};

export const TOWERS: Record<TowerKind, TowerDef> = {
  sentry: {
    kind: "sentry",
    name: "Sentry",
    cost: 50,
    color: "#6f8fad",
    range: 2.2,
    damage: 12,
    fireRate: 1.1,
    projectileSpeed: 420,
    splash: 0,
    pierce: 0,
    slow: 0,
    slowDuration: 0,
    description: "Single-target bolts",
    trees: {
      damage: {
        label: "Damage",
        nodes: [
          { id: "sharp", name: "Sharpened", cost: 40, desc: "×1.40 damage", effect: { damage: 1.4 } },
          { id: "pierce", name: "Piercing", cost: 75, desc: "×1.35 dmg, +1 pierce", effect: { damage: 1.35, pierce: 1 }, requires: "sharp" },
          { id: "overcharge", name: "Overcharge", cost: 130, desc: "×1.60 dmg, splash", effect: { damage: 1.6, splash: 0.4 }, requires: "pierce" },
        ],
      },
      rate: {
        label: "Fire rate",
        nodes: [
          { id: "quick", name: "Quickshot", cost: 35, desc: "×1.35 fire rate", effect: { fireRate: 1.35 } },
          { id: "rapid", name: "Rapid", cost: 70, desc: "×1.40 fire rate", effect: { fireRate: 1.4 }, requires: "quick" },
          { id: "gatling", name: "Gatling", cost: 140, desc: "×1.70 rate, ×0.85 dmg", effect: { fireRate: 1.7, damage: 0.85 }, requires: "rapid" },
        ],
      },
    },
  },
  mortar: {
    kind: "mortar",
    name: "Mortar",
    cost: 85,
    color: "#b57a4a",
    range: 3.0,
    damage: 45,
    fireRate: 0.45,
    projectileSpeed: 280,
    splash: 1.1,
    pierce: 0,
    slow: 0,
    slowDuration: 0,
    description: "Slow splash shells",
    trees: {
      splash: {
        label: "Blast",
        nodes: [
          { id: "wider", name: "Wider blast", cost: 55, desc: "×1.35 splash", effect: { splash: 1.35 } },
          { id: "cluster", name: "Cluster", cost: 100, desc: "×1.25 splash, ×1.20 dmg", effect: { splash: 1.25, damage: 1.2 }, requires: "wider" },
          { id: "napalm", name: "Napalm", cost: 160, desc: "×1.30 dmg, burn", effect: { splash: 1.2, damage: 1.3, burn: 0.3 }, requires: "cluster" },
        ],
      },
      power: {
        label: "Power",
        nodes: [
          { id: "heavy", name: "Heavy shells", cost: 60, desc: "×1.50 damage", effect: { damage: 1.5 } },
          { id: "siege", name: "Siege", cost: 110, desc: "×1.40 dmg, ×1.15 range", effect: { damage: 1.4, range: 1.15 }, requires: "heavy" },
          { id: "bunker", name: "Bunker buster", cost: 180, desc: "×1.80 dmg, ×0.85 rate", effect: { damage: 1.8, fireRate: 0.85 }, requires: "siege" },
        ],
      },
    },
  },
  frost: {
    kind: "frost",
    name: "Frost",
    cost: 70,
    color: "#7aa3b8",
    range: 2.4,
    damage: 8,
    fireRate: 0.9,
    projectileSpeed: 360,
    splash: 0,
    pierce: 0,
    slow: 0.55,
    slowDuration: 1.8,
    description: "Slows on hit",
    trees: {
      control: {
        label: "Control",
        nodes: [
          { id: "deep", name: "Deep freeze", cost: 45, desc: "stronger, longer slow", effect: { slow: 0.4, slowDuration: 1.3 } },
          { id: "shatter", name: "Shatter", cost: 85, desc: "×1.50 dmg + slow", effect: { damage: 1.5, slow: 0.35 }, requires: "deep" },
          { id: "blizzard", name: "Blizzard", cost: 150, desc: "×1.25 range", effect: { range: 1.25, slowDuration: 1.4 }, requires: "shatter" },
        ],
      },
      cryo: {
        label: "Cryo damage",
        nodes: [
          { id: "shards", name: "Ice shards", cost: 40, desc: "×1.60 dmg, ×1.15 rate", effect: { damage: 1.6, fireRate: 1.15 } },
          { id: "flance", name: "Frost lance", cost: 90, desc: "×1.45 dmg, +2 pierce", effect: { damage: 1.45, pierce: 2 }, requires: "shards" },
          { id: "absolute", name: "Absolute zero", cost: 160, desc: "×1.70 dmg", effect: { damage: 1.7, slow: 0.45 }, requires: "flance" },
        ],
      },
    },
  },
  lance: {
    kind: "lance",
    name: "Lance",
    cost: 110,
    color: "#8a7a9a",
    range: 3.4,
    damage: 55,
    fireRate: 0.55,
    projectileSpeed: 550,
    splash: 0,
    pierce: 2,
    slow: 0,
    slowDuration: 0,
    description: "Long-range pierce",
    trees: {
      pierce: {
        label: "Pierce",
        nodes: [
          { id: "focus", name: "Focused beam", cost: 65, desc: "+1 pierce, ×1.20 dmg", effect: { pierce: 1, damage: 1.2 } },
          { id: "rail", name: "Rail lance", cost: 120, desc: "+2 pierce, ×1.25 dmg", effect: { pierce: 2, damage: 1.25 }, requires: "focus" },
          { id: "obliterate", name: "Obliterate", cost: 200, desc: "+3 pierce, ×1.40 dmg", effect: { pierce: 3, damage: 1.4, range: 1.1 }, requires: "rail" },
        ],
      },
      sniper: {
        label: "Sniper",
        nodes: [
          { id: "scope", name: "Long scope", cost: 55, desc: "×1.30 range, ×1.15 dmg", effect: { range: 1.3, damage: 1.15 } },
          { id: "crit", name: "Critical", cost: 110, desc: "×1.60 dmg, ×0.90 rate", effect: { damage: 1.6, fireRate: 0.9 }, requires: "scope" },
          { id: "assassin", name: "Assassin", cost: 190, desc: "×2.00 dmg, ×0.85 rate", effect: { damage: 2.0, fireRate: 0.85 }, requires: "crit" },
        ],
      },
    },
  },
};

export type EnemyDef = {
  kind: EnemyKind;
  hp: number;
  speed: number;
  gold: number;
  radius: number;
  color: string;
};

export const ENEMIES: Record<EnemyKind, EnemyDef> = {
  mite: { kind: "mite", hp: 40, speed: 55, gold: 6, radius: 10, color: "#7a9a72" },
  runner: { kind: "runner", hp: 28, speed: 95, gold: 8, radius: 9, color: "#b89a5a" },
  brute: { kind: "brute", hp: 140, speed: 38, gold: 18, radius: 15, color: "#c45c4a" },
  boss: { kind: "boss", hp: 520, speed: 28, gold: 55, radius: 20, color: "#6a5a7a" },
};

export type WaveSpec = Partial<Record<EnemyKind, number>>;

export const WAVES: WaveSpec[] = [
  { mite: 8 },
  { mite: 10, runner: 3 },
  { mite: 8, runner: 6 },
  { mite: 6, runner: 6, brute: 2 },
  { runner: 10, brute: 3 },
  { mite: 12, runner: 8, brute: 3 },
  { brute: 6, runner: 8 },
  { mite: 10, runner: 10, brute: 5 },
  { brute: 8, runner: 12 },
  { mite: 15, runner: 10, brute: 6 },
  { brute: 10, runner: 18 },
  { boss: 1, brute: 6, runner: 12, mite: 10 },
];

export function hpScale(waveIndex1: number): number {
  return 1 + (waveIndex1 - 1) * 0.18;
}

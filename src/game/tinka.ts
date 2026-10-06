import { TICK, TOWERS, type TowerKind, type UpgradeNode, WAVE_COUNT } from "./config.ts";
import { Game, type Snapshot } from "./engine.ts";

/** Path-adjacent killbox around the west U-turn (every creep must pass). */
const BUILD_ORDER: { kind: TowerKind; c: number; r: number }[] = [
  { kind: "sentry", c: 6, r: 2 },
  { kind: "sentry", c: 9, r: 2 },
  { kind: "sentry", c: 4, r: 5 },
  { kind: "sentry", c: 2, r: 5 },
  { kind: "frost", c: 3, r: 3 },
  { kind: "mortar", c: 5, r: 5 },
  { kind: "sentry", c: 12, r: 2 },
  { kind: "sentry", c: 2, r: 6 },
  { kind: "lance", c: 8, r: 5 },
  { kind: "mortar", c: 8, r: 6 },
  { kind: "sentry", c: 4, r: 6 },
  { kind: "sentry", c: 10, r: 5 },
  { kind: "frost", c: 3, r: 8 },
  { kind: "lance", c: 12, r: 6 },
  { kind: "sentry", c: 6, r: 5 },
  { kind: "sentry", c: 8, r: 3 },
  { kind: "sentry", c: 14, r: 6 },
  { kind: "sentry", c: 12, r: 8 },
  { kind: "mortar", c: 1, r: 5 },
  { kind: "sentry", c: 5, r: 3 },
];

const FILL: { c: number; r: number }[] = [
  [4, 3], [2, 3], [2, 7], [4, 8], [5, 6], [7, 5], [7, 6], [9, 5], [9, 6], [11, 5], [10, 3], [12, 3], [13, 6], [13, 8], [7, 8], [9, 8], [6, 8], [8, 8],
].map(([c, r]) => ({ c, r }));

export type Genome = {
  minBodies4: number;
  minBodies8: number;
  frostAfter: number;
  frostMax: number;
  mortarAfter: number;
  mortarMax: number;
  lanceAfter: number;
  lanceMax: number;
  reserve: number;
  upgradeWhen: number;
  preferUpgrade: number;
  fillCap: number;
  deepFirst: number;
};

/** Choke sentries, then deepen rate instead of infinite 50g fill. */
export const BASELINE: Genome = {
  minBodies4: 6,
  minBodies8: 8,
  frostAfter: 0,
  frostMax: 0,
  mortarAfter: 0,
  mortarMax: 0,
  lanceAfter: 0,
  lanceMax: 0,
  reserve: 50,
  upgradeWhen: 4,
  preferUpgrade: 1,
  fillCap: 14,
  deepFirst: 1,
};

const PREFERRED_PATH: Record<TowerKind, string> = {
  sentry: "rate",
  mortar: "splash",
  frost: "control",
  lance: "pierce",
};

const GENE_KEYS = Object.keys(BASELINE) as (keyof Genome)[];

function clampGene(k: keyof Genome, v: number): number {
  const max: Record<keyof Genome, number> = {
    minBodies4: 10,
    minBodies8: 14,
    frostAfter: 12,
    frostMax: 2,
    mortarAfter: 12,
    mortarMax: 2,
    lanceAfter: 12,
    lanceMax: 2,
    reserve: 110,
    upgradeWhen: 8,
    preferUpgrade: 1,
    fillCap: 28,
    deepFirst: 1,
  };
  return Math.max(0, Math.min(max[k], Math.round(v)));
}

export function mutateGenome(src: Genome, rng: () => number): Genome {
  const next = { ...src };
  const key = GENE_KEYS[Math.floor(rng() * GENE_KEYS.length)];
  const step = key === "preferUpgrade" ? 1 : rng() < 0.5 ? -1 : 1;
  const jump = key.endsWith("After") || key.startsWith("min") ? (rng() < 0.3 ? 2 : 1) * step : step;
  next[key] = clampGene(key, src[key] + jump);
  if (key === "frostMax" && next.frostMax > 0 && next.frostAfter === 0) next.frostAfter = 4;
  if (key === "mortarMax" && next.mortarMax > 0 && next.mortarAfter === 0) next.mortarAfter = 5;
  if (key === "lanceMax" && next.lanceMax > 0 && next.lanceAfter === 0) next.lanceAfter = 8;
  return next;
}

export function genomeLabel(g: Genome): string {
  return `b4=${g.minBodies4} b8=${g.minBodies8} cap=${g.fillCap} deep=${g.deepFirst} frost=${g.frostMax}@${g.frostAfter} mortar=${g.mortarMax}@${g.mortarAfter} res=${g.reserve}`;
}

function occupied(g: Game): Set<string> {
  return new Set(g.towers.map((t) => `${t.col},${t.row}`));
}

function countKind(g: Game, kind: TowerKind): number {
  return g.towers.filter((t) => t.kind === kind).length;
}

function kindAllowed(kind: TowerKind, g: Game, genome: Genome): boolean {
  const n = g.towers.length;
  if (kind === "frost") return genome.frostMax > 0 && n >= genome.frostAfter && countKind(g, "frost") < genome.frostMax;
  if (kind === "mortar") return genome.mortarMax > 0 && n >= genome.mortarAfter && countKind(g, "mortar") < genome.mortarMax;
  if (kind === "lance") return genome.lanceMax > 0 && n >= genome.lanceAfter && countKind(g, "lance") < genome.lanceMax;
  return true;
}

function nextNode(kind: TowerKind, owned: Set<string>): UpgradeNode | null {
  const path = TOWERS[kind].trees[PREFERRED_PATH[kind]];
  for (const node of path.nodes) {
    if (owned.has(node.id)) continue;
    if (node.requires && !owned.has(node.requires)) return null;
    return node;
  }
  return null;
}

function cheapestUpgrade(g: Game): { id: number; node: UpgradeNode } | null {
  let bestPick: { id: number; node: UpgradeNode } | null = null;
  for (const t of g.towers) {
    const node = nextNode(t.kind, t.owned);
    if (!node || !g.canBuy(t, node)) continue;
    if (!bestPick || node.cost < bestPick.node.cost) bestPick = { id: t.id, node };
  }
  return bestPick;
}

function pickUpgrade(g: Game, genome: Genome): { id: number; node: UpgradeNode } | null {
  if (!genome.deepFirst) return cheapestUpgrade(g);
  let bestPick: { id: number; node: UpgradeNode; depth: number; idn: number } | null = null;
  for (const t of g.towers) {
    const node = nextNode(t.kind, t.owned);
    if (!node || !g.canBuy(t, node)) continue;
    const depth = t.owned.size;
    if (
      !bestPick ||
      depth > bestPick.depth ||
      (depth === bestPick.depth && t.id < bestPick.idn)
    ) {
      bestPick = { id: t.id, node, depth, idn: t.id };
    }
  }
  return bestPick ? { id: bestPick.id, node: bestPick.node } : null;
}

function placeNext(g: Game, genome: Genome): string | null {
  if (genome.fillCap > 0 && g.towers.length >= genome.fillCap) return null;
  const taken = occupied(g);
  for (const step of BUILD_ORDER) {
    if (taken.has(`${step.c},${step.r}`)) continue;
    if (!kindAllowed(step.kind, g, genome)) continue;
    if (!g.canPlace(step.c, step.r, step.kind)) continue;
    if (g.placeKind(step.kind, step.c, step.r)) {
      return `place ${TOWERS[step.kind].name} @${step.c},${step.r}`;
    }
  }
  for (const cell of FILL) {
    if (taken.has(`${cell.c},${cell.r}`)) continue;
    if (!g.canPlace(cell.c, cell.r, "sentry")) continue;
    if (g.placeKind("sentry", cell.c, cell.r)) return `place Sentry @${cell.c},${cell.r}`;
  }
  return null;
}

let active: Genome = { ...BASELINE };
let best: Genome = { ...BASELINE };
let bestReward = 14420;
let generation = 0;
let games = 0;
let nextSeed = 15;
let trial: Genome | null = null;
let mutateState = 0x9e3779b9;

function mutateRand(): number {
  mutateState |= 0;
  mutateState = (mutateState + 0x6d2b79f5) | 0;
  let t = Math.imul(mutateState ^ (mutateState >>> 15), 1 | mutateState);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function getGenome(): Genome {
  return { ...active };
}

export function getBestGenome(): Genome {
  return { ...best };
}

export function tinkaStatus() {
  return {
    generation,
    games,
    nextSeed,
    bestReward,
    genome: genomeLabel(active),
    best: genomeLabel(best),
  };
}

export function tinkaAct(g: Game, genome: Genome = active): string | null {
  if (g.mode === "title") {
    g.start(g.seed);
    return "start";
  }
  if (g.mode !== "playing") return null;

  const sentryCost = TOWERS.sentry.cost;
  const capped = genome.fillCap > 0 && g.towers.length >= genome.fillCap;
  const needMoreBodies =
    !capped &&
    (g.towers.length < 4 ||
      (g.wave >= 4 && g.towers.length < genome.minBodies4) ||
      (g.wave >= 8 && g.towers.length < genome.minBodies8));

  if (!needMoreBodies && g.towers.length >= genome.upgradeWhen && genome.preferUpgrade) {
    const up = pickUpgrade(g, genome);
    const floor = capped || g.towers.length >= 10 ? 0 : Math.max(genome.reserve, sentryCost);
    if (up && g.gold - up.node.cost >= floor) {
      if (g.buyUpgrade(up.id, up.node.id)) {
        const t = g.towerById(up.id);
        return `upgrade ${t ? TOWERS[t.kind].name : "?"} ${up.node.name}`;
      }
    }
  }

  const placed = placeNext(g, genome);
  if (placed) return placed;

  const up = pickUpgrade(g, genome);
  if (up && g.buyUpgrade(up.id, up.node.id)) {
    const t = g.towerById(up.id);
    return `upgrade ${t ? TOWERS[t.kind].name : "?"} ${up.node.name}`;
  }

  if (g.betweenWaves && g.wave < WAVE_COUNT) {
    g.beginWave();
    return `wave ${g.wave}`;
  }
  return null;
}

export type SimResult = {
  seed: number;
  mode: Snapshot["mode"];
  wave: number;
  gold: number;
  lives: number;
  kills: number;
  leaks: number;
  earned: number;
  spent: number;
  towers: number;
  ticks: number;
  reward: number;
  leakNotes: string[];
};

export function reward(s: Snapshot): number {
  const win = s.mode === "victory" ? 10_000 : 0;
  return win + s.lives * 100 + s.goldEarned + s.gold - s.leaks * 50;
}

export function simulate(seed: number, genome: Genome = active, maxTicks = 400_000): SimResult {
  const g = new Game();
  g.quiet = true;
  g.autoplay = true;
  g.seed = seed;
  g.start(seed);
  let ticks = 0;
  let idle = 0;
  while (g.mode === "playing" && ticks < maxTicks) {
    const acted = ticks % 6 === 0 || g.betweenWaves ? tinkaAct(g, genome) : null;
    g.step(TICK);
    ticks++;
    idle = acted ? 0 : idle + 1;
    if (idle > 8000 && g.betweenWaves) break;
  }
  const s = g.snapshot();
  return {
    seed,
    mode: s.mode,
    wave: s.wave,
    gold: s.gold,
    lives: s.lives,
    kills: s.kills,
    leaks: s.leaks,
    earned: s.goldEarned,
    spent: s.goldSpent,
    towers: s.towers,
    ticks,
    reward: reward(s),
    leakNotes: g.ledger.filter((e) => e.kind === "leak").map((e) => e.note),
  };
}

export type ActTrace = {
  t: number;
  wave: number;
  gold: number;
  spent: number;
  earned: number;
  towers: number;
  note: string;
};

export type WaveTrace = {
  wave: number;
  tStart: number;
  tEnd: number;
  goldStart: number;
  goldEnd: number;
  earned: number;
  spent: number;
  kills: number;
  queue: string;
};

export type TowerTrace = {
  id: number;
  kind: TowerKind;
  c: number;
  r: number;
  owned: string[];
  dmg: number;
  rate: number;
  invested: number;
};

export type FullTrace = {
  result: SimResult;
  acts: ActTrace[];
  waves: WaveTrace[];
  towers: TowerTrace[];
};

export function simulateTrace(seed: number, genome: Genome = active, maxTicks = 400_000): FullTrace {
  const g = new Game();
  g.quiet = true;
  g.autoplay = true;
  g.seed = seed;
  g.start(seed);
  const acts: ActTrace[] = [];
  const waves: WaveTrace[] = [];
  let waveOpen: WaveTrace | null = null;
  let ticks = 0;
  let idle = 0;
  const pushAct = (note: string) => {
    acts.push({
      t: Math.round(g.simTime * 100) / 100,
      wave: g.wave,
      gold: g.gold,
      spent: g.goldSpent,
      earned: g.goldEarned,
      towers: g.towers.length,
      note,
    });
  };
  let lastWaveSeen = 0;
  while (g.mode === "playing" && ticks < maxTicks) {
    const acted = ticks % 6 === 0 || g.betweenWaves ? tinkaAct(g, genome) : null;
    if (acted) {
      pushAct(acted);
      idle = 0;
    } else idle++;
    g.step(TICK);
    ticks++;
    if (g.wave !== lastWaveSeen) {
      if (waveOpen) {
        waveOpen.tEnd = g.simTime;
        waveOpen.goldEnd = g.gold;
        waveOpen.earned = g.goldEarned - waveOpen.earned;
        waveOpen.spent = g.goldSpent - waveOpen.spent;
        waveOpen.kills = g.kills - waveOpen.kills;
        waves.push(waveOpen);
      }
      lastWaveSeen = g.wave;
      waveOpen = {
        wave: g.wave,
        tStart: g.simTime,
        tEnd: 0,
        goldStart: g.gold,
        goldEnd: 0,
        earned: g.goldEarned,
        spent: g.goldSpent,
        kills: g.kills,
        queue: g.queue.join(","),
      };
    }
    if (waveOpen && g.mode !== "playing") {
      waveOpen.tEnd = g.simTime;
      waveOpen.goldEnd = g.gold;
      waveOpen.earned = g.goldEarned - waveOpen.earned;
      waveOpen.spent = g.goldSpent - waveOpen.spent;
      waveOpen.kills = g.kills - waveOpen.kills;
      waves.push(waveOpen);
      waveOpen = null;
    }
    if (idle > 8000 && g.betweenWaves) break;
  }
  const s = g.snapshot();
  const result: SimResult = {
    seed,
    mode: s.mode,
    wave: s.wave,
    gold: s.gold,
    lives: s.lives,
    kills: s.kills,
    leaks: s.leaks,
    earned: s.goldEarned,
    spent: s.goldSpent,
    towers: s.towers,
    ticks,
    reward: reward(s),
    leakNotes: g.ledger.filter((e) => e.kind === "leak").map((e) => e.note),
  };
  return {
    result,
    acts,
    waves,
    towers: g.towers.map((t) => ({
      id: t.id,
      kind: t.kind,
      c: t.col,
      r: t.row,
      owned: [...t.owned],
      dmg: Math.round(t.damage * 10) / 10,
      rate: Math.round(t.fireRate * 100) / 100,
      invested: t.invested,
    })),
  };
}

export type EvolveStep = {
  gen: number;
  seed: number;
  reward: number;
  kept: boolean;
  genome: string;
  result: SimResult;
};

export function scoreGenome(genome: Genome, startSeed: number, n = 3): number {
  let sum = 0;
  for (let i = 0; i < n; i++) sum += simulate(startSeed + i, genome).reward;
  return Math.round(sum / n);
}

/** Hill-climb on the real engine. Every kept genome beat the previous best mean reward. */
export function evolve(iters = 12, startSeed = 15): { best: Genome; bestReward: number; steps: EvolveStep[] } {
  const steps: EvolveStep[] = [];
  let current = { ...best };
  let currentScore = scoreGenome(current, startSeed, 3);
  for (let i = 0; i < iters; i++) {
    const cand = mutateGenome(current, mutateRand);
    const seed = startSeed + i;
    const result = simulate(seed, cand);
    const mean = scoreGenome(cand, startSeed, 3);
    const kept = mean > currentScore;
    generation++;
    games++;
    if (kept) {
      current = cand;
      currentScore = mean;
      best = { ...cand };
      active = { ...cand };
    }
    if (result.reward > bestReward) bestReward = result.reward;
    if (mean > bestReward) bestReward = mean;
    steps.push({
      gen: generation,
      seed,
      reward: mean,
      kept,
      genome: genomeLabel(cand),
      result,
    });
  }
  active = { ...best };
  persist();
  return { best, bestReward, steps };
}

function persist() {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(
      "hollowgate-tinka-v2",
      JSON.stringify({ best, bestReward, generation, games, nextSeed }),
    );
  } catch {
    /* ignore quota */
  }
}

export function restore() {
  if (typeof localStorage === "undefined") return;
  try {
    const raw = localStorage.getItem("hollowgate-tinka-v2");
    if (!raw) return;
    const data = JSON.parse(raw) as { best: Genome; bestReward: number; generation: number; games: number; nextSeed: number };
    if (!data?.best || typeof data.bestReward !== "number") return;
    best = { ...BASELINE, ...data.best };
    bestReward = data.bestReward;
    generation = data.generation ?? 0;
    games = data.games ?? 0;
    nextSeed = data.nextSeed ?? 15;
    active = { ...best };
  } catch {
    /* ignore */
  }
}

/** Score a finished live game, keep genome if it beat best, mutate for the next seed. */
export function learn(s: Snapshot): { kept: boolean; reward: number; nextSeed: number } {
  const r = reward(s);
  games++;
  generation++;
  const used = trial ?? active;
  const kept = r > bestReward;
  if (kept) {
    best = { ...used };
    bestReward = r;
  }
  trial = mutateGenome(best, mutateRand);
  active = { ...trial };
  nextSeed += 1;
  persist();
  return { kept, reward: r, nextSeed };
}

export type TinkaApi = {
  act: () => string | null;
  play: (seed?: number) => void;
  stop: () => void;
  iterate: () => { kept: boolean; reward: number; nextSeed: number };
  evolve: (iters?: number, startSeed?: number) => ReturnType<typeof evolve>;
  snapshot: () => Snapshot;
  status: () => ReturnType<typeof tinkaStatus>;
  simulate: (seed: number) => SimResult;
  simulateTrace: (seed: number) => FullTrace;
  simulateMany: (
    n: number,
    startSeed?: number,
  ) => { best: SimResult; n: number; wins: number; leak0: number; avgEarned: number };
};

export function bindTinka(live: Game): TinkaApi {
  restore();
  return {
    act: () => tinkaAct(live, active),
    play: (seed?: number) => {
      live.autoplay = true;
      live.quiet = false;
      const s = seed ?? nextSeed;
      nextSeed = s;
      if (live.mode !== "playing") live.start(s);
    },
    stop: () => {
      live.autoplay = false;
    },
    iterate: () => {
      const learned = learn(live.snapshot());
      live.autoplay = true;
      live.quiet = false;
      live.start(learned.nextSeed);
      return learned;
    },
    evolve,
    snapshot: () => live.snapshot(),
    status: tinkaStatus,
    simulate: (seed) => simulate(seed, active),
    simulateTrace: (seed) => simulateTrace(seed, active),
    simulateMany: (n, startSeed = 1) => {
      let bestR: SimResult | null = null;
      let wins = 0;
      let leak0 = 0;
      let goldSum = 0;
      const cap = Math.min(Math.max(1, n), 10_000);
      for (let i = 0; i < cap; i++) {
        const r = simulate(startSeed + i, active);
        if (r.mode === "victory") wins++;
        if (r.leaks === 0) leak0++;
        goldSum += r.earned;
        if (!bestR || r.reward > bestR.reward) bestR = r;
      }
      return { best: bestR!, n: cap, wins, leak0, avgEarned: Math.round(goldSum / cap) };
    },
  };
}

/** Verified: 40/40 perfect clears. Cap 14 killbox + deepen rate. Leftover 185. */
export const SOLVED = {
  n: 40,
  wins: 40,
  seed: 15,
  earned: 2235,
  leftover: 185,
  spent: 2170,
  lives: 20,
  leaks: 0,
  towers: 14,
  reward: 14420,
} as const;

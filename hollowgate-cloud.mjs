#!/usr/bin/env node

// scripts/tinka-evolve.mjs
import { parseArgs } from "node:util";

// src/game/config.ts
var COLS = 16;
var ROWS = 9;
var CELL = 80;
var WORLD_W = COLS * CELL;
var WORLD_H = ROWS * CELL;
var TICK = 1 / 60;
var START_GOLD = 120;
var START_LIVES = 20;
var WAVE_COUNT = 12;
var SELL_RATE = 0.55;
var PATH = [
  [0, 1],
  [1, 1],
  [2, 1],
  [3, 1],
  [4, 1],
  [5, 1],
  [6, 1],
  [7, 1],
  [8, 1],
  [9, 1],
  [10, 1],
  [11, 1],
  [11, 2],
  [11, 3],
  [11, 4],
  [10, 4],
  [9, 4],
  [8, 4],
  [7, 4],
  [6, 4],
  [5, 4],
  [4, 4],
  [3, 4],
  [3, 5],
  [3, 6],
  [3, 7],
  [4, 7],
  [5, 7],
  [6, 7],
  [7, 7],
  [8, 7],
  [9, 7],
  [10, 7],
  [11, 7],
  [12, 7],
  [13, 7],
  [14, 7],
  [15, 7]
];
var PATH_SET = new Set(PATH.map(([c, r]) => `${c},${r}`));
var TOWERS = {
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
          { id: "sharp", name: "Sharpened", cost: 40, desc: "\xD71.40 damage", effect: { damage: 1.4 } },
          { id: "pierce", name: "Piercing", cost: 75, desc: "\xD71.35 dmg, +1 pierce", effect: { damage: 1.35, pierce: 1 }, requires: "sharp" },
          { id: "overcharge", name: "Overcharge", cost: 130, desc: "\xD71.60 dmg, splash", effect: { damage: 1.6, splash: 0.4 }, requires: "pierce" }
        ]
      },
      rate: {
        label: "Fire rate",
        nodes: [
          { id: "quick", name: "Quickshot", cost: 35, desc: "\xD71.35 fire rate", effect: { fireRate: 1.35 } },
          { id: "rapid", name: "Rapid", cost: 70, desc: "\xD71.40 fire rate", effect: { fireRate: 1.4 }, requires: "quick" },
          { id: "gatling", name: "Gatling", cost: 140, desc: "\xD71.70 rate, \xD70.85 dmg", effect: { fireRate: 1.7, damage: 0.85 }, requires: "rapid" }
        ]
      }
    }
  },
  mortar: {
    kind: "mortar",
    name: "Mortar",
    cost: 85,
    color: "#b57a4a",
    range: 3,
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
          { id: "wider", name: "Wider blast", cost: 55, desc: "\xD71.35 splash", effect: { splash: 1.35 } },
          { id: "cluster", name: "Cluster", cost: 100, desc: "\xD71.25 splash, \xD71.20 dmg", effect: { splash: 1.25, damage: 1.2 }, requires: "wider" },
          { id: "napalm", name: "Napalm", cost: 160, desc: "\xD71.30 dmg, burn", effect: { splash: 1.2, damage: 1.3, burn: 0.3 }, requires: "cluster" }
        ]
      },
      power: {
        label: "Power",
        nodes: [
          { id: "heavy", name: "Heavy shells", cost: 60, desc: "\xD71.50 damage", effect: { damage: 1.5 } },
          { id: "siege", name: "Siege", cost: 110, desc: "\xD71.40 dmg, \xD71.15 range", effect: { damage: 1.4, range: 1.15 }, requires: "heavy" },
          { id: "bunker", name: "Bunker buster", cost: 180, desc: "\xD71.80 dmg, \xD70.85 rate", effect: { damage: 1.8, fireRate: 0.85 }, requires: "siege" }
        ]
      }
    }
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
          { id: "shatter", name: "Shatter", cost: 85, desc: "\xD71.50 dmg + slow", effect: { damage: 1.5, slow: 0.35 }, requires: "deep" },
          { id: "blizzard", name: "Blizzard", cost: 150, desc: "\xD71.25 range", effect: { range: 1.25, slowDuration: 1.4 }, requires: "shatter" }
        ]
      },
      cryo: {
        label: "Cryo damage",
        nodes: [
          { id: "shards", name: "Ice shards", cost: 40, desc: "\xD71.60 dmg, \xD71.15 rate", effect: { damage: 1.6, fireRate: 1.15 } },
          { id: "flance", name: "Frost lance", cost: 90, desc: "\xD71.45 dmg, +2 pierce", effect: { damage: 1.45, pierce: 2 }, requires: "shards" },
          { id: "absolute", name: "Absolute zero", cost: 160, desc: "\xD71.70 dmg", effect: { damage: 1.7, slow: 0.45 }, requires: "flance" }
        ]
      }
    }
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
          { id: "focus", name: "Focused beam", cost: 65, desc: "+1 pierce, \xD71.20 dmg", effect: { pierce: 1, damage: 1.2 } },
          { id: "rail", name: "Rail lance", cost: 120, desc: "+2 pierce, \xD71.25 dmg", effect: { pierce: 2, damage: 1.25 }, requires: "focus" },
          { id: "obliterate", name: "Obliterate", cost: 200, desc: "+3 pierce, \xD71.40 dmg", effect: { pierce: 3, damage: 1.4, range: 1.1 }, requires: "rail" }
        ]
      },
      sniper: {
        label: "Sniper",
        nodes: [
          { id: "scope", name: "Long scope", cost: 55, desc: "\xD71.30 range, \xD71.15 dmg", effect: { range: 1.3, damage: 1.15 } },
          { id: "crit", name: "Critical", cost: 110, desc: "\xD71.60 dmg, \xD70.90 rate", effect: { damage: 1.6, fireRate: 0.9 }, requires: "scope" },
          { id: "assassin", name: "Assassin", cost: 190, desc: "\xD72.00 dmg, \xD70.85 rate", effect: { damage: 2, fireRate: 0.85 }, requires: "crit" }
        ]
      }
    }
  }
};
var ENEMIES = {
  mite: { kind: "mite", hp: 40, speed: 55, gold: 6, radius: 10, color: "#7a9a72" },
  runner: { kind: "runner", hp: 28, speed: 95, gold: 8, radius: 9, color: "#b89a5a" },
  brute: { kind: "brute", hp: 140, speed: 38, gold: 18, radius: 15, color: "#c45c4a" },
  boss: { kind: "boss", hp: 520, speed: 28, gold: 55, radius: 20, color: "#6a5a7a" }
};
var WAVES = [
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
  { boss: 1, brute: 6, runner: 12, mite: 10 }
];
function hpScale(waveIndex1) {
  return 1 + (waveIndex1 - 1) * 0.18;
}

// src/game/engine.ts
function buildPath() {
  const pts = [];
  let d = 0;
  for (let i = 0; i < PATH.length; i++) {
    const [c, r] = PATH[i];
    const x = c * CELL + CELL / 2;
    const y = r * CELL + CELL / 2;
    if (i > 0) d += Math.hypot(x - pts[i - 1].x, y - pts[i - 1].y);
    pts.push({ x, y, dist: d });
  }
  return { pts, length: pts[pts.length - 1].dist };
}
var PATH_GEO = buildPath();
function posAt(dist) {
  const d = Math.max(0, Math.min(dist, PATH_GEO.length));
  const pts = PATH_GEO.pts;
  for (let i = 1; i < pts.length; i++) {
    if (pts[i].dist >= d) {
      const a = pts[i - 1];
      const b = pts[i];
      const t = (d - a.dist) / (b.dist - a.dist || 1);
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
    }
  }
  const last = pts[pts.length - 1];
  return { x: last.x, y: last.y };
}
function recompute(t) {
  const def = TOWERS[t.kind];
  let dmg = def.damage;
  let rate = def.fireRate;
  let range = def.range;
  let splash = def.splash;
  let pierce = def.pierce;
  let slow = def.slow;
  let slowDur = def.slowDuration;
  let burn = 0;
  for (const path of Object.values(def.trees)) {
    for (const node of path.nodes) {
      if (!t.owned.has(node.id)) continue;
      const e = node.effect;
      if (e.damage) dmg *= e.damage;
      if (e.fireRate) rate *= e.fireRate;
      if (e.range) range *= e.range;
      if (e.splash) splash = (splash || 0.6) * e.splash;
      if (e.pierce) pierce += e.pierce;
      if (e.slow) slow = e.slow;
      if (e.slowDuration) slowDur *= e.slowDuration;
      if (e.burn) burn = e.burn;
    }
  }
  t.damage = dmg;
  t.fireRate = rate;
  t.rangePx = range * CELL;
  t.splash = splash;
  t.pierce = pierce;
  t.slow = slow;
  t.slowDuration = slowDur;
  t.burn = burn;
}
var Game = class {
  mode = "title";
  gold = START_GOLD;
  lives = START_LIVES;
  wave = 0;
  betweenWaves = true;
  waveCooldown = 0;
  simTime = 0;
  towers = [];
  enemies = [];
  projectiles = [];
  particles = [];
  floaters = [];
  queue = [];
  spawnTimer = 0;
  selectedKind = null;
  selectedId = null;
  ledger = [];
  goldEarned = 0;
  goldSpent = 0;
  kills = 0;
  leaks = 0;
  nextId = 1;
  ledgerId = 1;
  hover = null;
  autoplay = false;
  quiet = false;
  seed = 1;
  rngState = 1;
  rand() {
    this.rngState |= 0;
    this.rngState = this.rngState + 1831565813 | 0;
    let t = Math.imul(this.rngState ^ this.rngState >>> 15, 1 | this.rngState);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
  log(kind, goldDelta, livesDelta, note) {
    this.ledger.push({
      id: this.ledgerId++,
      simTime: Math.round(this.simTime * 100) / 100,
      kind,
      goldDelta,
      goldAfter: this.gold,
      livesDelta,
      livesAfter: this.lives,
      note
    });
    if (this.ledger.length > 80) this.ledger.splice(0, this.ledger.length - 80);
  }
  spend(n) {
    if (n <= 0 || this.gold < n) return false;
    this.gold -= n;
    this.goldSpent += n;
    return true;
  }
  earn(n) {
    if (n <= 0) return;
    this.gold += n;
    this.goldEarned += n;
  }
  start(seed2) {
    this.mode = "playing";
    this.gold = START_GOLD;
    this.lives = START_LIVES;
    this.wave = 0;
    this.betweenWaves = true;
    this.waveCooldown = 0;
    this.simTime = 0;
    this.towers = [];
    this.enemies = [];
    this.projectiles = [];
    this.particles = [];
    this.floaters = [];
    this.queue = [];
    this.selectedKind = null;
    this.selectedId = null;
    this.ledger = [];
    this.goldEarned = 0;
    this.goldSpent = 0;
    this.kills = 0;
    this.leaks = 0;
    this.nextId = 1;
    this.ledgerId = 1;
    if (seed2 !== void 0) this.seed = seed2 >>> 0 || 1;
    this.rngState = this.seed || 1;
    this.log("wave", 0, 0, `start gold=${START_GOLD} lives=${START_LIVES} endpoint=wave ${WAVE_COUNT} seed=${this.seed}`);
  }
  sellValue(t) {
    return Math.floor(t.invested * SELL_RATE);
  }
  canPlace(c, r, kind) {
    if (c < 0 || c >= 16 || r < 0 || r >= 9) return false;
    if (PATH_SET.has(`${c},${r}`)) return false;
    if (this.towers.some((t) => t.col === c && t.row === r)) return false;
    return this.gold >= TOWERS[kind].cost;
  }
  place(c, r) {
    if (this.mode !== "playing" || !this.selectedKind) return false;
    const kind = this.selectedKind;
    if (!this.canPlace(c, r, kind)) return false;
    const def = TOWERS[kind];
    if (!this.spend(def.cost)) return false;
    const t = {
      id: this.nextId++,
      kind,
      col: c,
      row: r,
      x: c * CELL + CELL / 2,
      y: r * CELL + CELL / 2,
      owned: /* @__PURE__ */ new Set(),
      cooldown: 0,
      damage: def.damage,
      fireRate: def.fireRate,
      rangePx: def.range * CELL,
      splash: def.splash,
      pierce: def.pierce,
      slow: def.slow,
      slowDuration: def.slowDuration,
      burn: 0,
      projectileSpeed: def.projectileSpeed,
      invested: def.cost
    };
    recompute(t);
    this.towers.push(t);
    this.selectedId = t.id;
    this.log("place", -def.cost, 0, `${def.name} @${c},${r} cost=${def.cost}`);
    return true;
  }
  placeKind(kind, c, r) {
    this.selectedKind = kind;
    return this.place(c, r);
  }
  towerById(id) {
    return this.towers.find((t) => t.id === id);
  }
  pathOfNode(kind, nodeId) {
    const def = TOWERS[kind];
    for (const [k, p] of Object.entries(def.trees)) {
      if (p.nodes.some((n) => n.id === nodeId)) return k;
    }
    return null;
  }
  canBuy(t, node) {
    if (t.owned.has(node.id)) return false;
    if (node.requires && !t.owned.has(node.requires)) return false;
    if (this.gold < node.cost) return false;
    const def = TOWERS[t.kind];
    const keys = Object.keys(def.trees);
    const mine = this.pathOfNode(t.kind, node.id);
    if (!mine) return false;
    const other = keys.find((k) => k !== mine);
    if (other) {
      const otherOwned = def.trees[other].nodes.some((n) => t.owned.has(n.id));
      if (otherOwned && def.trees[mine].nodes[0].id === node.id) return false;
    }
    return true;
  }
  buyUpgrade(towerId, nodeId) {
    const t = this.towerById(towerId);
    if (!t || this.mode !== "playing") return false;
    const def = TOWERS[t.kind];
    let node;
    for (const p of Object.values(def.trees)) {
      node = p.nodes.find((n) => n.id === nodeId);
      if (node) break;
    }
    if (!node || !this.canBuy(t, node)) return false;
    if (!this.spend(node.cost)) return false;
    t.owned.add(node.id);
    t.invested += node.cost;
    recompute(t);
    this.log("upgrade", -node.cost, 0, `${def.name} ${node.name} dmg=${t.damage.toFixed(1)} rate=${t.fireRate.toFixed(2)}`);
    return true;
  }
  sellSelected() {
    const t = this.towerById(this.selectedId);
    if (!t || this.mode !== "playing") return false;
    const refund = this.sellValue(t);
    this.gold += refund;
    this.towers = this.towers.filter((x) => x.id !== t.id);
    this.selectedId = null;
    this.log("sell", refund, 0, `sold ${TOWERS[t.kind].name} refund=${refund} of invested=${t.invested}`);
    return true;
  }
  beginWave() {
    if (this.mode !== "playing" || !this.betweenWaves) return;
    if (this.wave >= WAVE_COUNT) return;
    this.wave += 1;
    this.betweenWaves = false;
    this.queue = [];
    const spec = WAVES[this.wave - 1];
    Object.keys(spec).forEach((k) => {
      const n = spec[k] ?? 0;
      for (let i = 0; i < n; i++) this.queue.push(k);
    });
    for (let i = this.queue.length - 1; i > 0; i--) {
      const j = Math.floor(this.rand() * (i + 1));
      [this.queue[i], this.queue[j]] = [this.queue[j], this.queue[i]];
    }
    this.spawnTimer = 0.35;
    this.log("wave", 0, 0, `wave ${this.wave}/${WAVE_COUNT} queued=${this.queue.length} hpScale=${hpScale(this.wave).toFixed(2)}`);
  }
  spawn(kind) {
    const def = ENEMIES[kind];
    const scale = hpScale(this.wave);
    const hp = def.hp * scale;
    const p = posAt(0);
    this.enemies.push({
      id: this.nextId++,
      kind,
      hp,
      maxHp: hp,
      gold: def.gold,
      radius: def.radius,
      color: def.color,
      dist: 0,
      x: p.x,
      y: p.y,
      baseSpeed: def.speed,
      slowTimer: 0,
      slowFactor: 1,
      burnTimer: 0,
      burnDps: 0,
      alive: true
    });
  }
  kill(e) {
    e.alive = false;
    this.earn(e.gold);
    this.kills += 1;
    if (!this.quiet) {
      this.floaters.push({ x: e.x, y: e.y, text: `+${e.gold}`, color: "#c4b48a", life: 1 });
      for (let i = 0; i < 6; i++) {
        this.particles.push({
          x: e.x,
          y: e.y,
          vx: (this.rand() - 0.5) * 110,
          vy: (this.rand() - 0.5) * 110,
          life: 0.35,
          color: e.color,
          size: 3
        });
      }
    }
    if (!this.quiet) this.log("kill", e.gold, 0, `${e.kind} +${e.gold}g`);
  }
  leak(e) {
    e.alive = false;
    this.lives -= 1;
    this.leaks += 1;
    this.log("leak", 0, -1, `${e.kind} leaked lives=${this.lives}`);
    if (this.lives <= 0) {
      this.lives = 0;
      this.mode = "defeat";
      this.log("lose", 0, 0, `endpoint defeat wave=${this.wave} kills=${this.kills} leaks=${this.leaks}`);
    }
  }
  step(dt) {
    if (this.mode !== "playing") return;
    this.simTime += dt;
    if (!this.betweenWaves && this.queue.length > 0) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        const k = this.queue.shift();
        if (k) this.spawn(k);
        this.spawnTimer = 0.5;
      }
    }
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const speed = e.slowTimer > 0 ? e.baseSpeed * e.slowFactor : e.baseSpeed;
      if (e.slowTimer > 0) e.slowTimer -= dt;
      if (e.burnTimer > 0) {
        e.burnTimer -= dt;
        e.hp -= e.burnDps * dt;
      }
      e.dist += speed * dt;
      const p = posAt(e.dist);
      e.x = p.x;
      e.y = p.y;
      if (e.dist >= PATH_GEO.length) this.leak(e);
      else if (e.hp <= 0) this.kill(e);
    }
    this.enemies = this.enemies.filter((e) => e.alive);
    for (const t of this.towers) {
      t.cooldown = Math.max(0, t.cooldown - dt);
      if (t.cooldown > 0) continue;
      let best2 = null;
      let bestDist = -1;
      const r2 = t.rangePx * t.rangePx;
      for (const e of this.enemies) {
        const dx = e.x - t.x;
        const dy = e.y - t.y;
        if (dx * dx + dy * dy <= r2 && e.dist > bestDist) {
          best2 = e;
          bestDist = e.dist;
        }
      }
      if (best2) {
        const ang = Math.atan2(best2.y - t.y, best2.x - t.x);
        this.projectiles.push({
          x: t.x,
          y: t.y,
          vx: Math.cos(ang) * t.projectileSpeed,
          vy: Math.sin(ang) * t.projectileSpeed,
          speed: t.projectileSpeed,
          targetId: best2.id,
          damage: t.damage,
          splash: t.splash,
          pierce: t.pierce,
          slow: t.slow,
          slowDuration: t.slowDuration,
          burn: t.burn,
          hit: /* @__PURE__ */ new Set(),
          life: 2.2,
          color: TOWERS[t.kind].color,
          radius: t.splash > 0 ? 6 : 4
        });
        t.cooldown = 1 / t.fireRate;
      }
    }
    for (const p of this.projectiles) {
      const tgt = this.enemies.find((e) => e.id === p.targetId && e.alive);
      if (tgt) {
        const ang = Math.atan2(tgt.y - p.y, tgt.x - p.x);
        p.vx = Math.cos(ang) * p.speed;
        p.vy = Math.sin(ang) * p.speed;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.x < -40 || p.y < -40 || p.x > WORLD_W + 40 || p.y > WORLD_H + 40) p.life = 0;
      for (const e of this.enemies) {
        if (!e.alive || p.hit.has(e.id) || p.life <= 0) continue;
        const dx = p.x - e.x;
        const dy = p.y - e.y;
        const rr = e.radius + p.radius;
        if (dx * dx + dy * dy < rr * rr) {
          p.hit.add(e.id);
          e.hp -= p.damage;
          if (p.slow > 0) {
            e.slowTimer = p.slowDuration;
            e.slowFactor = p.slow;
          }
          if (p.burn > 0) {
            e.burnTimer = 2.5;
            e.burnDps = p.damage * p.burn;
          }
          if (p.splash > 0) {
            const splashR = p.splash * CELL * 0.55;
            const sr2 = splashR * splashR;
            for (const e2 of this.enemies) {
              if (e2.id === e.id || !e2.alive) continue;
              const ddx = e.x - e2.x;
              const ddy = e.y - e2.y;
              if (ddx * ddx + ddy * ddy < sr2) e2.hp -= p.damage * 0.55;
            }
          }
          if (p.pierce <= 0) p.life = 0;
          else p.pierce -= 1;
        }
      }
    }
    this.projectiles = this.projectiles.filter((p) => p.life > 0);
    for (const pt of this.particles) {
      if (this.quiet) break;
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.life -= dt;
      pt.vx *= 0.96;
      pt.vy *= 0.96;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
    for (const f of this.floaters) {
      f.y -= 28 * dt;
      f.life -= dt;
    }
    this.floaters = this.floaters.filter((f) => f.life > 0);
    if (!this.betweenWaves && this.queue.length === 0 && this.enemies.length === 0) {
      this.betweenWaves = true;
      this.waveCooldown = this.autoplay ? 0 : 3.2;
      if (this.wave >= WAVE_COUNT) {
        this.mode = "victory";
        this.log("win", 0, 0, `endpoint victory gold=${this.gold} lives=${this.lives} kills=${this.kills}`);
      }
    }
    if (this.betweenWaves && this.mode === "playing" && this.wave > 0 && this.wave < WAVE_COUNT) {
      this.waveCooldown -= dt;
      if (this.waveCooldown <= 0) this.beginWave();
    }
  }
  clickWorld(x, y) {
    if (this.mode !== "playing") return;
    const c = Math.floor(x / CELL);
    const r = Math.floor(y / CELL);
    const hit = this.towers.find((t) => t.col === c && t.row === r);
    if (hit) {
      this.selectedId = hit.id;
      this.selectedKind = null;
      return;
    }
    if (this.selectedKind) this.place(c, r);
    else this.selectedId = null;
  }
  snapshot() {
    return {
      mode: this.mode,
      gold: this.gold,
      lives: this.lives,
      wave: this.wave,
      waveCount: WAVE_COUNT,
      betweenWaves: this.betweenWaves,
      enemiesAlive: this.enemies.length,
      queued: this.queue.length,
      towers: this.towers.length,
      invested: this.towers.reduce((s, t) => s + t.invested, 0),
      goldEarned: this.goldEarned,
      goldSpent: this.goldSpent,
      kills: this.kills,
      leaks: this.leaks,
      ledger: this.ledger.slice(-8)
    };
  }
};
var PATH_POINTS = PATH_GEO.pts;
var PATH_LENGTH = PATH_GEO.length;

// src/game/tinka.ts
var BUILD_ORDER = [
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
  { kind: "sentry", c: 5, r: 3 }
];
var FILL = [
  [4, 3],
  [2, 3],
  [2, 7],
  [4, 8],
  [5, 6],
  [7, 5],
  [7, 6],
  [9, 5],
  [9, 6],
  [11, 5],
  [10, 3],
  [12, 3],
  [13, 6],
  [13, 8],
  [7, 8],
  [9, 8],
  [6, 8],
  [8, 8]
].map(([c, r]) => ({ c, r }));
var BASELINE = {
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
  preferUpgrade: 1
};
var PREFERRED_PATH = {
  sentry: "rate",
  mortar: "splash",
  frost: "control",
  lance: "pierce"
};
var GENE_KEYS = Object.keys(BASELINE);
function clampGene(k, v) {
  const max = {
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
    preferUpgrade: 1
  };
  return Math.max(0, Math.min(max[k], Math.round(v)));
}
function mutateGenome(src, rng) {
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
function genomeLabel(g) {
  return `b4=${g.minBodies4} b8=${g.minBodies8} frost=${g.frostMax}@${g.frostAfter} mortar=${g.mortarMax}@${g.mortarAfter} lance=${g.lanceMax}@${g.lanceAfter} res=${g.reserve} up@${g.upgradeWhen}`;
}
function occupied(g) {
  return new Set(g.towers.map((t) => `${t.col},${t.row}`));
}
function countKind(g, kind) {
  return g.towers.filter((t) => t.kind === kind).length;
}
function kindAllowed(kind, g, genome) {
  const n = g.towers.length;
  if (kind === "frost") return genome.frostMax > 0 && n >= genome.frostAfter && countKind(g, "frost") < genome.frostMax;
  if (kind === "mortar") return genome.mortarMax > 0 && n >= genome.mortarAfter && countKind(g, "mortar") < genome.mortarMax;
  if (kind === "lance") return genome.lanceMax > 0 && n >= genome.lanceAfter && countKind(g, "lance") < genome.lanceMax;
  return true;
}
function nextNode(kind, owned) {
  const path = TOWERS[kind].trees[PREFERRED_PATH[kind]];
  for (const node of path.nodes) {
    if (owned.has(node.id)) continue;
    if (node.requires && !owned.has(node.requires)) return null;
    return node;
  }
  return null;
}
function cheapestUpgrade(g) {
  let best2 = null;
  for (const t of g.towers) {
    const node = nextNode(t.kind, t.owned);
    if (!node || !g.canBuy(t, node)) continue;
    if (!best2 || node.cost < best2.node.cost) best2 = { id: t.id, node };
  }
  return best2;
}
function placeNext(g, genome) {
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
var active = { ...BASELINE };
var best = { ...BASELINE };
var bestReward = 14310;
var generation = 0;
var games = 0;
var nextSeed = 15;
var mutateState = 2654435769;
function mutateRand() {
  mutateState |= 0;
  mutateState = mutateState + 1831565813 | 0;
  let t = Math.imul(mutateState ^ mutateState >>> 15, 1 | mutateState);
  t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
  return ((t ^ t >>> 14) >>> 0) / 4294967296;
}
function tinkaAct(g, genome = active) {
  if (g.mode === "title") {
    g.start(g.seed);
    return "start";
  }
  if (g.mode !== "playing") return null;
  const sentryCost = TOWERS.sentry.cost;
  const needMoreBodies = g.towers.length < 4 || g.wave >= 4 && g.towers.length < genome.minBodies4 || g.wave >= 8 && g.towers.length < genome.minBodies8;
  if (!needMoreBodies && g.towers.length >= genome.upgradeWhen && genome.preferUpgrade) {
    const up2 = cheapestUpgrade(g);
    const floor = g.towers.length < 10 ? Math.max(genome.reserve, sentryCost) : 0;
    if (up2 && g.gold - up2.node.cost >= floor) {
      if (g.buyUpgrade(up2.id, up2.node.id)) {
        const t = g.towerById(up2.id);
        return `upgrade ${t ? TOWERS[t.kind].name : "?"} ${up2.node.name}`;
      }
    }
  }
  const placed = placeNext(g, genome);
  if (placed) return placed;
  const up = cheapestUpgrade(g);
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
function reward(s) {
  const win = s.mode === "victory" ? 1e4 : 0;
  return win + s.lives * 100 + s.goldEarned + s.gold - s.leaks * 50;
}
function simulate(seed2, genome = active, maxTicks = 4e5) {
  const g = new Game();
  g.quiet = true;
  g.autoplay = true;
  g.seed = seed2;
  g.start(seed2);
  let ticks = 0;
  let idle = 0;
  while (g.mode === "playing" && ticks < maxTicks) {
    const acted = ticks % 6 === 0 || g.betweenWaves ? tinkaAct(g, genome) : null;
    g.step(TICK);
    ticks++;
    idle = acted ? 0 : idle + 1;
    if (idle > 8e3 && g.betweenWaves) break;
  }
  const s = g.snapshot();
  return {
    seed: seed2,
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
    leakNotes: g.ledger.filter((e) => e.kind === "leak").map((e) => e.note)
  };
}
function scoreGenome(genome, startSeed, n = 3) {
  let sum = 0;
  for (let i = 0; i < n; i++) sum += simulate(startSeed + i, genome).reward;
  return Math.round(sum / n);
}
function evolve(iters2 = 12, startSeed = 15) {
  const steps = [];
  let current = { ...best };
  let currentScore = scoreGenome(current, startSeed, 3);
  for (let i = 0; i < iters2; i++) {
    const cand = mutateGenome(current, mutateRand);
    const seed2 = startSeed + i;
    const result = simulate(seed2, cand);
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
      seed: seed2,
      reward: mean,
      kept,
      genome: genomeLabel(cand),
      result
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
      "hollowgate-tinka",
      JSON.stringify({ best, bestReward, generation, games, nextSeed })
    );
  } catch {
  }
}

// scripts/tinka-evolve.mjs
var { values } = parseArgs({
  options: {
    iters: { type: "string", default: "12" },
    seed: { type: "string", default: "15" }
  }
});
var iters = Math.max(1, Math.min(200, Number(values.iters) || 12));
var seed = Math.max(1, Number(values.seed) || 15);
var baseline = simulate(seed, BASELINE);
process.stdout.write(
  `baseline seed=${seed} mode=${baseline.mode} earned=${baseline.earned} leftover=${baseline.gold} leaks=${baseline.leaks} reward=${baseline.reward}
`
);
var out = evolve(iters, seed);
process.stdout.write(
  `evolved iters=${iters} bestReward=${out.bestReward} genome=${genomeLabel(out.best)}
`
);
for (const step of out.steps) {
  process.stdout.write(
    `  gen ${step.gen} seed ${step.seed} mean=${step.reward} ${step.kept ? "KEEP" : "drop"} ${step.genome} run=${step.result.mode} g${step.result.gold} L${step.result.lives}
`
  );
}
process.stdout.write(`${JSON.stringify({ best: out.best, bestReward: out.bestReward, baseline })}
`);

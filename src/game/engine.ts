import {
  CELL,
  ENEMIES,
  type EnemyKind,
  hpScale,
  PATH,
  PATH_SET,
  SELL_RATE,
  START_GOLD,
  START_LIVES,
  TOWERS,
  type TowerKind,
  type UpgradeNode,
  WAVE_COUNT,
  WAVES,
  WORLD_H,
  WORLD_W,
} from "./config.ts";

export type LedgerKind = "place" | "upgrade" | "sell" | "kill" | "leak" | "wave" | "win" | "lose";

export type LedgerEvent = {
  id: number;
  simTime: number;
  kind: LedgerKind;
  goldDelta: number;
  goldAfter: number;
  livesDelta: number;
  livesAfter: number;
  note: string;
};

export type Mode = "title" | "playing" | "victory" | "defeat";

type PathPt = { x: number; y: number; dist: number };

function buildPath(): { pts: PathPt[]; length: number } {
  const pts: PathPt[] = [];
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

const PATH_GEO = buildPath();

function posAt(dist: number): { x: number; y: number } {
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

export type Tower = {
  id: number;
  kind: TowerKind;
  col: number;
  row: number;
  x: number;
  y: number;
  owned: Set<string>;
  cooldown: number;
  damage: number;
  fireRate: number;
  rangePx: number;
  splash: number;
  pierce: number;
  slow: number;
  slowDuration: number;
  burn: number;
  projectileSpeed: number;
  invested: number;
};

export type Enemy = {
  id: number;
  kind: EnemyKind;
  hp: number;
  maxHp: number;
  gold: number;
  radius: number;
  color: string;
  dist: number;
  x: number;
  y: number;
  baseSpeed: number;
  slowTimer: number;
  slowFactor: number;
  burnTimer: number;
  burnDps: number;
  alive: boolean;
};

type Proj = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  speed: number;
  targetId: number;
  damage: number;
  splash: number;
  pierce: number;
  slow: number;
  slowDuration: number;
  burn: number;
  hit: Set<number>;
  life: number;
  color: string;
  radius: number;
};

export type Particle = { x: number; y: number; vx: number; vy: number; life: number; color: string; size: number };
export type Floater = { x: number; y: number; text: string; color: string; life: number };

export type Snapshot = {
  mode: Mode;
  gold: number;
  lives: number;
  wave: number;
  waveCount: number;
  betweenWaves: boolean;
  enemiesAlive: number;
  queued: number;
  towers: number;
  invested: number;
  goldEarned: number;
  goldSpent: number;
  kills: number;
  leaks: number;
  ledger: LedgerEvent[];
};

function recompute(t: Tower) {
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

export class Game {
  mode: Mode = "title";
  gold = START_GOLD;
  lives = START_LIVES;
  wave = 0;
  betweenWaves = true;
  waveCooldown = 0;
  simTime = 0;
  towers: Tower[] = [];
  enemies: Enemy[] = [];
  projectiles: Proj[] = [];
  particles: Particle[] = [];
  floaters: Floater[] = [];
  queue: EnemyKind[] = [];
  spawnTimer = 0;
  selectedKind: TowerKind | null = null;
  selectedId: number | null = null;
  ledger: LedgerEvent[] = [];
  goldEarned = 0;
  goldSpent = 0;
  kills = 0;
  leaks = 0;
  nextId = 1;
  ledgerId = 1;
  hover: { c: number; r: number } | null = null;
  autoplay = false;
  quiet = false;
  seed = 1;
  rngState = 1;

  rand(): number {
    this.rngState |= 0;
    this.rngState = (this.rngState + 0x6d2b79f5) | 0;
    let t = Math.imul(this.rngState ^ (this.rngState >>> 15), 1 | this.rngState);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  private log(kind: LedgerKind, goldDelta: number, livesDelta: number, note: string) {
    this.ledger.push({
      id: this.ledgerId++,
      simTime: Math.round(this.simTime * 100) / 100,
      kind,
      goldDelta,
      goldAfter: this.gold,
      livesDelta,
      livesAfter: this.lives,
      note,
    });
    if (this.ledger.length > 80) this.ledger.splice(0, this.ledger.length - 80);
  }

  spend(n: number): boolean {
    if (n <= 0 || this.gold < n) return false;
    this.gold -= n;
    this.goldSpent += n;
    return true;
  }

  earn(n: number) {
    if (n <= 0) return;
    this.gold += n;
    this.goldEarned += n;
  }

  start(seed?: number) {
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
    if (seed !== undefined) this.seed = seed >>> 0 || 1;
    this.rngState = this.seed || 1;
    this.log("wave", 0, 0, `start gold=${START_GOLD} lives=${START_LIVES} endpoint=wave ${WAVE_COUNT} seed=${this.seed}`);
  }

  sellValue(t: Tower): number {
    return Math.floor(t.invested * SELL_RATE);
  }

  canPlace(c: number, r: number, kind: TowerKind): boolean {
    if (c < 0 || c >= 16 || r < 0 || r >= 9) return false;
    if (PATH_SET.has(`${c},${r}`)) return false;
    if (this.towers.some((t) => t.col === c && t.row === r)) return false;
    return this.gold >= TOWERS[kind].cost;
  }

  place(c: number, r: number): boolean {
    if (this.mode !== "playing" || !this.selectedKind) return false;
    const kind = this.selectedKind;
    if (!this.canPlace(c, r, kind)) return false;
    const def = TOWERS[kind];
    if (!this.spend(def.cost)) return false;
    const t: Tower = {
      id: this.nextId++,
      kind,
      col: c,
      row: r,
      x: c * CELL + CELL / 2,
      y: r * CELL + CELL / 2,
      owned: new Set(),
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
      invested: def.cost,
    };
    recompute(t);
    this.towers.push(t);
    this.selectedId = t.id;
    this.log("place", -def.cost, 0, `${def.name} @${c},${r} cost=${def.cost}`);
    return true;
  }

  placeKind(kind: TowerKind, c: number, r: number): boolean {
    this.selectedKind = kind;
    return this.place(c, r);
  }

  towerById(id: number | null): Tower | undefined {
    return this.towers.find((t) => t.id === id);
  }

  pathOfNode(kind: TowerKind, nodeId: string): string | null {
    const def = TOWERS[kind];
    for (const [k, p] of Object.entries(def.trees)) {
      if (p.nodes.some((n) => n.id === nodeId)) return k;
    }
    return null;
  }

  canBuy(t: Tower, node: UpgradeNode): boolean {
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

  buyUpgrade(towerId: number, nodeId: string): boolean {
    const t = this.towerById(towerId);
    if (!t || this.mode !== "playing") return false;
    const def = TOWERS[t.kind];
    let node: UpgradeNode | undefined;
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

  sellSelected(): boolean {
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
    (Object.keys(spec) as EnemyKind[]).forEach((k) => {
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

  private spawn(kind: EnemyKind) {
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
      alive: true,
    });
  }

  private kill(e: Enemy) {
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
          size: 3,
        });
      }
    }
    if (!this.quiet) this.log("kill", e.gold, 0, `${e.kind} +${e.gold}g`);
  }

  private leak(e: Enemy) {
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

  step(dt: number) {
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
      let best: Enemy | null = null;
      let bestDist = -1;
      const r2 = t.rangePx * t.rangePx;
      for (const e of this.enemies) {
        const dx = e.x - t.x;
        const dy = e.y - t.y;
        if (dx * dx + dy * dy <= r2 && e.dist > bestDist) {
          best = e;
          bestDist = e.dist;
        }
      }
      if (best) {
        const ang = Math.atan2(best.y - t.y, best.x - t.x);
        this.projectiles.push({
          x: t.x,
          y: t.y,
          vx: Math.cos(ang) * t.projectileSpeed,
          vy: Math.sin(ang) * t.projectileSpeed,
          speed: t.projectileSpeed,
          targetId: best.id,
          damage: t.damage,
          splash: t.splash,
          pierce: t.pierce,
          slow: t.slow,
          slowDuration: t.slowDuration,
          burn: t.burn,
          hit: new Set(),
          life: 2.2,
          color: TOWERS[t.kind].color,
          radius: t.splash > 0 ? 6 : 4,
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

  clickWorld(x: number, y: number) {
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

  snapshot(): Snapshot {
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
      ledger: this.ledger.slice(-8),
    };
  }
}

export const PATH_POINTS = PATH_GEO.pts;
export const PATH_LENGTH = PATH_GEO.length;

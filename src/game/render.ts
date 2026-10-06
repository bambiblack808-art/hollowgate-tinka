import { CELL, COLS, ROWS, TOWERS, WORLD_H, WORLD_W } from "./config";
import { Game, PATH_POINTS } from "./engine";

export function drawWorld(ctx: CanvasRenderingContext2D, game: Game) {
  ctx.clearRect(0, 0, WORLD_W, WORLD_H);
  ctx.fillStyle = "#1a2420";
  ctx.fillRect(0, 0, WORLD_W, WORLD_H);

  ctx.strokeStyle = "rgba(255,255,255,0.04)";
  ctx.lineWidth = 1;
  for (let c = 0; c <= COLS; c++) {
    ctx.beginPath();
    ctx.moveTo(c * CELL, 0);
    ctx.lineTo(c * CELL, WORLD_H);
    ctx.stroke();
  }
  for (let r = 0; r <= ROWS; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * CELL);
    ctx.lineTo(WORLD_W, r * CELL);
    ctx.stroke();
  }

  ctx.strokeStyle = "#4a3a2c";
  ctx.lineWidth = 54;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  PATH_POINTS.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.stroke();
  ctx.strokeStyle = "#8a7040";
  ctx.lineWidth = 3;
  ctx.setLineDash([8, 8]);
  ctx.stroke();
  ctx.setLineDash([]);

  const gate = PATH_POINTS[PATH_POINTS.length - 1];
  ctx.fillStyle = "#3a2e24";
  ctx.fillRect(gate.x - 16, gate.y - 26, 32, 52);
  ctx.fillStyle = "#c45c4a";
  ctx.fillRect(gate.x - 8, gate.y - 16, 16, 32);

  const spawn = PATH_POINTS[0];
  ctx.fillStyle = "#2a3a2e";
  ctx.beginPath();
  ctx.arc(spawn.x, spawn.y, 10, 0, Math.PI * 2);
  ctx.fill();

  if (game.hover && game.selectedKind && game.mode === "playing") {
    const { c, r } = game.hover;
    const valid = game.canPlace(c, r, game.selectedKind);
    const def = TOWERS[game.selectedKind];
    const x = c * CELL + CELL / 2;
    const y = r * CELL + CELL / 2;
    ctx.beginPath();
    ctx.arc(x, y, def.range * CELL, 0, Math.PI * 2);
    ctx.fillStyle = valid ? "rgba(111,154,114,0.1)" : "rgba(196,92,74,0.1)";
    ctx.fill();
    ctx.strokeStyle = valid ? "rgba(111,154,114,0.4)" : "rgba(196,92,74,0.45)";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  for (const t of game.towers) {
    const def = TOWERS[t.kind];
    if (game.selectedId === t.id) {
      ctx.beginPath();
      ctx.arc(t.x, t.y, t.rangePx, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(138,154,138,0.08)";
      ctx.fill();
      ctx.strokeStyle = "rgba(138,154,138,0.4)";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(t.x, t.y, 20, 0, Math.PI * 2);
    ctx.fillStyle = "#1e2329";
    ctx.fill();
    ctx.strokeStyle = def.color;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(t.x, t.y, 12, 0, Math.PI * 2);
    ctx.fillStyle = def.color;
    ctx.fill();
    const n = t.owned.size;
    if (n) {
      ctx.fillStyle = "#c4b48a";
      for (let i = 0; i < Math.min(n, 6); i++) {
        ctx.fillRect(t.x - 10 + i * 4, t.y + 16, 3, 3);
      }
    }
  }

  for (const e of game.enemies) {
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
    ctx.fillStyle = e.color;
    ctx.fill();
    const bw = e.radius * 2;
    const pct = Math.max(0, e.hp / e.maxHp);
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(e.x - bw / 2, e.y - e.radius - 9, bw, 3);
    ctx.fillStyle = pct > 0.4 ? "#6f9a72" : "#c45c4a";
    ctx.fillRect(e.x - bw / 2, e.y - e.radius - 9, bw * pct, 3);
  }

  for (const p of game.projectiles) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.fill();
  }
  for (const pt of game.particles) {
    ctx.globalAlpha = Math.max(0, pt.life * 2);
    ctx.fillStyle = pt.color;
    ctx.fillRect(pt.x, pt.y, pt.size, pt.size);
  }
  ctx.globalAlpha = 1;
  ctx.font = "bold 13px ui-monospace, monospace";
  ctx.textAlign = "center";
  for (const f of game.floaters) {
    ctx.globalAlpha = Math.max(0, f.life);
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = "left";
}

export { WORLD_W, WORLD_H };

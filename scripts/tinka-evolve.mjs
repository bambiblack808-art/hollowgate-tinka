#!/usr/bin/env node
/**
 * Headless Tinka hill-climb on the real Hollowgate engine.
 * Same spend/earn/ledger as the browser. No invented gold.
 *
 *   node --experimental-strip-types --no-warnings scripts/tinka-evolve.mjs --iters 12 --seed 15
 */
import { parseArgs } from "node:util";
import { evolve, simulate, genomeLabel, BASELINE } from "../src/game/tinka.ts";

const { values } = parseArgs({
  options: {
    iters: { type: "string", default: "12" },
    seed: { type: "string", default: "15" },
  },
});

const iters = Math.max(1, Math.min(200, Number(values.iters) || 12));
const seed = Math.max(1, Number(values.seed) || 15);

const baseline = simulate(seed, BASELINE);
process.stdout.write(
  `baseline seed=${seed} mode=${baseline.mode} earned=${baseline.earned} leftover=${baseline.gold} leaks=${baseline.leaks} reward=${baseline.reward}\n`,
);

const out = evolve(iters, seed);
process.stdout.write(
  `evolved iters=${iters} bestReward=${out.bestReward} genome=${genomeLabel(out.best)}\n`,
);
for (const step of out.steps) {
  process.stdout.write(
    `  gen ${step.gen} seed ${step.seed} mean=${step.reward} ${step.kept ? "KEEP" : "drop"} ${step.genome} run=${step.result.mode} g${step.result.gold} L${step.result.lives}\n`,
  );
}
process.stdout.write(`${JSON.stringify({ best: out.best, bestReward: out.bestReward, baseline })}\n`);

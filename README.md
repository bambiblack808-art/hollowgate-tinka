# Hollowgate Tinka

Tower defense engine + Tinka autoplay. Gold, lives, and leftover are ledger values from the same simulation the game runs.

**Solved (fillCap 14, deepen Rapid/Gatling):** 40/40 wins, 0 leaks, 2235 earned, **185 leftover**, spent 2170, 14 towers, reward **14420**.

## Cloud Shell (from home, no npm install)

```bash
curl -fsSL https://raw.githubusercontent.com/bambiblack808-art/hollowgate-tinka/main/hollowgate-cloud.mjs -o ~/hollowgate-cloud.mjs
node ~/hollowgate-cloud.mjs --iters 12 --seed 15
```

Expected:

```
baseline seed=15 mode=victory earned=2235 leftover=185 leaks=0 reward=14420
```

## From this repo

```bash
git clone https://github.com/bambiblack808-art/hollowgate-tinka.git
cd hollowgate-tinka
node hollowgate-cloud.mjs --iters 12 --seed 15
```

Engine source: `src/game/` (`engine.ts` spend/earn/ledger, `tinka.ts` policy).

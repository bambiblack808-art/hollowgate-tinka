# Hollowgate Extraction Surface

**Status:** engine solved. Surface live as of this commit.

## Ledger (real engine only)

| Metric | Value |
|--------|-------|
| Wins | 40/40 |
| Leaks | 0 |
| Earned | 2235 |
| Spent | 2170 |
| **Leftover gold** | **185** |
| Towers | 14 (fillCap 14, Rapid/Gatling deep) |
| **Reward** | **14420** |

Reward formula (same as engine):

```
reward = (victory ? 10000 : 0) + lives*100 + goldEarned + leftoverGold - leaks*50
```

No invented gold. Spend/earn come from `src/game/engine.ts`.

## Public challenge (extraction mechanism)

1. Run the zero-dep runner:
   ```bash
   curl -fsSL https://raw.githubusercontent.com/bambiblack808-art/hollowgate-tinka/main/hollowgate-cloud.mjs -o ~/hollowgate-cloud.mjs
   node ~/hollowgate-cloud.mjs --iters 12 --seed 15
   ```
2. Paste the final JSON line into an issue titled `score: <reward>`.
3. Beat **14420** leftover-aware reward on seed 15 to claim the board.
4. Optional stakes layer: attach a tip link or on-chain note in the issue body. Engine does not custody funds; the score is the extractable signal.

## Scoreboard schema (issue body)

```json
{
  "seed": 15,
  "reward": 14420,
  "mode": "victory",
  "earned": 2235,
  "leftover": 185,
  "leaks": 0,
  "genome": "fillCap=14,...",
  "runner": "hollowgate-cloud.mjs",
  "commit": "main"
}
```

## Why this is the money path

- Closed sim optimization is finished.
- Public, verifiable leftover gold is the product surface.
- Creative digital extraction = challenge market on a solved ledger, not another private hill-climb.

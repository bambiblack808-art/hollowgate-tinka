import { create } from "zustand";
import type { LedgerEvent, Mode, Snapshot } from "./engine";
import { START_GOLD, START_LIVES, WAVE_COUNT } from "./config";

type Hud = Snapshot & {
  toast: string;
  autoplay: boolean;
  lastAct: string;
  generation: number;
  bestReward: number;
  genome: string;
};

const empty: Hud = {
  mode: "title",
  gold: START_GOLD,
  lives: START_LIVES,
  wave: 0,
  waveCount: WAVE_COUNT,
  betweenWaves: true,
  enemiesAlive: 0,
  queued: 0,
  towers: 0,
  invested: 0,
  goldEarned: 0,
  goldSpent: 0,
  kills: 0,
  leaks: 0,
  ledger: [] as LedgerEvent[],
  toast: "",
  autoplay: false,
  lastAct: "",
  generation: 0,
  bestReward: 14420,
  genome: "",
};

export const useHud = create<
  Hud & {
    sync: (
      s: Snapshot,
      extra?: { toast?: string; autoplay?: boolean; lastAct?: string; generation?: number; bestReward?: number; genome?: string },
    ) => void;
  }
>((set) => ({
  ...empty,
  sync: (s, extra) =>
    set((prev) => ({
      ...s,
      toast: extra?.toast ?? prev.toast,
      autoplay: extra?.autoplay ?? prev.autoplay,
      lastAct: extra?.lastAct ?? prev.lastAct,
      generation: extra?.generation ?? prev.generation,
      bestReward: extra?.bestReward ?? prev.bestReward,
      genome: extra?.genome ?? prev.genome,
    })),
}));

export type { Mode };

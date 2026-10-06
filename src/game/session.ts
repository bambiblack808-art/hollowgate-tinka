import { Game } from "./engine";
import { bindTinka } from "./tinka";

/** One simulation instance — HUD and canvas both read this. */
export const game = new Game();
export const tinka = bindTinka(game);

if (typeof window !== "undefined") {
  const w = window as unknown as { __game: Game; __tinka: typeof tinka };
  w.__game = game;
  w.__tinka = tinka;
}

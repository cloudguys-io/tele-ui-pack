import type { Layout } from "./types.ts";

/** One video tile as the stage sees it: a participant's camera or screen share. */
export type TileRef = { key: string; screen: boolean; local: boolean };

/** `focus` is the tile shown large; null means an even grid of `rest`. */
export type Arrangement = { focus: string | null; rest: string[] };

/**
 * Decide what takes the stage, in order:
 * 1. the tile this viewer pinned, if it is still in the call;
 * 2. someone else's screen share (your own is not put on the stage, so you don't watch a copy of your screen);
 * 3. in speaker layout, `speaker` (the active speaker's camera, chosen by the caller), else the first remote tile;
 * 4. otherwise an even grid.
 */
export function arrange(tiles: TileRef[], opts: { layout: Layout; pinned: string | null; speaker: string | null }): Arrangement {
  const keys = tiles.map((t) => t.key);
  const pick = (key: string | null | undefined): Arrangement | null =>
    key && keys.includes(key) && tiles.length > 1 ? { focus: key, rest: keys.filter((k) => k !== key) } : null;
  return pick(opts.pinned)
    ?? pick(tiles.find((t) => t.screen && !t.local)?.key)
    ?? (opts.layout === "speaker" ? pick(opts.speaker) ?? pick(tiles.find((t) => !t.local)?.key) : null)
    ?? { focus: null, rest: keys };
}

/** Pinning the tile that is already pinned unpins it. */
export const togglePin = (pinned: string | null, key: string) => (pinned === key ? null : key);

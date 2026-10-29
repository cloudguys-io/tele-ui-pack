import { test } from "node:test";
import assert from "node:assert/strict";
import { arrange, togglePin, type TileRef } from "./stage.ts";

const cam = (who: string, local = false): TileRef => ({ key: `${who}:camera`, screen: false, local });
const screen = (who: string, local = false): TileRef => ({ key: `${who}:screen_share`, screen: true, local });
const grid = { layout: "grid" as const, pinned: null, speaker: null };

test("an even grid when nobody shares or pins", () => {
  assert.deepEqual(arrange([cam("me", true), cam("ann"), cam("bob")], grid), {
    focus: null, rest: ["me:camera", "ann:camera", "bob:camera"],
  });
});

test("someone else's screen share takes the stage, even in grid layout", () => {
  const tiles = [cam("me", true), cam("ann"), screen("ann"), cam("bob")];
  assert.deepEqual(arrange(tiles, grid), { focus: "ann:screen_share", rest: ["me:camera", "ann:camera", "bob:camera"] });
});

test("your own screen share stays in the grid unless you pin it", () => {
  const tiles = [cam("me", true), screen("me", true), cam("ann")];
  assert.equal(arrange(tiles, grid).focus, null);
  assert.equal(arrange(tiles, { ...grid, pinned: "me:screen_share" }).focus, "me:screen_share");
});

test("a pin beats a screen share and the active speaker", () => {
  const tiles = [cam("me", true), cam("ann"), screen("ann"), cam("bob")];
  assert.equal(arrange(tiles, { layout: "speaker", pinned: "bob:camera", speaker: "ann:camera" }).focus, "bob:camera");
  assert.equal(arrange(tiles, { ...grid, pinned: "me:camera" }).focus, "me:camera");
});

test("a pin on someone who left falls back to the normal rules", () => {
  const tiles = [cam("me", true), cam("ann")];
  assert.deepEqual(arrange(tiles, { ...grid, pinned: "gone:camera" }), { focus: null, rest: ["me:camera", "ann:camera"] });
});

test("speaker layout follows the speaker, else the first remote tile", () => {
  const tiles = [cam("me", true), cam("ann"), cam("bob")];
  assert.equal(arrange(tiles, { layout: "speaker", pinned: null, speaker: "bob:camera" }).focus, "bob:camera");
  assert.equal(arrange(tiles, { layout: "speaker", pinned: null, speaker: null }).focus, "ann:camera");
});

test("alone in the call there is nothing to focus", () => {
  assert.deepEqual(arrange([cam("me", true)], { ...grid, pinned: "me:camera" }), { focus: null, rest: ["me:camera"] });
});

test("pinning the pinned tile unpins it", () => {
  assert.equal(togglePin(null, "a"), "a");
  assert.equal(togglePin("a", "b"), "b");
  assert.equal(togglePin("a", "a"), null);
});

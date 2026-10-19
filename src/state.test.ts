import { test } from "node:test";
import assert from "node:assert/strict";
import { initialState, reduce, type State } from "./state.ts";
import type { JoinResponse } from "./types.ts";

const info: JoinResponse = { ws_url: "wss://lk", token: "t", ice_servers: null, grant_id: "g", role: "host", call: { id: "c", title: "Standup" } };
const run = (s: State, ...actions: Parameters<typeof reduce>[1][]) => actions.reduce(reduce, s);

test("happy path: lobby, joining, live", () => {
  const s = run(initialState(), { type: "join" }, { type: "joinInfo", info }, { type: "connected" });
  assert.equal(s.phase, "live");
  assert.equal(s.info?.call.title, "Standup");
});

test("no lobby starts in joining", () => {
  assert.equal(initialState(false).phase, "joining");
});

test("connected is ignored outside joining", () => {
  const s = initialState();
  assert.equal(reduce(s, { type: "connected" }), s);
});

test("join failure goes to error with the server message", () => {
  const s = run(initialState(), { type: "join" }, { type: "failed", error: { code: "call_full", message: "The call is full." } });
  assert.equal(s.phase, "error");
  assert.deepEqual(s.message, { raw: "The call is full." });
  assert.equal(s.errorCode, "call_full");
});

test("too_early gets the friendly text", () => {
  const s = run(initialState(), { type: "join" }, { type: "failed", error: { code: "too_early", message: "join window not open" } });
  assert.deepEqual(s.message, { key: "tooEarly" });
});

test("failure without a message falls back", () => {
  const s = run(initialState(), { type: "join" }, { type: "failed", error: null });
  assert.deepEqual(s.message, { key: "joinFailed" });
});

test("server disconnect ends the call with a reason", () => {
  const s = run(initialState(), { type: "join" }, { type: "connected" }, { type: "needAudio", value: true }, { type: "disconnected", reason: "room_deleted" });
  assert.equal(s.phase, "ended");
  assert.equal(s.endReason, "room_deleted");
  assert.deepEqual(s.message, { key: "endedRoomDeleted" });
  assert.equal(s.needAudio, false);
});

test("disconnect in the lobby, while joining or after leaving is ignored", () => {
  const lobby = initialState();
  assert.equal(reduce(lobby, { type: "disconnected", reason: "removed" }), lobby);
  // A failed connect emits Disconnected first; the failure must still produce the error screen.
  const failed = run(initialState(), { type: "join" }, { type: "disconnected", reason: "join_failure" }, { type: "failed", error: new Error("room does not exist") });
  assert.equal(failed.phase, "error");
  const left = run(initialState(), { type: "join" }, { type: "connected" }, { type: "leave" });
  assert.equal(reduce(left, { type: "disconnected", reason: "removed" }), left);
});

test("leave keeps the earlier end reason", () => {
  const s = run(initialState(), { type: "join" }, { type: "connected" }, { type: "disconnected", reason: "removed" }, { type: "leave" });
  assert.equal(s.phase, "left");
  assert.equal(s.endReason, "removed");
  const user = run(initialState(), { type: "join" }, { type: "connected" }, { type: "leave" });
  assert.equal(user.endReason, "left");
});

test("chat messages are deduplicated by id", () => {
  const m = { id: "s1", userId: "u", name: "A", body: "hi", mine: false };
  const s = run(initialState(), { type: "chat", message: m }, { type: "chat", message: { ...m, body: "dup" } }, { type: "chat", message: { ...m, id: "s2" } });
  assert.deepEqual(s.messages.map((x) => x.id), ["s1", "s2"]);
  assert.equal(s.messages[0].body, "hi");
});

test("notice ifEmpty keeps the first notice", () => {
  const s = run(initialState(), { type: "notice", text: { key: "micUnavailableJoined" } }, { type: "notice", text: { key: "cameraUnavailableJoined" }, ifEmpty: true });
  assert.deepEqual(s.notice, { key: "micUnavailableJoined" });
});

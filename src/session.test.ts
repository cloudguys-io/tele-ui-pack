import { test } from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { DisconnectReason, RoomEvent } from "livekit-client";
import { CallSession, endReasonOf } from "./session.ts";
import type { JoinResponse, TeleEvents } from "./types.ts";

const join: JoinResponse = {
  ws_url: "wss://lk.example", token: "tok", ice_servers: [{ urls: "turn:t.example" }], grant_id: "g1", role: "participant",
  call: { id: "call1", title: "Standup" },
};

class FakeRoom extends EventEmitter {
  connected: unknown[] | null = null;
  disconnects = 0;
  failConnect: Error | null = null;
  chatHandler: ((reader: unknown, from: { identity: string }) => Promise<void>) | null = null;
  remoteParticipants = new Map<string, { identity: string; name: string; attributes: Record<string, string> }>();
  state = "connected";
  canPlaybackAudio = true;
  published: unknown[] = [];
  localParticipant = {
    identity: "u_1", name: "Ana", sid: "PA_1", attributes: { user_id: "ext-1" } as Record<string, string>,
    publishTrack: async (t: unknown) => { this.published.push(t); },
    setMicrophoneEnabled: async () => {}, setCameraEnabled: async () => {},
    sendText: async () => ({ id: "out-1" }),
  };
  async connect(...args: unknown[]) { if (this.failConnect) throw this.failConnect; this.connected = args; }
  async disconnect() { this.disconnects++; }
  async startAudio() {}
  registerTextStreamHandler(_t: string, h: FakeRoom["chatHandler"]) { this.chatHandler = h; }
  unregisterTextStreamHandler() { this.chatHandler = null; }
  getParticipantByIdentity(id: string) { return this.remoteParticipants.get(id); }
}

function setup(over: Partial<{ getJoin: () => Promise<JoinResponse>; lobby: boolean }> = {}) {
  const room = new FakeRoom();
  const events: { type: keyof TeleEvents; detail: unknown }[] = [];
  const session = new CallSession({
    room: room as never, lobby: over.lobby ?? true, getJoin: over.getJoin ?? (async () => join),
    onChange: () => {}, emit: (type, detail) => { events.push({ type, detail }); },
    loadChatHistory: async () => [
      { stream_id: "h1", user_id: "ext-1", name: "Ana", body: "earlier" },
      { stream_id: "h2", user_id: "ext-2", name: "Bo", body: "hello" },
    ],
  });
  return { room, session, events, types: () => events.map((e) => e.type) };
}

const flush = () => new Promise((r) => setTimeout(r, 0));

test("join connects with the ICE servers from the join response and publishes lobby tracks", async () => {
  const { room, session, types } = setup();
  const audio = { stop() {} }, video = { stop() {} };
  await session.join({ audio: audio as never, video: video as never });
  assert.equal(session.state.phase, "live");
  assert.deepEqual(room.connected, ["wss://lk.example", "tok", { rtcConfig: { iceServers: join.ice_servers } }]);
  assert.deepEqual(room.published, [audio, video]);
  assert.deepEqual(types(), ["tele-joined"]);
  await flush();
  const hist = session.state.messages;
  assert.deepEqual(hist.map((m) => [m.id, m.mine]), [["h1", true], ["h2", false]]);
});

test("null ice_servers leaves LiveKit's defaults", async () => {
  const { room, session } = setup({ getJoin: async () => ({ ...join, ice_servers: null }) });
  await session.join({});
  assert.deepEqual((room.connected as unknown[])[2], { rtcConfig: undefined });
});

test("getJoin failure moves to error and fires tele-error, stopping lobby tracks", async () => {
  let stopped = 0;
  const err = Object.assign(new Error("This call isn't open yet."), { code: "too_early" });
  const { session, events } = setup({ getJoin: async () => { throw err; } });
  await session.join({ audio: { stop: () => stopped++ } as never });
  assert.equal(session.state.phase, "error");
  assert.deepEqual(session.state.message, { key: "tooEarly" });
  assert.equal(stopped, 1);
  assert.deepEqual(events[0], { type: "tele-error", detail: { code: "too_early", message: "This call isn't open yet.", error: err } });
});

test("server disconnect ends the call; dismissing it fires tele-leave with that reason", async () => {
  const { room, session, events } = setup();
  await session.join({});
  room.emit(RoomEvent.Disconnected, DisconnectReason.ROOM_DELETED);
  assert.equal(session.state.phase, "ended");
  assert.equal(session.state.endReason, "room_deleted");
  await session.leave();
  assert.deepEqual(events.at(-1), { type: "tele-leave", detail: { reason: "room_deleted" } });
});

test("user leave disconnects and the following Disconnected event is ignored", async () => {
  const { room, session, events } = setup();
  await session.join({});
  await session.leave();
  room.emit(RoomEvent.Disconnected, DisconnectReason.CLIENT_INITIATED);
  assert.equal(session.state.phase, "left");
  assert.equal(room.disconnects, 1);
  assert.deepEqual(events.at(-1), { type: "tele-leave", detail: { reason: "left" } });
});

test("participants and chat fire events; chat dedupes", async () => {
  const { room, session, events } = setup();
  await session.join({});
  await flush();
  const bo = { identity: "u_2", name: "Bo", attributes: { user_id: "ext-2" } };
  room.remoteParticipants.set(bo.identity, bo);
  room.emit(RoomEvent.ParticipantConnected, bo);
  const reader = { info: { id: "s9" }, readAll: async () => "hey" };
  await room.chatHandler!(reader, { identity: "u_2" });
  await room.chatHandler!(reader, { identity: "u_2" });
  await session.sendChat("  mine  ");
  const chats = events.filter((e) => e.type === "tele-chat").map((e) => e.detail as { id: string; body: string; mine: boolean; userId: string });
  assert.deepEqual(chats.map((c) => [c.id, c.body, c.mine]), [["s9", "hey", false], ["out-1", "mine", true]]);
  assert.equal(chats[0].userId, "ext-2");
  assert.deepEqual(events.find((e) => e.type === "tele-participant")?.detail, { action: "joined", identity: "u_2", name: "Bo", count: 2 });
});

test("without a lobby the default devices are turned on after connecting", async () => {
  const { room, session } = setup({ lobby: false });
  const on: string[] = [];
  room.localParticipant.setMicrophoneEnabled = async () => { on.push("mic"); };
  room.localParticipant.setCameraEnabled = async () => { throw new Error("NotAllowedError"); };
  assert.equal(session.state.phase, "joining");
  await session.join(null);
  assert.deepEqual(on, ["mic"]);
  assert.deepEqual(session.state.notice, { key: "cameraUnavailableJoined" });
});

test("dispose during getJoin disconnects without events", async () => {
  let release!: (j: JoinResponse) => void;
  const { room, session, events } = setup({ getJoin: () => new Promise((r) => { release = r; }) });
  const p = session.join({});
  await session.dispose();
  release(join);
  await p;
  assert.equal(room.connected, null);
  assert.deepEqual(events, []);
});

test("disconnect reasons map to end reasons", () => {
  assert.equal(endReasonOf(DisconnectReason.DUPLICATE_IDENTITY), "duplicate_identity");
  assert.equal(endReasonOf(DisconnectReason.PARTICIPANT_REMOVED), "removed");
  assert.equal(endReasonOf(undefined), "disconnected");
});

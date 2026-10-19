// The call session state machine. Pure: no LiveKit, no DOM, so it is unit tested directly.
//
//   lobby --join--> joining --connected--> live
//     |               |                     |
//     |               +--failed--> error    +--disconnected--> ended
//     +------------- any --leave--> left (terminal; a retry builds a new session)
import type { ChatMessage, EndReason, JoinResponse } from "./types.ts";
import type { StringKey, Text } from "./i18n.ts";

export type Phase = "lobby" | "joining" | "live" | "ended" | "error" | "left";

export type State = {
  phase: Phase;
  info: JoinResponse | null;
  message: Text | null; // shown on the ended and error screens
  endReason: EndReason | null;
  errorCode: string | null;
  notice: Text | null; // one-line banner while live
  needAudio: boolean;
  messages: ChatMessage[];
  seen: ReadonlySet<string>;
};

export type Action =
  | { type: "join" }
  | { type: "joinInfo"; info: JoinResponse }
  | { type: "connected" }
  | { type: "failed"; error: unknown }
  | { type: "disconnected"; reason: EndReason }
  | { type: "leave" }
  | { type: "notice"; text: Text | null; ifEmpty?: boolean }
  | { type: "needAudio"; value: boolean }
  | { type: "chat"; message: ChatMessage };

export const initialState = (withLobby = true): State => ({
  phase: withLobby ? "lobby" : "joining",
  info: null, message: null, endReason: null, errorCode: null, notice: null, needAudio: false,
  messages: [], seen: new Set(),
});

const END_TEXT: Record<EndReason, StringKey> = {
  left: "endedLeft",
  room_deleted: "endedRoomDeleted",
  duplicate_identity: "endedDuplicate",
  removed: "endedRemoved",
  join_failure: "endedJoinFailure",
  disconnected: "endedDisconnected",
  error: "joinFailed",
};

export const endText = (reason: EndReason): Text => ({ key: END_TEXT[reason] });

// Errors from getJoin(). Tele API errors carry { code, message }; "too_early" has its own friendly text.
export function errorText(error: unknown): { text: Text; code: string | null } {
  const e = (error ?? {}) as { code?: unknown; message?: unknown };
  const code = typeof e.code === "string" ? e.code : null;
  if (code === "too_early") return { text: { key: "tooEarly" }, code };
  if (typeof e.message === "string" && e.message) return { text: { raw: e.message }, code };
  return { text: { key: "joinFailed" }, code };
}

export function reduce(s: State, a: Action): State {
  switch (a.type) {
    case "join":
      return s.phase === "lobby" ? { ...s, phase: "joining" } : s;
    case "joinInfo":
      return s.phase === "joining" ? { ...s, info: a.info } : s;
    case "connected":
      return s.phase === "joining" ? { ...s, phase: "live" } : s;
    case "failed": {
      if (s.phase !== "joining") return s;
      const { text, code } = errorText(a.error);
      return { ...s, phase: "error", message: text, errorCode: code, endReason: "error" };
    }
    case "disconnected":
      // While joining, LiveKit fires Disconnected before connect() rejects; the failure decides the screen.
      if (s.phase !== "live") return s;
      return { ...s, phase: "ended", message: endText(a.reason), endReason: a.reason, needAudio: false };
    case "leave":
      if (s.phase === "left") return s;
      return { ...s, phase: "left", message: endText("left"), endReason: s.endReason ?? "left", needAudio: false };
    case "notice":
      if (a.ifEmpty && s.notice) return s;
      return { ...s, notice: a.text };
    case "needAudio":
      return s.needAudio === a.value ? s : { ...s, needAudio: a.value };
    case "chat": {
      if (s.seen.has(a.message.id)) return s;
      const seen = new Set(s.seen);
      seen.add(a.message.id);
      return { ...s, messages: [...s.messages, a.message], seen };
    }
  }
}

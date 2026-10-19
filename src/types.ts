// The body of POST /v1/invites/{code}/join or POST /v1/calls/{id}/join, passed through by the consumer's backend.
export type JoinResponse = {
  ws_url: string;
  token: string;
  token_expires_at?: string;
  ice_servers: RTCIceServer[] | null; // null = LiveKit's defaults (TURN unavailable)
  identity?: string;
  grant_id: string;
  role?: "host" | "participant";
  call: { id: string; title: string; max_participants?: number; [k: string]: unknown };
};

export type ChatMessage = { id: string; userId: string; name: string; body: string; mine: boolean; at?: number };

// What loadChatHistory resolves to: the saved messages of GET /v1/calls/{id}/messages.
export type HistoryMessage = { stream_id: string; user_id: string; name?: string; body: string };

export type Feature = "lobby" | "chat" | "screenshare" | "devices" | "recording-indicator";
export const ALL_FEATURES: readonly Feature[] = ["lobby", "chat", "screenshare", "devices", "recording-indicator"];

export type Theme = "light" | "dark" | "auto";
export type Layout = "grid" | "speaker";

export type DiagnosticKind = "connected" | "snapshot" | "reconnected" | "disconnected" |
  "microphone_error" | "camera_error" | "subscription_error" | "audio_playback_failed" | "audio_playback_started";

// Exactly the JSON body of POST /v1/calls/{id}/diagnostics. The consumer's backend forwards it.
export type DiagnosticBody = { grant_id: string; participant_sid: string; kind: DiagnosticKind; payload: Record<string, unknown> };

// Why the local user is no longer in the call.
export type EndReason = "left" | "room_deleted" | "duplicate_identity" | "removed" | "join_failure" | "disconnected" | "error";

export type TeleEvents = {
  "tele-joined": { call: JoinResponse["call"]; role: JoinResponse["role"]; grantId: string };
  "tele-leave": { reason: EndReason };
  "tele-error": { code?: string; message: string; error?: unknown };
  "tele-participant": { action: "joined" | "left"; identity: string; name: string; count: number };
  "tele-chat": ChatMessage;
};

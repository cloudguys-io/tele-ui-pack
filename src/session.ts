// LiveKit session logic for <tele-call>, kept apart from rendering. One CallSession per attempt: a retry
// builds a new one, which is what the demo's remount-on-retry did.
import {
  ConnectionState, DisconnectReason, Room, RoomEvent, Track,
  type Participant, type RemoteParticipant,
} from "livekit-client";
import { createDiagnosticReporter, type DiagnosticReporter, type ReportDiagnostic } from "./diagnostics.ts";
import { initialState, reduce, type Action, type State } from "./state.ts";
import type { Preflight } from "./media.ts";
import type { ChatMessage, EndReason, HistoryMessage, JoinResponse, TeleEvents } from "./types.ts";

export type Emit = <K extends keyof TeleEvents>(type: K, detail: TeleEvents[K]) => void;

export type SessionOptions = {
  getJoin: () => Promise<JoinResponse>;
  reportDiagnostic?: ReportDiagnostic;
  loadChatHistory?: (callId: string) => Promise<HistoryMessage[]>;
  onChange: () => void;
  emit: Emit;
  lobby: boolean;
  room?: Room; // tests inject a fake
};

export function endReasonOf(reason?: DisconnectReason): EndReason {
  switch (reason) {
    case DisconnectReason.ROOM_DELETED: return "room_deleted";
    case DisconnectReason.DUPLICATE_IDENTITY: return "duplicate_identity";
    case DisconnectReason.PARTICIPANT_REMOVED: return "removed";
    case DisconnectReason.JOIN_FAILURE: return "join_failure";
    default: return "disconnected";
  }
}

const describe = (e: unknown) => (e instanceof Error ? e.message : typeof e === "string" ? e : "error");

export class CallSession {
  readonly room: Room;
  state: State;
  private reporter: DiagnosticReporter | null = null;
  private leaving = false;
  private disposed = false;
  started = false;
  private readonly opts: SessionOptions;
  private readonly off: (() => void)[] = [];

  constructor(opts: SessionOptions) {
    this.opts = opts;
    this.room = opts.room ?? new Room({ adaptiveStream: true, dynacast: true });
    this.state = initialState(opts.lobby);
  }

  dispatch(a: Action) {
    const next = reduce(this.state, a);
    if (next === this.state) return;
    this.state = next;
    this.opts.onChange();
  }

  get localUserId(): string {
    const lp = this.room.localParticipant;
    return lp.attributes?.user_id ?? lp.identity;
  }

  get participants(): Participant[] {
    return [this.room.localParticipant, ...this.room.remoteParticipants.values()];
  }

  get reconnecting() { return this.room.state === ConnectionState.Reconnecting; }

  private report(kind: Parameters<DiagnosticReporter["report"]>[0], error?: unknown) {
    void this.reporter?.report(kind, error);
  }

  private listen() {
    const room = this.room;
    const refresh = () => this.opts.onChange();
    const count = () => 1 + room.remoteParticipants.size;
    const onJoin = (p: RemoteParticipant) => {
      refresh();
      this.opts.emit("tele-participant", { action: "joined", identity: p.identity, name: p.name || p.identity, count: count() });
    };
    const onLeft = (p: RemoteParticipant) => {
      refresh();
      this.opts.emit("tele-participant", { action: "left", identity: p.identity, name: p.name || p.identity, count: count() });
    };
    const onDisc = (reason?: DisconnectReason) => {
      this.report("disconnected", this.leaving ? "Left the call" : endReasonOf(reason));
      this.reporter?.stop();
      if (this.leaving || this.disposed) return;
      this.dispatch({ type: "disconnected", reason: endReasonOf(reason) });
    };
    const onAudio = () => {
      this.dispatch({ type: "needAudio", value: !room.canPlaybackAudio });
      this.report(room.canPlaybackAudio ? "audio_playback_started" : "audio_playback_failed");
    };
    const onSubErr = (sid: string) => this.report("subscription_error", `Could not subscribe to ${sid}`);
    const onReconnected = () => { refresh(); this.report("reconnected"); };
    const handlers: [RoomEvent, (...args: any[]) => void][] = [
      [RoomEvent.ParticipantConnected, onJoin], [RoomEvent.ParticipantDisconnected, onLeft],
      [RoomEvent.TrackSubscribed, refresh], [RoomEvent.TrackUnsubscribed, refresh],
      [RoomEvent.TrackMuted, refresh], [RoomEvent.TrackUnmuted, refresh],
      [RoomEvent.LocalTrackPublished, refresh], [RoomEvent.LocalTrackUnpublished, refresh],
      [RoomEvent.ActiveSpeakersChanged, refresh], [RoomEvent.RecordingStatusChanged, refresh],
      [RoomEvent.ConnectionStateChanged, refresh], [RoomEvent.Disconnected, onDisc],
      [RoomEvent.AudioPlaybackStatusChanged, onAudio],
      [RoomEvent.TrackSubscriptionFailed, onSubErr], [RoomEvent.Reconnected, onReconnected],
    ];
    for (const [ev, fn] of handlers) {
      room.on(ev, fn);
      this.off.push(() => room.off(ev, fn));
    }
    room.registerTextStreamHandler("lk.chat", async (reader, from) => {
      const body = await reader.readAll();
      if (this.disposed) return;
      const p = room.getParticipantByIdentity(from.identity);
      this.addChat({ id: reader.info.id, userId: p?.attributes?.user_id ?? from.identity, name: p?.name || from.identity, body, mine: false, at: Date.now() });
    });
    this.off.push(() => room.unregisterTextStreamHandler("lk.chat"));
  }

  // Saved history is not announced: tele-chat is for new messages (unread badges outside the element).
  private addChat(m: ChatMessage, announce = true) {
    const before = this.state.messages.length;
    this.dispatch({ type: "chat", message: m });
    if (announce && this.state.messages.length > before) this.opts.emit("tele-chat", m);
  }

  // pre = tracks the lobby captured inside the Join tap. Without a lobby (pre null) the default
  // devices are turned on after connecting instead.
  async join(pre: Preflight | null) {
    if (this.started || this.disposed) return;
    this.started = true;
    this.dispatch({ type: "join" });
    if (pre) this.room.startAudio().catch(() => {});
    this.listen();
    let mediaStarted = false;
    try {
      const j = await this.opts.getJoin();
      if (this.disposed) return;
      this.dispatch({ type: "joinInfo", info: j });
      if (this.opts.reportDiagnostic) this.reporter = createDiagnosticReporter(this.room, j.grant_id, this.opts.reportDiagnostic);
      mediaStarted = true;
      await this.room.connect(j.ws_url, j.token, { rtcConfig: j.ice_servers ? { iceServers: j.ice_servers } : undefined });
      if (this.disposed) return;
      this.dispatch({ type: "connected" });
      this.opts.emit("tele-joined", { call: j.call, role: j.role, grantId: j.grant_id });
      const lp = this.room.localParticipant;
      if (pre) {
        if (pre.notice) this.dispatch({ type: "notice", text: { key: "limitedDevices" } });
        if (pre.audio) await lp.publishTrack(pre.audio).catch((error) => {
          if (this.disposed) return;
          this.dispatch({ type: "notice", text: { key: "micUnavailableJoined" } });
          this.report("microphone_error", error);
        });
        if (pre.video) await lp.publishTrack(pre.video).catch((error) => {
          if (this.disposed) return;
          this.dispatch({ type: "notice", text: { key: "cameraUnavailableJoined" }, ifEmpty: true });
          this.report("camera_error", error);
        });
      } else {
        await lp.setMicrophoneEnabled(true).catch((error) => {
          this.dispatch({ type: "notice", text: { key: "micUnavailableJoined" } });
          this.report("microphone_error", error);
        });
        await lp.setCameraEnabled(true).catch((error) => {
          this.dispatch({ type: "notice", text: { key: "cameraUnavailableJoined" }, ifEmpty: true });
          this.report("camera_error", error);
        });
      }
      if (this.disposed) return;
      this.report("connected");
      if (this.opts.loadChatHistory) {
        const me = this.localUserId;
        this.opts.loadChatHistory(j.call.id)
          .then((list) => {
            if (this.disposed) return;
            for (const m of list) this.addChat({ id: m.stream_id, userId: m.user_id, name: m.name || m.user_id, body: m.body, mine: m.user_id === me }, false);
          })
          .catch(() => {});
      }
      this.opts.onChange();
    } catch (e) {
      pre?.audio?.stop(); pre?.video?.stop();
      if (this.disposed) return;
      this.reporter?.stop();
      this.dispatch({ type: "failed", error: e });
      const code = (e as { code?: unknown } | null)?.code;
      this.opts.emit("tele-error", { code: typeof code === "string" ? code : undefined, message: describe(e), error: e });
    } finally {
      // Media permission prompts can resolve after the element is gone; release any late tracks too.
      if (this.disposed && mediaStarted) await this.room.disconnect();
    }
  }

  // The user leaves (Leave button or el.leave()), or dismisses the ended or error screen.
  async leave() {
    if (this.state.phase === "left") return;
    this.leaving = true;
    const reason = this.state.phase === "ended" || this.state.phase === "error" ? (this.state.endReason ?? "left") : "left";
    this.dispatch({ type: "leave" });
    await this.room.disconnect().catch(() => {});
    this.opts.emit("tele-leave", { reason });
  }

  // The element was removed from the page: clean up quietly.
  async dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.leaving = true;
    if (this.reporter && this.state.phase === "live") this.report("disconnected", "Left the call page");
    this.reporter?.stop();
    for (const f of this.off.splice(0)) f();
    await this.room.disconnect().catch(() => {});
  }

  async sendChat(text: string) {
    const body = text.trim();
    if (!body || this.state.phase !== "live") return;
    const lp = this.room.localParticipant;
    const sent = await lp.sendText(body, { topic: "lk.chat" });
    this.addChat({ id: sent.id, userId: this.localUserId, name: lp.name || lp.identity, body, mine: true, at: Date.now() });
  }

  async setMicrophone(on: boolean) {
    try {
      await this.room.localParticipant.setMicrophoneEnabled(on);
      this.opts.onChange();
      this.report("snapshot");
    } catch (error) {
      this.dispatch({ type: "notice", text: { key: "micUnavailable" } });
      this.report("microphone_error", error);
    }
  }

  async setCamera(on: boolean) {
    try {
      await this.room.localParticipant.setCameraEnabled(on);
      this.opts.onChange();
      this.report("snapshot");
    } catch (error) {
      this.dispatch({ type: "notice", text: { key: "cameraUnavailable" } });
      this.report("camera_error", error);
    }
  }

  async setScreenShare(on: boolean) {
    try {
      await this.room.localParticipant.setScreenShareEnabled(on);
    } catch (error) {
      // Cancelling the browser's picker is not a failure worth a banner.
      if (!(error instanceof Error && error.name === "NotAllowedError")) this.dispatch({ type: "notice", text: { key: "screenShareFailed" } });
    }
    this.opts.onChange();
  }

  async switchDevice(kind: MediaDeviceKind, id: string) {
    await this.room.switchActiveDevice(kind, id);
    this.opts.onChange();
  }

  async startAudio() {
    try {
      await this.room.startAudio();
      this.dispatch({ type: "needAudio", value: false });
    } catch {
      this.dispatch({ type: "notice", text: { key: "audioBlocked" } });
    }
  }

  // Camera tiles for everyone plus a tile per active screen share.
  tiles(): { p: Participant; source: Track.Source; local: boolean }[] {
    const lp = this.room.localParticipant;
    return this.participants.flatMap((p) => {
      const t = [{ p, source: Track.Source.Camera, local: p === lp }];
      if (p.getTrackPublication(Track.Source.ScreenShare)?.track) t.push({ p, source: Track.Source.ScreenShare, local: p === lp });
      return t;
    });
  }
}

import { LitElement, html, svg, nothing, type PropertyValues } from "lit";
import { repeat } from "lit/directives/repeat.js";
import { Track, type LocalAudioTrack, type LocalVideoTrack, type Participant, type Track as LKTrack } from "livekit-client";
import { CallSession } from "./session.ts";
import { acquire, canPickSpeaker, listDevices, mediaSupported, type DeviceIssue } from "./media.ts";
import { dictionary, format, render, type Strings } from "./i18n.ts";
import { styles } from "./styles.ts";
import { ICONS, type IconName } from "./icon-paths.ts";
import { arrange, togglePin } from "./stage.ts";
import type { ReportDiagnostic } from "./diagnostics.ts";
import {
  ALL_FEATURES, type Feature, type HistoryMessage, type JoinResponse, type Layout, type TeleEvents, type Theme,
} from "./types.ts";

const icon = (name: IconName, size = 20) =>
  html`<svg width=${size} height=${size} viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">${ICONS[name].map((d) => svg`<path d=${d}></path>`)}</svg>`;

type DeviceKind = "audioinput" | "audiooutput" | "videoinput";
const KIND_KEY = { audioinput: "microphone", audiooutput: "speaker", videoinput: "camera" } as const;

/**
 * <tele-call>: a complete call UI. Give it a getJoin() that returns the Tele join response from your backend.
 *
 * Attributes: features, lang, theme (light | dark | auto), layout (grid | speaker).
 * Events: tele-joined, tele-leave, tele-error, tele-participant, tele-chat.
 * Methods: leave(), setMicrophone(on), setCamera(on).
 * Anyone's screen share takes the stage; each viewer can pin any tile (button on the tile, or double-click).
 */
export class TeleCallElement extends LitElement {
  static override styles = styles;
  static override properties = {
    features: { type: String },
    lang: { type: String, reflect: true },
    theme: { type: String, reflect: true },
    layout: { type: String },
    getJoin: { attribute: false },
    reportDiagnostic: { attribute: false },
    loadChatHistory: { attribute: false },
    setRecording: { attribute: false },
    endForAll: { attribute: false },
    strings: { attribute: false },
    // internal reactive state
    _micOn: { state: true }, _camOn: { state: true }, _micId: { state: true }, _camId: { state: true },
    _issues: { state: true }, _devices: { state: true }, _chatOpen: { state: true }, _draft: { state: true },
    _menu: { state: true }, _menuError: { state: true }, _tick: { state: true }, _pinned: { state: true },
  };

  declare features: string | null;
  declare lang: string;
  declare theme: Theme;
  declare layout: Layout;
  /** Returns the join response (ws_url, token, ice_servers, grant_id, call) from your backend. */
  declare getJoin: (() => Promise<JoinResponse>) | undefined;
  /** Receives diagnostics; forward the body to POST /v1/calls/{call_id}/diagnostics from your backend. */
  declare reportDiagnostic: ReportDiagnostic | undefined;
  /** Optional: saved chat for the call (GET /v1/calls/{id}/messages through your backend). */
  declare loadChatHistory: ((callId: string) => Promise<HistoryMessage[]>) | undefined;
  /** Optional, hosts only: start or stop recording through your backend. Shows a Record button when set. */
  declare setRecording: ((on: boolean) => Promise<unknown>) | undefined;
  /** Optional, hosts only: end the call for everyone through your backend. */
  declare endForAll: (() => Promise<unknown>) | undefined;
  /** Optional per-key label overrides on top of the lang dictionary. */
  declare strings: Partial<Strings> | undefined;

  declare _micOn: boolean;
  declare _camOn: boolean;
  declare _micId: string | undefined;
  declare _camId: string | undefined;
  declare _issues: DeviceIssue[];
  declare _devices: Partial<Record<DeviceKind, MediaDeviceInfo[]>>;
  declare _chatOpen: boolean;
  declare _draft: string;
  declare _menu: "audio" | "video" | null;
  declare _menuError: string | null;
  declare _tick: number;
  /** Tile key (identity:source) this viewer pinned to the stage, or null. Local to this viewer. */
  declare _pinned: string | null;

  private session: CallSession | null = null;
  private pre: { audio?: LocalAudioTrack; video?: LocalVideoTrack } = {};
  private handed = false;
  private acquireSeq = 0;
  private bound = new Map<HTMLMediaElement, LKTrack>();
  private trackByKey = new Map<string, LKTrack>();

  constructor() {
    super();
    this.features = null;
    this.lang = "en";
    this.theme = "auto";
    this.layout = "grid";
    this._micOn = true;
    this._camOn = true;
    this._issues = [];
    this._devices = {};
    this._chatOpen = true;
    this._draft = "";
    this._menu = null;
    this._menuError = null;
    this._tick = 0;
    this._pinned = null;
  }

  private get s(): Strings { return dictionary(this.lang, this.strings); }

  has(f: Feature): boolean {
    if (this.features == null) return true;
    return this.features.split(/[\s,]+/).includes(f);
  }

  /** The current phase: lobby, joining, live, ended, error or left. */
  get phase() { return this.session?.state.phase ?? "lobby"; }
  /** The underlying LiveKit Room, for advanced integrations. */
  get room() { return this.session?.room ?? null; }

  override connectedCallback() {
    super.connectedCallback();
    document.addEventListener("pointerdown", this.onDocPointer);
    document.addEventListener("keydown", this.onDocKey);
    navigator.mediaDevices?.addEventListener?.("devicechange", this.refreshDevices);
    if (!this.session) this.start();
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener("pointerdown", this.onDocPointer);
    document.removeEventListener("keydown", this.onDocKey);
    navigator.mediaDevices?.removeEventListener?.("devicechange", this.refreshDevices);
    this.stopLobbyTracks();
    void this.session?.dispose();
    this.session = null;
  }

  private start() {
    this.handed = false;
    const self = this;
    this.session = new CallSession({
      lobby: this.has("lobby"),
      getJoin: () => {
        if (!this.getJoin) throw new Error("tele-call: set the getJoin property");
        return this.getJoin();
      },
      // Read when joining, so properties set after the element is attached (React effects) still count.
      get reportDiagnostic() { return self.reportDiagnostic; },
      get loadChatHistory() { return self.loadChatHistory; },
      onChange: () => { this._tick++; },
      emit: (type, detail) => this.emit(type, detail),
    });
    if (this.session.state.phase === "lobby") this.acquireLobby();
    this._tick++;
  }

  private emit<K extends keyof TeleEvents>(type: K, detail: TeleEvents[K]) {
    if (type === "tele-joined") this._chatOpen = this.getBoundingClientRect().width >= 768;
    this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
  }

  protected override updated(changed: PropertyValues) {
    super.updated(changed);
    const s = this.session;
    // Without a lobby, join as soon as getJoin is available.
    if (s && s.state.phase === "joining" && !this.has("lobby") && this.getJoin && !s.started) {
      void s.join(null);
    }
    this.bindMedia();
  }

  // ---- public methods ----

  /** Leave the call. Fires tele-leave with reason "left". */
  async leave() { this.stopLobbyTracks(); await this.session?.leave(); }
  async setMicrophone(on: boolean) {
    if (this.phase === "lobby") { this.toggleLobby("mic", on); return; }
    await this.session?.setMicrophone(on);
  }
  async setCamera(on: boolean) {
    if (this.phase === "lobby") { this.toggleLobby("cam", on); return; }
    await this.session?.setCamera(on);
  }

  // ---- media element binding ----

  // Attach each track to its <video>/<audio> once, and detach from elements that left the DOM.
  private bindMedia() {
    const root = this.renderRoot as ShadowRoot;
    for (const el of root.querySelectorAll<HTMLMediaElement>("[data-key]")) {
      const track = this.trackByKey.get(el.dataset.key!);
      const prev = this.bound.get(el);
      if (prev === track) continue;
      if (prev) prev.detach(el);
      if (track) { track.attach(el); this.bound.set(el, track); } else this.bound.delete(el);
    }
    for (const [el, track] of this.bound) {
      if (!el.isConnected) { track.detach(el); this.bound.delete(el); }
    }
  }

  // ---- lobby ----

  private stopLobbyTracks() {
    this.acquireSeq++;
    if (this.handed) return;
    this.pre.audio?.stop(); this.pre.video?.stop();
    this.pre = {};
  }

  private acquireLobby() {
    if (!mediaSupported()) return;
    const seq = ++this.acquireSeq;
    this.pre.audio?.stop(); this.pre.video?.stop();
    this.pre = {};
    this.trackByKey.delete("preview");
    void acquire({ mic: this._micOn, cam: this._camOn, micId: this._micId, camId: this._camId }).then(({ audio, video, issues }) => {
      if (seq !== this.acquireSeq) { audio?.stop(); video?.stop(); return; }
      this.pre = { audio, video };
      this._issues = issues;
      this.refreshDevices();
      this._tick++;
    });
  }

  private toggleLobby(which: "mic" | "cam", on: boolean) {
    if (which === "mic") this._micOn = on; else this._camOn = on;
    this.acquireLobby();
  }

  private refreshDevices = () => {
    const kinds: DeviceKind[] = ["audioinput", "videoinput", "audiooutput"];
    void Promise.all(kinds.map((k) => listDevices(k))).then(([a, v, o]) => {
      this._devices = { audioinput: a, videoinput: v, audiooutput: o };
    });
  };

  private joinFromLobby() {
    this.handed = true;
    const { audio, video } = this.pre;
    this.pre = {};
    this.trackByKey.delete("preview");
    void this.session?.join({ audio, video, notice: this._issues.length > 0 });
  }

  private retry() {
    void this.session?.dispose();
    this.stopLobbyTracks();
    this.start();
  }

  // ---- device menu ----

  private onDocPointer = (e: PointerEvent) => {
    if (!this._menu) return;
    const box = this.renderRoot.querySelector(`[data-menu="${this._menu}"]`);
    if (box && !e.composedPath().includes(box)) this._menu = null;
  };
  private onDocKey = (e: KeyboardEvent) => { if (e.key === "Escape" && this._menu) this._menu = null; };

  // ---- rendering ----

  override render() {
    const s = this.s;
    const session = this.session;
    if (!session) return nothing;
    this.trackByKey.clear();
    const st = session.state;
    switch (st.phase) {
      case "lobby": return this.renderLobby(s);
      case "joining": return html`<div class="center" part="status"><p class="muted">${s.joining}</p></div>`;
      case "error":
        return this.renderEnd(render(s, st.message), s.tryAgain);
      case "ended":
      case "left":
        return this.renderEnd(render(s, st.message), s.rejoin);
      case "live": return this.renderLive(s, session);
    }
  }

  private renderEnd(msg: string, again: string) {
    return html`<div class="center" part="status">
      <p class="msg" role="status">${msg}</p>
      <div class="actions">
        <button class="btn primary" part="button button-primary" @click=${() => this.retry()}>${again}</button>
        ${this.phase !== "left" ? html`<button class="btn quiet" part="button" @click=${() => void this.session?.leave()}>${this.s.exit}</button>` : nothing}
      </div>
    </div>`;
  }

  private deviceSelect(kind: DeviceKind, value: string | undefined, onPick: (id: string) => void) {
    const list = this._devices[kind] ?? [];
    if (list.length === 0) return nothing;
    const label = this.s[KIND_KEY[kind]];
    const current = value && list.some((d) => d.deviceId === value) ? value : list[0].deviceId;
    return html`<label class="pick"><span class="muted">${label}</span>
      <select part="select" @change=${(e: Event) => onPick((e.target as HTMLSelectElement).value)}>
        ${list.map((d, i) => html`<option value=${d.deviceId} ?selected=${d.deviceId === current}>${d.label || `${label} ${i + 1}`}</option>`)}
      </select></label>`;
  }

  private renderLobby(s: Strings) {
    const supported = mediaSupported();
    if (this.pre.video) this.trackByKey.set("preview", this.pre.video);
    const problem = this._issues.length
      ? format(s.deviceProblem, { devices: this._issues.map((i) => format(i.device === "microphone" ? s.deviceMicrophone : s.deviceCamera, { error: i.error })).join(s.and) })
      : null;
    return html`<div class="scroll"><div class="lobby" part="lobby">
      <h1>${s.readyToJoin}</h1>
      ${!supported
        ? html`<p role="alert" class="alert">${s.noMediaSupport}</p>`
        : html`<div class="preview" part="preview">
            <video data-key="preview" autoplay playsinline muted></video>
            ${!this._camOn ? html`<div class="off">${s.cameraIsOff}</div>` : nothing}
          </div>`}
      ${problem ? html`<div role="alert" class="alert">${problem} <button @click=${() => this.acquireLobby()}>${s.tryAgain}</button></div>` : nothing}
      ${supported ? html`
        <div class="row">
          <button class="btn ${this._micOn ? "quiet" : "danger"}" part="button" aria-pressed=${this._micOn} @click=${() => this.toggleLobby("mic", !this._micOn)}>
            ${icon(this._micOn ? "Microphone" : "MicrophoneSlash", 18)} ${this._micOn ? s.micOn : s.micOff}
          </button>
          <button class="btn ${this._camOn ? "quiet" : "danger"}" part="button" aria-pressed=${this._camOn} @click=${() => this.toggleLobby("cam", !this._camOn)}>
            ${icon(this._camOn ? "VideoCamera" : "VideoCameraSlash", 18)} ${this._camOn ? s.cameraOn : s.cameraOff}
          </button>
        </div>
        ${this.has("devices") ? html`<div class="pickers">
          ${this.deviceSelect("audioinput", this._micId, (id) => { this._micId = id; this.acquireLobby(); })}
          ${this.deviceSelect("videoinput", this._camId, (id) => { this._camId = id; this.acquireLobby(); })}
        </div>` : nothing}` : nothing}
      <button class="btn primary tall" part="button button-primary join" @click=${() => this.joinFromLobby()}>${s.joinCall}</button>
    </div></div>`;
  }

  private tile(s: Strings, p: Participant, source: Track.Source, local: boolean, canPin: boolean) {
    const key = `${p.identity}:${source}`;
    const pub = p.getTrackPublication(source);
    // A camera turned off stays published but muted; show the initial instead of a frozen frame.
    const track = pub && !pub.isMuted ? pub.track : undefined;
    if (track) this.trackByKey.set(key, track); else this.trackByKey.delete(key);
    const screen = source === Track.Source.ScreenShare;
    const label = (p.name || p.identity) + (local ? s.youSuffix : "") + (screen ? s.screenSuffix : "");
    const name = label + (!p.isMicrophoneEnabled && !screen ? s.mutedSuffix : "");
    const speaking = p.isSpeaking && !screen;
    const pinned = this._pinned === key;
    const pin = () => { this._pinned = togglePin(this._pinned, key); };
    return html`<div class="tile ${speaking ? "speaking" : ""} ${pinned ? "pinned" : ""}" part="tile${speaking ? " tile-speaking" : ""}${pinned ? " tile-pinned" : ""}"
      @dblclick=${canPin ? pin : nothing}>
      ${track
        ? html`<video data-key=${key} autoplay playsinline muted class="${screen ? "contain" : ""} ${local && !screen ? "mirror" : ""}"></video>`
        : html`<div class="avatar-wrap"><span class="avatar" part="avatar">${(p.name || p.identity).slice(0, 1).toUpperCase()}</span></div>`}
      <span class="name" part="tile-name">${name}</span>
      ${canPin ? html`<button class="pin" part="tile-pin" aria-pressed=${pinned} title=${format(pinned ? s.unpin : s.pin, { name: label })}
        aria-label=${format(pinned ? s.unpin : s.pin, { name: label })} @click=${pin}>${icon(pinned ? "PushPinFill" : "PushPin", 16)}</button>` : nothing}
    </div>`;
  }

  private renderStage(s: Strings, session: CallSession) {
    const tiles = session.tiles();
    const keyOf = (t: { p: Participant; source: Track.Source }) => `${t.p.identity}:${t.source}`;
    const byKey = new Map(tiles.map((t) => [keyOf(t), t]));
    const lp = session.room.localParticipant;
    const speaker = session.room.activeSpeakers.find((p) => p !== lp) ?? session.room.activeSpeakers[0];
    const { focus, rest } = arrange(
      tiles.map((t) => ({ key: keyOf(t), screen: t.source === Track.Source.ScreenShare, local: t.local })),
      { layout: this.layout, pinned: this._pinned, speaker: speaker ? `${speaker.identity}:${Track.Source.Camera}` : null },
    );
    const canPin = tiles.length > 1;
    const draw = (k: string) => { const t = byKey.get(k)!; return this.tile(s, t.p, t.source, t.local, canPin); };
    if (focus) {
      return html`<div class="focus">
        <div class="main">${draw(focus)}</div>
        <div class="strip">${repeat(rest, (k) => k, draw)}</div>
      </div>`;
    }
    const cols = rest.length <= 1 ? "c1" : rest.length <= 4 ? "c2" : "c3";
    return html`<div class="grid ${cols}">${repeat(rest, (k) => k, draw)}</div>`;
  }

  private renderChat(s: Strings, session: CallSession) {
    const msgs = session.state.messages;
    const send = (e: Event) => {
      e.preventDefault();
      const text = this._draft;
      if (!text.trim()) return;
      this._draft = "";
      void session.sendChat(text);
    };
    return html`<aside part="chat" aria-label=${s.chat}>
      <h2>${s.chat}</h2>
      <ul>
        ${msgs.length === 0 ? html`<li class="muted">${s.chatEmpty}</li>` : nothing}
        ${repeat(msgs, (m) => m.id, (m) => html`<li class=${m.mine ? "mine" : ""}>
          <span class="who">${m.mine ? s.you : m.name}</span>
          <span class="bubble" part="chat-bubble${m.mine ? " chat-bubble-mine" : ""}">${m.body}</span>
        </li>`)}
      </ul>
      <form @submit=${send}>
        <input part="input" .value=${this._draft} @input=${(e: Event) => { this._draft = (e.target as HTMLInputElement).value; }}
          placeholder=${s.message} maxlength="2000" aria-label=${s.message} />
        <button class="btn primary" part="button button-primary" ?disabled=${!this._draft.trim()}>${s.send}</button>
      </form>
    </aside>`;
  }

  private deviceMenu(which: "audio" | "video", kinds: DeviceKind[], label: string, session: CallSession) {
    if (!this.has("devices")) return nothing;
    const open = this._menu === which;
    const toggle = () => {
      this._menuError = null;
      this._menu = open ? null : which;
      if (!open) this.refreshDevices();
    };
    return html`<div class="menu" data-menu=${which}>
      <button class="btn quiet caret" part="button" aria-label=${label} title=${label} aria-expanded=${open} @click=${toggle}>${icon("CaretUp", 14)}</button>
      ${open ? html`<div class="pop" role="dialog" aria-label=${label} part="device-menu">
        ${kinds.filter((k) => k !== "audiooutput" || canPickSpeaker()).map((k) => this.deviceSelect(k, session.room.getActiveDevice(k), (id) => {
          this._menuError = null;
          session.switchDevice(k, id).catch(() => { this._menuError = format(this.s.switchFailed, { device: this.s[KIND_KEY[k]].toLowerCase() }); });
        }))}
        ${this._menuError ? html`<p role="alert" class="err">${this._menuError}</p>` : nothing}
      </div>` : nothing}
    </div>`;
  }

  private renderLive(s: Strings, session: CallSession) {
    const st = session.state;
    const room = session.room;
    const lp = room.localParticipant;
    const isHost = st.info?.role === "host";
    const recording = room.isRecording;
    const mic = lp.isMicrophoneEnabled, cam = lp.isCameraEnabled, sharing = lp.isScreenShareEnabled;
    const chat = this.has("chat");
    const remoteAudio: string[] = [];
    for (const p of room.remoteParticipants.values()) {
      for (const pub of p.audioTrackPublications.values()) {
        if (!pub.track) continue;
        const key = `audio:${p.identity}:${pub.trackSid}`;
        this.trackByKey.set(key, pub.track);
        remoteAudio.push(key);
      }
    }
    const hostAction = (p: Promise<unknown> | undefined) => p?.catch((e: unknown) =>
      session.dispatch({ type: "notice", text: { raw: e instanceof Error ? e.message : String(e) } }));
    return html`<div class="root" part="call">
      <header part="header">
        <p class="title"><span class="dot" aria-hidden="true"></span><span>${st.info?.call.title ?? ""}</span></p>
        <div class="meta">
          ${session.reconnecting ? html`<span>${s.reconnecting}</span>` : nothing}
          <span>${format(s.inCall, { count: session.participants.length })}</span>
        </div>
      </header>
      ${recording && this.has("recording-indicator") ? html`<div role="status" class="recording" part="recording"><span class="pulse" aria-hidden="true"></span> ${s.recording}</div>` : nothing}
      ${st.notice ? html`<p class="banner" part="notice">${render(s, st.notice)}</p>` : nothing}
      ${st.needAudio ? html`<button class="banner" part="notice" @click=${() => void session.startAudio()}>${s.enableAudio}</button>` : nothing}
      <div class="body">
        <div class="stage" part="stage">${this.renderStage(s, session)}</div>
        ${chat && this._chatOpen ? this.renderChat(s, session) : nothing}
      </div>
      <footer part="controls">
        <div class="pair">
          <button class="btn round ${mic ? "quiet" : "danger"}" part="button control" aria-label=${mic ? s.mute : s.unmute} title=${mic ? s.mute : s.unmute}
            @click=${() => void session.setMicrophone(!mic)}>${icon(mic ? "Microphone" : "MicrophoneSlash", 22)}</button>
          ${this.deviceMenu("audio", ["audioinput", "audiooutput"], s.micSettings, session)}
        </div>
        <div class="pair">
          <button class="btn round ${cam ? "quiet" : "danger"}" part="button control" aria-label=${cam ? s.cameraTurnOff : s.cameraTurnOn} title=${cam ? s.cameraTurnOff : s.cameraTurnOn}
            @click=${() => void session.setCamera(!cam)}>${icon(cam ? "VideoCamera" : "VideoCameraSlash", 22)}</button>
          ${this.deviceMenu("video", ["videoinput"], s.cameraSettings, session)}
        </div>
        ${this.has("screenshare") ? html`<button class="btn icon ${sharing ? "primary" : "quiet"}" part="button control" aria-label=${sharing ? s.stopSharing : s.shareScreen} title=${sharing ? s.stopSharing : s.shareScreen}
          @click=${() => void session.setScreenShare(!sharing)}>${icon("MonitorArrowUp")}</button>` : nothing}
        ${chat ? html`<button class="btn icon ${this._chatOpen ? "quiet" : "primary"}" part="button control" aria-label=${s.chat} title=${s.chat} aria-pressed=${this._chatOpen}
          @click=${() => { this._chatOpen = !this._chatOpen; }}>${icon("ChatCircleText")}</button>` : nothing}
        ${isHost && this.setRecording ? html`<button class="btn quiet" part="button" @click=${() => hostAction(this.setRecording?.(!recording))}>${recording ? s.stopRecording : s.record}</button>` : nothing}
        <slot name="controls"></slot>
        <button class="btn quiet" part="button leave" @click=${() => void this.leave()}>${icon("PhoneDisconnect", 18)} ${s.leave}</button>
        ${isHost && this.endForAll ? html`<button class="btn danger" part="button" @click=${() => { if (confirm(s.confirmEndForAll)) hostAction(this.endForAll?.()); }}>${s.endForAll}</button>` : nothing}
      </footer>
      <div hidden>${repeat(remoteAudio, (k) => k, (k) => html`<audio data-key=${k} autoplay></audio>`)}</div>
    </div>`;
  }
}

export function defineTeleCall(name = "tele-call") {
  if (typeof customElements !== "undefined" && !customElements.get(name)) customElements.define(name, TeleCallElement);
}

declare global {
  interface HTMLElementTagNameMap { "tele-call": TeleCallElement }
  interface HTMLElementEventMap {
    "tele-joined": CustomEvent<TeleEvents["tele-joined"]>;
    "tele-leave": CustomEvent<TeleEvents["tele-leave"]>;
    "tele-error": CustomEvent<TeleEvents["tele-error"]>;
    "tele-participant": CustomEvent<TeleEvents["tele-participant"]>;
    "tele-chat": CustomEvent<TeleEvents["tele-chat"]>;
  }
}

import {
  Room, Track, createLocalAudioTrack, createLocalTracks, createLocalVideoTrack,
  type LocalAudioTrack, type LocalTrack, type LocalVideoTrack,
} from "livekit-client";

export type Preflight = { audio?: LocalAudioTrack; video?: LocalVideoTrack; notice?: boolean };
export type DeviceIssue = { device: "microphone" | "camera"; error: string };

const VIDEO_RESOLUTION = { width: 1280, height: 720 };

export const mediaSupported = () => typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia;

// Lobby capture. Called from inside the user's tap so iOS Safari prompts, and the tracks are handed to the
// room on Join. One combined request first: WebKit (every iPhone browser) can drop the first stream when a
// second getUserMedia follows. Only when that fails do we ask one at a time to learn which device failed.
export async function acquire(opts: { mic: boolean; cam: boolean; micId?: string; camId?: string }) {
  const issues: DeviceIssue[] = [];
  let audio: LocalAudioTrack | undefined;
  let video: LocalVideoTrack | undefined;
  const keep = (tracks: LocalTrack[]) => {
    for (const t of tracks) {
      if (t.kind === Track.Kind.Audio) audio = t as LocalAudioTrack; else video = t as LocalVideoTrack;
    }
  };
  const errName = (e: unknown) => (e instanceof Error ? e.name : "Error");
  let done = false;
  if (opts.mic && opts.cam) {
    try {
      keep(await createLocalTracks({ audio: { deviceId: opts.micId }, video: { deviceId: opts.camId, resolution: VIDEO_RESOLUTION } }));
      done = true;
    } catch { /* fall back to one at a time to find which failed */ }
  }
  if (!done) {
    if (opts.mic) {
      try { keep([await createLocalAudioTrack({ deviceId: opts.micId })]); }
      catch (e) { issues.push({ device: "microphone", error: errName(e) }); }
    }
    if (opts.cam) {
      try { keep([await createLocalVideoTrack({ deviceId: opts.camId, resolution: VIDEO_RESOLUTION })]); }
      catch (e) { issues.push({ device: "camera", error: errName(e) }); }
    }
  }
  return { audio, video, issues };
}

export async function listDevices(kind: MediaDeviceKind): Promise<MediaDeviceInfo[]> {
  try { return await Room.getLocalDevices(kind, false); } catch { return []; }
}

export const canPickSpeaker = () => typeof HTMLMediaElement !== "undefined" && "setSinkId" in HTMLMediaElement.prototype;

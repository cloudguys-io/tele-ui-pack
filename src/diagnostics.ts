import { Track, type Room } from "livekit-client";
import type { DiagnosticBody, DiagnosticKind } from "./types.ts";

// A small projection of public track stats. Raw reports include network addresses;
// only counters, timing, codec and candidate *types* leave the browser.
export async function captureDiagnostics(room: Room, message?: string): Promise<Record<string, unknown>> {
  const tracks: Record<string, string | number | boolean>[] = [];
  for (const participant of [room.localParticipant, ...room.remoteParticipants.values()]) {
    for (const publication of participant.trackPublications.values()) {
      const track = publication.track;
      if (!track || tracks.length >= 32) continue;
      const outbound = participant === room.localParticipant;
      const item: Record<string, string | number | boolean> = {
        sid: publication.trackSid, participant: participant.identity, kind: track.kind,
        direction: outbound ? "outbound" : "inbound", muted: publication.isMuted,
        attached_elements: track.attachedElements.length,
      };
      try {
        const report = await track.getRTCStatsReport();
        report?.forEach((stat) => {
          if (stat.type === (outbound ? "outbound-rtp" : "inbound-rtp") && !stat.isRemote) {
            const copy = (key: string, value: unknown, scale = 1) => {
              if (typeof value === "number" && Number.isFinite(value)) item[key] = value * scale;
            };
            copy("packets", outbound ? stat.packetsSent : stat.packetsReceived);
            copy("bytes", outbound ? stat.bytesSent : stat.bytesReceived);
            copy("packets_lost", stat.packetsLost); copy("jitter_ms", stat.jitter, 1000);
            copy("audio_level", stat.audioLevel);
            const codec = report.get(stat.codecId);
            if (codec?.mimeType) item.codec = codec.mimeType;
            const transport = report.get(stat.transportId);
            const pair = transport?.selectedCandidatePairId ? report.get(transport.selectedCandidatePairId) : undefined;
            if (pair) {
              copy("rtt_ms", pair.currentRoundTripTime, 1000);
              const local = report.get(pair.localCandidateId), remote = report.get(pair.remoteCandidateId);
              if (local?.candidateType) item.local_candidate_type = local.candidateType;
              if (remote?.candidateType) item.remote_candidate_type = remote.candidateType;
              if (local?.protocol) item.protocol = local.protocol;
            }
          }
          if (stat.type === "media-source" && typeof stat.audioLevel === "number") item.audio_level = stat.audioLevel;
          if (stat.type === "remote-inbound-rtp" && typeof stat.roundTripTime === "number") item.rtt_ms = stat.roundTripTime * 1000;
        });
      } catch { /* A track can disappear during a snapshot. Preserve the rest of the report. */ }
      tracks.push(item);
    }
  }
  const mic = room.localParticipant.getTrackPublication(Track.Source.Microphone)?.track;
  const camera = room.localParticipant.getTrackPublication(Track.Source.Camera)?.track;
  const connection = (navigator as Navigator & { connection?: { effectiveType?: string } }).connection;
  return {
    message: message?.slice(0, 512), state: room.state, user_agent: navigator.userAgent.slice(0, 512),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, locale: navigator.language,
    viewport: `${window.innerWidth} × ${window.innerHeight}`, network_type: connection?.effectiveType,
    microphone_enabled: room.localParticipant.isMicrophoneEnabled,
    camera_enabled: room.localParticipant.isCameraEnabled, can_playback_audio: room.canPlaybackAudio,
    microphone_label: mic?.mediaStreamTrack.label.slice(0, 128), camera_label: camera?.mediaStreamTrack.label.slice(0, 128), tracks,
  };
}

export type ReportDiagnostic = (kind: DiagnosticKind, body: DiagnosticBody) => unknown | Promise<unknown>;

// Snapshots every 15 s plus the events the session reports. The consumer's callback forwards the body to
// POST /v1/calls/{id}/diagnostics from its backend; this module never talks to Tele itself.
export function createDiagnosticReporter(room: Room, grantId: string, send: ReportDiagnostic, intervalMs = 15000) {
  let collecting = false;
  let closed = false;
  const report = async (kind: DiagnosticKind, error?: unknown) => {
    if ((closed && kind !== "disconnected") || !room.localParticipant.sid || (kind === "snapshot" && collecting)) return;
    collecting = true;
    try {
      const message = error instanceof Error ? `${error.name}: ${error.message}` : typeof error === "string" ? error : undefined;
      const body: DiagnosticBody = { grant_id: grantId, participant_sid: room.localParticipant.sid, kind, payload: await captureDiagnostics(room, message) };
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          await send(kind, body);
          break;
        } catch (e) {
          // Tele answers session_pending until it has seen this participant; retry briefly.
          if ((e as { code?: unknown } | null)?.code !== "session_pending" || attempt === 2) break;
          await new Promise((resolve) => setTimeout(resolve, 1500));
        }
      }
    } catch { /* Diagnostics must never interrupt a call. */ }
    finally { collecting = false; }
  };
  const timer = setInterval(() => void report("snapshot"), intervalMs);
  return { report, stop: () => { closed = true; clearInterval(timer); } };
}

export type DiagnosticReporter = ReturnType<typeof createDiagnosticReporter>;

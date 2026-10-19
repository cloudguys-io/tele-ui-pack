# Diagnostics

Tele can store connection reports for each participant: network type, round-trip time, packet loss, codecs and device errors. They show up in Tele's call inspector and help support answer "why was the call bad?".

The element collects them, but it holds no Tele token, so it hands each report to you:

```js
call.reportDiagnostic = (kind, body) =>
  fetch(`/api/tele/calls/${callId}/diagnostics`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    keepalive: true,
  }).then((r) => (r.ok ? undefined : r.json().then((b) => Promise.reject(b.error))));
```

Your backend forwards `body` unchanged to `POST /v1/calls/{id}/diagnostics` with the person's user token.

| `kind` | When |
|---|---|
| `connected` | Just after joining |
| `snapshot` | Every 15 seconds during the call |
| `reconnected`, `disconnected` | Network changes |
| `microphone_error`, `camera_error`, `subscription_error` | Device or media failures |
| `audio_playback_failed`, `audio_playback_started` | The browser blocked or allowed sound |

If Tele answers `session_pending` (it has not seen the participant yet), reject with `{ code: "session_pending" }` and the element retries.

Reports are optional. Without `reportDiagnostic`, nothing is collected.

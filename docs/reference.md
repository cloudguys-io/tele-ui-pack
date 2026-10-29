# Reference

## Attributes

| Attribute | Values | Default |
|---|---|---|
| `features` | Space-separated: `lobby`, `chat`, `screenshare`, `devices`, `recording-indicator` | all of them |
| `lang` | `en`, `bn` (a tag like `bn-BD` uses `bn`) | `en` |
| `theme` | `light`, `dark`, `auto` (follows the system) | `auto` |
| `layout` | `grid` (even tiles), `speaker` (the active speaker large, others in a strip). In either layout someone else's screen share, or a tile you pinned, goes large | `grid` |

Without `lobby`, the element joins as soon as `getJoin` is set and turns on the default microphone and camera.

## Properties

| Property | Purpose |
|---|---|
| `getJoin()` | **Required.** Resolves to the Tele join response (`ws_url`, `token`, `ice_servers`, `grant_id`, `call`, `role`). Reject with a Tele error object to show its message. |
| `loadChatHistory(callId)` | Resolves to the `messages` array of `GET /v1/calls/{id}/messages`, so people who join late see earlier chat. |
| `reportDiagnostic(kind, body)` | Receives connection reports to forward to Tele. See [Diagnostics](diagnostics.md). |
| `setRecording(on)` | Hosts only. Shows **Record** and **Stop recording**. See [Host controls](host-controls.md). |
| `endForAll()` | Hosts only. Shows **End for all**. |
| `strings` | Label overrides. See [Languages and labels](languages.md). |
| `phase` | Read only: `lobby`, `joining`, `live`, `ended`, `error` or `left`. |

## Events

All events bubble and cross the shadow boundary.

| Event | `detail` |
|---|---|
| `tele-joined` | `{ call, role, grantId }` |
| `tele-leave` | `{ reason }`: `left`, or why the call ended (`room_deleted`, `removed`, `duplicate_identity`, `join_failure`, `disconnected`, `error`) once the person closes that screen |
| `tele-error` | `{ code, message }` when joining fails |
| `tele-participant` | `{ action: "joined" \| "left", identity, name, count }` |
| `tele-chat` | the new message `{ id, userId, name, body, mine }`, for unread badges outside the element |

## Methods

| Method | |
|---|---|
| `leave()` | Disconnect and fire `tele-leave` with `reason: "left"` |
| `setMicrophone(on)` | Turn the microphone on or off |
| `setCamera(on)` | Turn the camera on or off |

## Slots

| Slot | |
|---|---|
| `controls` | Extra buttons in the control bar |

## Types

The package exports TypeScript types for everything above: `JoinResponse`, `TeleEvents`, `Feature`, `Theme`, `Layout`, `Strings`, `DiagnosticBody`, `EndReason` and the element class `TeleCallElement`.

## Stage and pinning

What is shown large, in order:

1. A tile the viewer pinned. Every tile has a pin button (shown on hover or focus, always on touch screens), and double-clicking a tile pins it too. Pinning the same tile again unpins it. Pins are per viewer and never sent to anyone else.
2. Someone else's screen share. Your own share stays in the strip so you don't watch a copy of your screen; pin it if you want it large.
3. In `speaker` layout, the active speaker.

The other tiles sit in a strip below the large tile, or beside it once the stage is at least 900px wide. With nothing to show large, `grid` layout gives every tile the same size.

# Host controls

The join response says whether the person is the `host`. For hosts, the element can show extra buttons, but only when you give it the function to call. It never calls Tele itself.

| Property | Button | Your backend calls |
|---|---|---|
| `setRecording(on)` | **Record** / **Stop recording** | `POST /v1/calls/{id}/recording/start` or `/stop` |
| `endForAll()` | **End for all**, after a confirmation | `POST /v1/calls/{id}/end` |

```js
call.setRecording = (on) =>
  fetch(`/api/tele/calls/${callId}/recording/${on ? "start" : "stop"}`, { method: "POST" });
call.endForAll = () => fetch(`/api/tele/calls/${callId}/end`, { method: "POST" });
```

Check on your backend that the person really is the host before forwarding: the button being visible is not authorization.

## Recording banner

While a recording runs, everyone sees **This call is being recorded** (the `recording-indicator` feature). Keep it on: people should know when they are recorded.

When a host ends the call, everyone else sees "The call has ended." and `tele-leave` fires with `reason: "room_deleted"` once they close that screen.

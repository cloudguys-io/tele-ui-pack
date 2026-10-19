# Plain HTML

Use the single-file build when there is no bundler. Copy `dist/tele-call.iife.js` from a build into your static files.

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <script src="/vendor/tele-call.iife.js"></script>
  <style>
    body { margin: 0; }
    tele-call { height: 100dvh; --tele-accent: #0a7cff; }
  </style>
</head>
<body>
  <tele-call id="call" features="lobby chat screenshare devices" lang="en"></tele-call>

  <script>
    const call = document.getElementById("call");
    const code = new URLSearchParams(location.search).get("code");

    call.getJoin = () =>
      fetch("/api/tele/join?code=" + encodeURIComponent(code), { method: "POST" })
        .then((r) => (r.ok ? r.json() : r.json().then((b) => Promise.reject(b.error))));

    call.loadChatHistory = (callId) =>
      fetch("/api/tele/calls/" + callId + "/messages").then((r) => r.json()).then((b) => b.messages);

    call.addEventListener("tele-leave", () => location.assign("/calls"));
    call.addEventListener("tele-error", (e) => console.error(e.detail.code, e.detail.message));
  </script>
</body>
</html>
```

The script registers `<tele-call>` as soon as it loads and exposes the exports on `window.TeleCallUI`.

## With a bundler

```js
import "@tele/call-ui"; // registers <tele-call>
```

`livekit-client` and `react` stay outside the ESM build, so an app that already uses them does not ship two copies.

## Add your own buttons

Anything with `slot="controls"` appears in the control bar:

```html
<tele-call>
  <button slot="controls" onclick="openNotes()">Notes</button>
</tele-call>
```

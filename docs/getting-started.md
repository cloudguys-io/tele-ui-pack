# Getting started

## Requirements

- A Tele API key and secret, issued by the Tele team. They stay on your backend.
- A backend endpoint that returns the Tele join response ([Your backend](backend.md)).
- A current browser: Chrome, Edge, Firefox or Safari 16.4 and later ([Browser support](browser-support.md)).

## Install

The package is not on a public registry. Install it from this repository at a release tag; npm builds it on install.

```bash
npm install github:cloudguys-io/tele-ui-pack#v0.2.0 livekit-client
```

!!! tip "No bundler?"
    Build once (`npm ci && npm run build` in a clone) and serve `dist/tele-call.iife.js` as a static file. It includes `livekit-client`, so a single `<script>` tag is enough. See [Plain HTML](html.md).

## Your first call

=== "HTML"

    ```html
    <script type="module">
      import "@tele/call-ui";
      const call = document.querySelector("tele-call");
      call.getJoin = () => fetch("/api/tele/join?code=" + code, { method: "POST" }).then((r) => r.json());
    </script>

    <tele-call style="height: 100dvh"></tele-call>
    ```

=== "React"

    ```tsx
    "use client";
    import { TeleCall } from "@tele/call-ui/react";

    export function Room({ code }: { code: string }) {
      return (
        <TeleCall
          style={{ height: "100dvh" }}
          getJoin={() => fetch(`/api/tele/join?code=${code}`, { method: "POST" }).then((r) => r.json())}
          onLeave={() => location.assign("/")}
        />
      );
    }
    ```

Give the element a height: it fills its box. `100dvh` makes it a full-screen call.

What happens next:

1. The lobby shows a camera preview with device pickers. Nothing connects yet.
2. When the person presses **Join call**, the element calls `getJoin()`, connects and publishes the chosen microphone and camera.
3. When they leave, `tele-leave` fires (`onLeave` in React). Navigate wherever you like.

## Choose features

```html
<tele-call features="lobby chat devices"></tele-call>
```

Leave out `screenshare`, `chat`, `devices`, `lobby` or `recording-indicator` to hide them. See [Reference](reference.md#attributes).

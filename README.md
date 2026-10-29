# Tele UI Pack

`<tele-call>`: a complete call screen for [Tele](https://tele.cloudguys.io/) in one web component, plus a React wrapper.

Lobby with device pickers, video tiles, screen share that takes the stage, pin any tile, chat with saved history, recording banner, host controls, reconnect handling, English and Bangla labels, and theming through CSS variables. It uses the join response your backend already gets from Tele, so it adds no new authentication and never sees your API secret.

```html
<script type="module">
  import "@tele/call-ui";
  document.querySelector("tele-call").getJoin = () =>
    fetch("/api/tele/join?code=" + code, { method: "POST" }).then((r) => r.json());
</script>

<tele-call features="lobby chat screenshare devices" style="height: 100dvh"></tele-call>
```

```tsx
import { TeleCall } from "@tele/call-ui/react";

<TeleCall getJoin={() => fetch(`/api/calls/${id}/join`, { method: "POST" }).then((r) => r.json())} onLeave={() => router.push("/")} />
```

## Install

```bash
npm install github:cloudguys-io/tele-ui-pack#v0.1.0 livekit-client
```

Or build once and serve `dist/tele-call.iife.js`, a single file for a `<script>` tag.

## Documentation

Full docs are in [`docs/`](docs/index.md):

- [Getting started](docs/getting-started.md) and [your backend endpoint](docs/backend.md)
- [Plain HTML](docs/html.md), [React and Next.js](docs/react.md)
- [Host controls](docs/host-controls.md), [diagnostics](docs/diagnostics.md)
- [Theming](docs/theming.md), [languages and labels](docs/languages.md)
- [Reference](docs/reference.md), [browser support](docs/browser-support.md), [development](docs/development.md)

Preview them as a site with `npm run docs` (needs [uv](https://docs.astral.sh/uv/)). The Tele API is documented in the [Tele developer guide](https://tele.cloudguys.io/docs/).

## Development

```bash
npm ci
npm test
npm run build
```

## Changelog

### 0.1.0

- First release: `<tele-call>` element, React wrapper, ESM and single-file builds, English and Bangla.

## License

Proprietary. Copyright CloudGuys. Use requires an agreement with the Tele team.

# Theming

The element draws inside a Shadow DOM, so your page's CSS cannot break it and its styles never leak out. You change its look in two ways.

## CSS variables

Set them on the element or any ancestor:

| Variable | Default |
|---|---|
| `--tele-accent` | vermilion, `oklch(0.54 0.19 33)` (lighter in dark mode) |
| `--tele-radius` | `16px` for tiles; smaller elements scale from it |
| `--tele-font` | `ui-sans-serif, system-ui, sans-serif` |
| `--tele-bg`, `--tele-surface`, `--tele-text`, `--tele-muted`, `--tele-line` | the light or dark palette chosen by `theme` |

```css
tele-call {
  --tele-accent: #0a7cff;
  --tele-radius: 8px;
  --tele-font: "Inter", sans-serif;
}
```

## Light and dark

`theme="auto"` (the default) follows the operating system. Use `light` or `dark` to pin it, for example to match your app's own theme switch.

## Parts

For anything the variables do not cover, style the exposed parts:

```css
tele-call::part(tile) { box-shadow: 0 1px 2px rgb(0 0 0 / 0.1); }
tele-call::part(button-primary) { text-transform: uppercase; }
```

| Area | Parts |
|---|---|
| Layout | `call`, `header`, `stage`, `status`, `notice`, `recording` |
| Tiles | `tile`, `tile-speaking`, `tile-pinned`, `tile-name`, `tile-pin` (the pin button), `avatar` |
| Controls | `controls`, `control`, `button`, `button-primary`, `leave`, `join`, `device-menu`, `select` |
| Chat | `chat`, `chat-bubble`, `chat-bubble-mine`, `input` |
| Lobby | `lobby`, `preview` |

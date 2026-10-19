import { css } from "lit";

// Theming: consumers set --tele-accent, --tele-radius, --tele-font (and optionally the palette tokens
// --tele-bg, --tele-surface, --tele-text, --tele-muted, --tele-line) on the element or any ancestor.
export const styles = css`
  :host {
    --_bg: var(--tele-bg, #f4f5f6);
    --_surface: var(--tele-surface, #eceef0);
    --_text: var(--tele-text, #121316);
    --_muted: var(--tele-muted, #5a5f67);
    --_line: var(--tele-line, rgb(18 19 22 / 0.12));
    --_accent: var(--tele-accent, oklch(0.54 0.19 33));
    --_radius: var(--tele-radius, 16px);
    --_accent-soft: color-mix(in oklch, var(--_accent) 10%, transparent);
    display: block;
    position: relative;
    height: 100%;
    min-height: 320px;
    overflow: hidden;
    background: var(--_bg);
    color: var(--_text);
    font-family: var(--tele-font, ui-sans-serif, system-ui, sans-serif);
    -webkit-font-smoothing: antialiased;
    color-scheme: light;
  }
  :host([theme="dark"]) {
    --_bg: var(--tele-bg, #0e0f11);
    --_surface: var(--tele-surface, #16181b);
    --_text: var(--tele-text, #eceef0);
    --_muted: var(--tele-muted, #9ba1aa);
    --_line: var(--tele-line, rgb(236 238 240 / 0.12));
    --_accent: var(--tele-accent, oklch(0.7 0.17 35));
    color-scheme: dark;
  }
  @media (prefers-color-scheme: dark) {
    :host(:not([theme="light"])) {
      --_bg: var(--tele-bg, #0e0f11);
      --_surface: var(--tele-surface, #16181b);
      --_text: var(--tele-text, #eceef0);
      --_muted: var(--tele-muted, #9ba1aa);
      --_line: var(--tele-line, rgb(236 238 240 / 0.12));
      --_accent: var(--tele-accent, oklch(0.7 0.17 35));
      color-scheme: dark;
    }
  }
  [hidden] { display: none !important; }
  *, *::before, *::after { box-sizing: border-box; }
  button, input, select { font: inherit; color: inherit; }
  button { cursor: pointer; background: none; border: 0; padding: 0; }

  .root { container: tele / inline-size; height: 100%; display: flex; flex-direction: column; }
  .muted { color: var(--_muted); }

  .btn { display: inline-flex; align-items: center; justify-content: center; gap: .5rem; border-radius: 9999px;
    padding: .55rem 1.1rem; font-size: .875rem; font-weight: 500; white-space: nowrap;
    transition: opacity .15s, background .15s, transform .1s; }
  .btn:active { transform: scale(.98); }
  .btn:disabled { opacity: .45; pointer-events: none; }
  .btn:focus-visible { outline: 2px solid var(--_accent); outline-offset: 2px; }
  .primary { background: var(--_text); color: var(--_bg); }
  .primary:hover { opacity: .85; }
  .quiet { border: 1px solid var(--_line); }
  .quiet:hover { background: var(--_surface); }
  .danger { border: 1px solid var(--_accent); color: var(--_accent); }
  .danger:hover { background: var(--_accent-soft); }
  .round { width: 3rem; height: 3rem; padding: 0; }
  .round.danger { background: var(--_accent-soft); }
  .icon { padding-left: .875rem; padding-right: .875rem; }
  .caret { width: 2rem; height: 2rem; padding: 0; }
  .tall { height: 3rem; }

  .center { margin: 0 auto; display: flex; height: 100%; max-width: 28rem; flex-direction: column; justify-content: center;
    padding: 0 1.25rem; text-align: center; }
  .center .msg { font-size: 1.125rem; font-weight: 500; margin: 0; }
  .center .actions { margin-top: 1.5rem; display: flex; justify-content: center; gap: .75rem; }

  .lobby { margin: 0 auto; display: flex; min-height: 100%; max-width: 32rem; flex-direction: column; justify-content: center;
    gap: 1.25rem; padding: 2rem 1.25rem; }
  .scroll { height: 100%; overflow-y: auto; }
  .lobby h1 { margin: 0; font-size: 1.5rem; font-weight: 500; letter-spacing: -0.01em; }
  .preview { position: relative; aspect-ratio: 16 / 9; overflow: hidden; border-radius: var(--_radius);
    border: 1px solid var(--_line); background: var(--_surface); }
  .preview video { width: 100%; height: 100%; object-fit: cover; transform: scaleX(-1); }
  .preview .off { position: absolute; inset: 0; display: grid; place-items: center; font-size: .875rem; color: var(--_muted); }
  .alert { border-radius: calc(var(--_radius) * .75); border: 1px solid var(--_accent); background: var(--_accent-soft);
    padding: 1rem; font-size: .875rem; margin: 0; }
  .alert button { text-decoration: underline; }
  .row { display: flex; gap: .5rem; flex-wrap: wrap; }
  .pickers { display: grid; gap: .75rem; }
  @container tele (min-width: 640px) { .pickers { grid-template-columns: 1fr 1fr; } }
  label.pick { display: grid; gap: .25rem; font-size: .875rem; }
  select { width: 100%; border: 1px solid var(--_line); border-radius: .75rem; background: var(--_bg);
    padding: .55rem .7rem; font-size: .875rem; }

  header { display: flex; height: 3.5rem; flex-shrink: 0; align-items: center; justify-content: space-between;
    gap: .75rem; border-bottom: 1px solid var(--_line); padding: 0 1rem; }
  header .title { display: flex; min-width: 0; align-items: center; gap: .625rem; font-weight: 500; margin: 0; }
  header .title span:last-child { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .dot { width: .75rem; height: .75rem; flex-shrink: 0; border-radius: 9999px; background: var(--_accent); }
  header .meta { display: flex; align-items: center; gap: .75rem; font-size: .875rem; color: var(--_muted); white-space: nowrap; }

  .recording { display: flex; flex-shrink: 0; align-items: center; justify-content: center; gap: .5rem;
    background: var(--_accent); color: var(--_bg); padding: .375rem 1rem; font-size: .875rem; font-weight: 500; }
  .recording .pulse { width: .5rem; height: .5rem; border-radius: 9999px; background: var(--_bg); animation: pulse 2s infinite; }
  @keyframes pulse { 50% { opacity: .5; } }
  .banner { flex-shrink: 0; background: var(--_surface); padding: .5rem 1rem; text-align: center; font-size: .875rem;
    color: var(--_muted); margin: 0; }
  button.banner { text-decoration: underline; color: var(--_text); width: 100%; }

  .body { position: relative; display: flex; min-height: 0; flex: 1; }
  .stage { min-width: 0; flex: 1; overflow-y: auto; padding: 1rem; }
  .grid { display: grid; height: 100%; grid-auto-rows: 1fr; gap: .75rem; grid-template-columns: 1fr; }
  @container tele (min-width: 640px) { .grid.c2, .grid.c3 { grid-template-columns: repeat(2, 1fr); } }
  @container tele (min-width: 1024px) { .grid.c3 { grid-template-columns: repeat(3, 1fr); } }
  .speaker { display: flex; height: 100%; flex-direction: column; gap: .75rem; }
  .speaker .main { min-height: 0; flex: 1; display: grid; }
  .speaker .strip { display: flex; gap: .75rem; overflow-x: auto; flex-shrink: 0; }
  .speaker .strip .tile { width: 12rem; min-height: 7rem; height: 7rem; flex-shrink: 0; }

  .tile { position: relative; min-height: 10rem; overflow: hidden; border-radius: var(--_radius);
    background: var(--_surface); border: 1px solid var(--_line); }
  .tile.speaking { border-color: transparent; outline: 2px solid var(--_accent); }
  .tile video { width: 100%; height: 100%; object-fit: cover; display: block; }
  .tile video.contain { object-fit: contain; }
  .tile video.mirror { transform: scaleX(-1); }
  .avatar-wrap { display: grid; width: 100%; height: 100%; place-items: center; }
  .avatar { display: grid; width: 4rem; height: 4rem; place-items: center; border-radius: 9999px; background: var(--_bg);
    font-size: 1.25rem; font-weight: 500; }
  .name { position: absolute; bottom: .5rem; left: .5rem; border-radius: 9999px; background: rgb(0 0 0 / .55);
    padding: .125rem .625rem; font-size: .75rem; color: #fff; max-width: calc(100% - 1rem);
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

  aside { display: flex; flex-direction: column; background: var(--_bg); position: absolute; inset: 0; z-index: 10; }
  @container tele (min-width: 768px) {
    aside { position: static; width: 20rem; flex-shrink: 0; border-left: 1px solid var(--_line); }
  }
  aside h2 { margin: 0; border-bottom: 1px solid var(--_line); padding: .75rem 1rem; font-size: .875rem; font-weight: 500; }
  aside ul { list-style: none; margin: 0; flex: 1; overflow-y: auto; padding: 1rem; font-size: .875rem; display: grid;
    align-content: start; gap: .75rem; }
  aside li.mine { text-align: right; }
  aside .who { display: block; font-size: .75rem; color: var(--_muted); }
  aside .bubble { margin-top: .125rem; display: inline-block; max-width: 85%; white-space: pre-wrap; overflow-wrap: anywhere;
    border-radius: var(--_radius); padding: .5rem .75rem; text-align: left; background: var(--_surface); }
  aside li.mine .bubble { background: var(--_text); color: var(--_bg); }
  aside form { display: flex; gap: .5rem; border-top: 1px solid var(--_line); padding: .75rem; }
  aside input { width: 100%; min-width: 0; border: 1px solid var(--_line); border-radius: .75rem; background: var(--_bg);
    padding: .6rem .8rem; font-size: .9rem; }
  aside input:focus { outline: 2px solid var(--_accent); outline-offset: -1px; }

  footer { display: flex; flex-shrink: 0; flex-wrap: wrap; align-items: center; justify-content: center; gap: .5rem;
    border-top: 1px solid var(--_line); padding: .75rem 1rem; }
  .pair { display: flex; align-items: center; gap: .25rem; }
  .menu { position: relative; }
  .pop { position: absolute; bottom: 100%; left: 50%; z-index: 20; margin-bottom: .5rem; display: grid; width: 18rem;
    transform: translateX(-50%); gap: .75rem; border-radius: calc(var(--_radius) * .75); border: 1px solid var(--_line);
    background: var(--_bg); padding: 1rem; text-align: left; }
  .pop .err { margin: 0; font-size: .875rem; color: var(--_accent); }
  svg { display: block; flex-shrink: 0; }
`;

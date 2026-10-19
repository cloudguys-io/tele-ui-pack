# Development

```bash
git clone git@github.com:cloudguys-io/tele-ui-pack.git
cd tele-ui-pack
npm ci
npm test          # node --test, no browser needed
npm run typecheck
npm run build     # dist/: ESM, React wrapper, IIFE, type declarations
```

Node 23.6 or later runs the TypeScript tests directly.

## Layout

| Path | |
|---|---|
| `src/element.ts` | The `<tele-call>` custom element (Lit) |
| `src/session.ts` | Connects, publishes, reconnects and tracks participants and chat |
| `src/state.ts` | The call state machine (`lobby` to `left`), pure and unit-tested |
| `src/media.ts` | Device listing and switching |
| `src/diagnostics.ts` | Connection reports for Tele's call inspector |
| `src/i18n.ts` | English and Bangla labels |
| `src/styles.ts` | Styles and theme variables |
| `src/react.tsx` | The React wrapper |
| `build.mjs` | esbuild for ESM and IIFE, then `tsc` for declarations |

## Docs

These pages are built with [Zensical](https://zensical.org/):

```bash
npm run docs        # live preview on http://localhost:8000
npm run docs:build  # static site in site/
```

## Releasing

1. Bump `version` in `package.json` and note the change in the README's changelog.
2. `npm test && npm run build`.
3. Tag and push: `git tag v0.2.0 && git push --tags`.
4. Consumers move to the new tag: `npm install github:cloudguys-io/tele-ui-pack#v0.2.0`.

## Rules

- No em or en dashes in any user-visible label, in any language.
- No user-visible mention of the media server's vendor; say "media server".
- Every label goes through `src/i18n.ts`, in both languages.

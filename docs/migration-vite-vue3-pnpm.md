# Vite + Vue 3 + TypeScript + pnpm Migration

Branch: `chore/vite-vue3-pnpm-migration`

Current phase: Migration complete; Vue SFC TypeScript conversion is in progress as a follow-up.

## Goals

- Replace Vue CLI / Webpack with Vite-based tooling.
- Move the Electron build pipeline away from `vue-cli-plugin-electron-builder`.
- Upgrade the renderer from Vue 2 to Vue 3.
- Introduce TypeScript gradually without blocking runtime migration.
- Standardize dependency management on pnpm.

## Phase 0: Baseline

- [x] Create migration branch.
- [x] Add this migration checklist.
- [x] Record current package scripts and build assumptions.
- [x] Run the current build/lint baseline before toolchain replacement.

## Phase 1: pnpm

- [x] Add `packageManager` metadata.
- [x] Generate `pnpm-lock.yaml`.
- [x] Remove stale lock files after pnpm lock generation succeeds.
- [x] Update GitHub Actions from Yarn/npm cache to pnpm cache.
- [x] Verify install scripts, especially `electron-builder install-app-deps`.

## Phase 2: Vite / Electron Build Pipeline

- [x] Add Vite/electron-vite dependencies and config.
- [x] Move renderer HTML entry from `public/index.html` to Vite-compatible `index.html`.
- [x] Replace Vue CLI env usage with Vite env compatibility defines.
- [x] Replace `vue-cli-plugin-electron-builder` protocol/dev-server assumptions.
- [x] Move `electronBuilder.builderOptions` out of `vue.config.js`.
- [x] Replace Webpack-only SVG loading (`require.context`, `svg-sprite-loader`).
- [x] Replace Webpack-only static globals such as `__static`.
- [x] Verify Electron dev run.
- [x] Verify Electron directory package build.
- [x] Replace Vue CLI-based lint script.

## Phase 3: Vue 3

- [x] Upgrade Vue core packages.
- [x] Replace `new Vue()` with `createApp()`.
- [x] Upgrade `vue-router` 3 to 4.
- [x] Upgrade `vuex` 3 to 4.
- [x] Upgrade `vue-i18n` 8 to 11.
- [x] Replace removed Vue filters with helpers/global properties.
- [x] Replace `.native` event modifiers.
- [x] Replace Vue 2 lifecycle names where needed.
- [x] Replace or upgrade Vue 2-only plugins.

## Phase 4: TypeScript

- [x] Add `tsconfig.json` and Vite env declarations.
- [x] Enable gradual JS interop first.
- [x] Convert provider/API modules first.
- [x] Convert Electron main/preload code gradually.
- [ ] Convert Vue SFC scripts gradually.
- [x] Add `vue-tsc` type checking once the app compiles under Vue 3.

## Phase 5: Verification

- [x] `pnpm install`.
- [x] `pnpm lint`.
- [x] `pnpm typecheck`.
- [x] `pnpm build`.
- [x] `pnpm electron:serve`.
- [x] `pnpm electron:build`.
- [x] `electron-builder --dir` package verification.
- [x] Verify login, library, liked songs, playback, settings, and packaging.

## Notes

- Keep changes incremental and runnable at each phase where feasible.
- Do not combine Vue 3 conversion with the initial Vite build-pipeline replacement unless the Vue 2 compatibility route becomes more expensive than a direct cutover.
- Preserve Electron behavior first; renderer modernization follows after the build pipeline is stable.
- pnpm is pinned to `11.2.2` via `packageManager`; Node is currently pinned to `22` in `.nvmrc` and `>=20.19.0` in `package.json`.
- pnpm 11 rejected the pnpm 10 lock due minimum release age checks, so the lockfile was cleaned and regenerated under pnpm 11.
- `discord-rich-presence` pulls a legacy Git subdependency; `blockExoticSubdeps` is disabled for now and `register-scheme` build scripts are ignored until that dependency is replaced.
- `pnpm lint`, `pnpm typecheck`, and `pnpm build` pass. Existing lint/CSS/Sass warnings remain and are not migration regressions.
- `pnpm build` now runs `electron-vite build` and outputs to `out/`.
- `electron-builder` config now lives in `electron-builder.yml`; Windows `--dir` packaging and `pnpm electron:build` succeed when writing to clean temp output directories.
- The old `vue.config.js`, `public/index.html`, `scripts/with-legacy-openssl.js`, `vue-cli-plugin-electron-builder`, `svg-sprite-loader`, and old esbuild Webpack loader dependencies have been removed.
- The previous MPRIS integration source has been removed along with Discord Rich Presence cleanup; related legacy native dependency concerns no longer affect the current source tree.
- Vue 3 migration keeps the Options API structure. `vue-router`, `vuex`, `vue-i18n`, `vue-gtag`, and `vue-slider-component` are upgraded.
- Global Vue filters were replaced with `$filters.*` helpers, and `vue-clipboard2` was replaced with a small local clipboard plugin.
- TypeScript is scaffolded with `allowJs` only for `electron.vite.config.mjs`; `src/**/*.js` is no longer included because source modules have been converted to `.ts`. Vue SFC scripts remain a gradual follow-up.
- `pnpm electron:serve` reaches the Electron `window ready-to-show` event. The devtools installer import was adjusted for the Vite-bundled CommonJS shape and now uses `VUEJS3_DEVTOOLS`.
- Vite `index.html` restores `meta[name="theme-color"]`; `changeAppearance()` also guards the meta lookup to avoid startup white screens if the tag is missing.
- `App.vue` now uses the Vue Router 4 `router-view` slot pattern with `keep-alive`, and kept-alive pages use injected App scroll helpers instead of reaching through `$parent.$refs`.
- `SvgIcon` restores the old sprite-loader default `1em` SVG sizing. Without it, Vite-rendered icon SVGs fall back to browser default dimensions and break the navigation/player layout.
- Custom titlebar IPC access now checks `window.require('electron')` directly and uses optional sends, avoiding null IPC crashes if the Electron env define is stale during dev reloads.
- `App.vue` now uses a single Vue Router 4 `router-view` slot wrapped by `KeepAlive include`, avoiding conditional keep-alive/non-keep-alive branches that could leave route pages blank during navigation.
- Player progress is synchronized through the Vuex-held reactive player proxy. Vue 3 does not reliably update components when the raw `Player` class instance mutates `_progress` from its internal timer.
- Bottom player and lyrics page now maintain local progress values refreshed from `player.seek()` so progress bars update continuously without requiring a route re-render.
- `ButtonIcon` sets a root text color so slotted SVG icons inherit the intended theme color under Vue 3 scoped-slot styling.
- `ContextMenu` uses Vue 3 `:deep()` selectors for slotted menu content (`.item`, `.item-info`, `hr`), restoring the pre-migration menu layout for profile and track context menus.
- Husky was upgraded from v4 to v9 with `.husky/pre-commit`; the old v4 Git hook used `pnpx --no-install`, which is incompatible with pnpm 11 / `pnpm dlx`.
- Discord Rich Presence support was removed by request, including renderer settings, Player IPC calls, main-process RPC handlers, locale strings, and `discord-rich-presence` plus its git subdependency chain.
- Deprecated `vscode-codicons` was replaced with `@vscode/codicons`.
- Electron renderer windows now use `webSecurity: true`; external Last.fm windows use `nodeIntegration: false` and `contextIsolation: true`. `index.html` now includes a CSP meta tag for the Vite/Electron renderer.
- Main renderer IPC was migrated behind `src/preload.ts` with a restricted `window.electronAPI` bridge. The main BrowserWindow now runs with `nodeIntegration: false` and `contextIsolation: true`.
- Removed the stale `win.publisherName` electron-builder field; electron-builder 26 rejects it during Windows packaging config validation.
- GitHub publishing now targets `rzh0504/Syfome-desktop`.
- Full GUI/runtime QA has been completed for login, library, liked songs, playback, settings, and packaging. Automated checks verify install, lint, typecheck, Vite build, Electron dev startup, and Windows packaging.
- Converted low-risk Vue SFC scripts to TypeScript for `ButtonIcon`, `SvgIcon`, `ExplicitSymbol`, `Toast`, `ButtonTwoTone`, `ArtistsInLine`, `Modal`, `LinuxTitlebar`, `Cover`, `CoverRow`, `MvRow`, `Login`, `LoginUsername`, `ArtistMV`, `NewAlbum`, `DailyTracks`, and `lastfmCallback`. 25 Vue SFC scripts remain on plain `<script>` for gradual follow-up.

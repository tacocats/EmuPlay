# AGENTS.md

This file provides guidance to AI coding agents (Claude Code, Codex, etc.) when working with code in this repository.

EmuPlay is a TV/desktop client for a [RomM](https://github.com/rommapp/romm) server: pair with the server, browse the library, and launch games, mainly through RomM's server-side emulator streaming (WebRTC) shown in a WebView. One React Native codebase ships to Android TV (and tvOS, unverified) via `react-native-tvos`, and to Windows/macOS/Linux via react-native-web + Vite inside Electron. README.md has the full developer docs (release process, signing, e2e setup, desktop usage); this file is the short version.

## Commands

```sh
npm test                                  # Jest, both projects (native + web)
npx jest src/api/__tests__/rommClient.test.ts      # one file
npx jest -t 'name of test'                # by test name
npx jest --selectProjects web             # only the web/desktop project
npm run typecheck                         # 4 tsc passes: native, web, electron/, e2e-desktop/
npm run lint                              # ESLint (hooks use --max-warnings=0)
npm run format:check                      # Prettier 2.x
npm run knip                              # unused files/exports/deps

npm start                                 # Metro
npm run android                           # Android TV build + install
npm run dev:desktop                       # Vite dev server + Electron, hot reload
npm run build:desktop && npm run e2e:desktop   # Playwright desktop e2e (xvfb-run -a on headless Linux)
npm run e2e:build && npm run e2e:test     # Detox, Android TV AVD `Television_1080p`, needs Metro running
```

- `mise.toml` pins Node 22.13 and JDK 17 to match CI, and sets `JAVA_HOME` and `ANDROID_HOME`. Run `mise install` once. Without mise, Gradle still needs JDK 17: set `JAVA_HOME` to your JDK 17 installation, because JDK 21 breaks it. Machine-specific env goes in the git-ignored `mise.local.toml`.
- To run Metro on a non-default port, set `RCT_METRO_PORT` for both the Android build and `npm start -- --port <port>`, because the port is baked into the debug APK. `start.sh` launches the TV emulator and app on 8082 this way.
- lefthook pre-commit runs Prettier (re-stages), ESLint, the full typecheck and `jest --findRelatedTests` on staged files; pre-push runs the full Jest suite.
- Don't bump pinned versions without reading README's "Known environment gotchas": Gradle wrapper is pinned to 8.13, `react-native-screens` to 4.25.2, and `.npmrc` sets `legacy-peer-deps` because of `react-native-tvos`'s `0.83.0-0` version scheme.

## Architecture

### One codebase, two platform layers

Platform differences live in `.web.ts(x)` siblings of native files (e.g. `secureStore.web.ts`, `hardwareKeySource.web.ts`, `tvFocus.web.ts`, `PlayerWebView.web.tsx`, `DesktopSettingsSection.web.tsx`). Vite (`vite.config.mts`) prefers `.web.*` and aliases `react-native` to `web/shims/react-native.tsx` (react-native-web plus the tvOS extras the app uses, like `TVFocusGuideView`/`hasTVPreferredFocus`). Metro never sees the web files. When changing behavior that differs per platform, check for a `.web` sibling.

Desktop-specific plumbing:

- `electron/` is the main process and preloads, bundled by `scripts/build-electron.mjs`. `electron/api.ts` defines the IPC contract shared with the renderer via `src/desktop/bridge.ts`.
- Browser `fetch` has CORS and RomM doesn't send CORS headers, so `src/desktop/fetchBridge.ts` transparently routes cross-origin `fetch` through the main process (`electron/rommFetch.ts`). App code just calls `fetch`.
- `src/input/web/` replaces the TV focus engine with its own spatial navigation and adds keyboard + Gamepad API input.
- Secure storage uses Electron `safeStorage` (`electron/secureStore.ts`) in place of the keychain.

### Auth

`AuthContext` (`src/auth/AuthContext.tsx`) holds `status` (`loading`/`signedOut`/`signedIn`), and `RootNavigator` picks the Login screen or the signed-in stack from it. Sign-in is device pairing only (`src/api/deviceAuth.ts`): RomM issues a code/QR, a user approves it in RomM, and the device gets a client API token kept in secure storage. API calls go through `withAuth((serverUrl, token) => rommClient.fn(serverUrl, token, ...))`. `src/api/rommClient.ts` is a set of plain functions that take the server URL and token explicitly, not a stateful client.

### Launching a game

1. `src/utils/resolvePlayPath.ts` fetches heartbeat, config and `/api/streaming/config` in parallel (each failure falls back to a safe default) and calls the pure `playPath.ts`, which mirrors RomM's frontend logic and returns a route like `/rom/:id/stream` or `/rom/:id/ejs`.
2. Streaming (the default): `src/api/streamingSession.ts` claims a container and polls until the room URL is up, then `GameStreamPlayerScreen` shows it and keeps the claim alive with a heartbeat (released on exit). `src/player/selkies/` holds the postMessage commands for the Selkies stream (resolution, etc.).
3. In-browser players (EmulatorJS, js-dos, etc.) via `EmulatorPlayerScreen` sit behind `DEFAULT_IN_BROWSER_PLAY_ENABLED = false` in `src/settings/settingsStore.ts`, which has no UI toggle.

Both player screens wrap `WebPlayerScreen`, which owns the WebView, injected JS and the pause menu (`PlayerMenu`).

### Hardware keys

`src/input/hardwareKeys.ts` (`useHardwareKeys`) lets screens intercept remote/controller keys. On Android the source is a TurboModule: the codegen spec is `src/native/NativeKeyEvents.ts` (`codegenConfig` in package.json), implemented in `android/app/src/main/java/com/emuplay/keyevents/`. `MainActivity` swallows the requested keys and re-emits them as `emuplay.hardwareKey` events. The event name must match `KeyEventBridge.EVENT_NAME`.

## Testing conventions

- Tests sit beside the code in `src/**/__tests__/`. `jest.config.js` has two projects: `native` (RN preset, most tests) and `web` (jsdom, `.web` resolution) for `*.web.test.ts(x)` and `src/**/web/__tests__/`.
- Native modules are mocked once in `jest.setup.js`. `jest.setupAfterEnv.js` resets mock state and installs a `fetch` mock that **fails loudly unless a test queues a response**: use `mockFetchOnce` from `src/testUtils/fetchMock.ts`. Other helpers there: `createAuthValue` (mockAuth) and `createScreenProps` (navigation).
- React Native Testing Library v14 is async: `await render(...)`, `await fireEvent.press(...)`.
- RNTL's `act` returns a bare thenable, so `await expect(act(...)).resolves` doesn't wait for it. Wrap it in `Promise.resolve(...)` first (see `actAsync` in `src/auth/__tests__/AuthContext.test.tsx`).
- In Playwright desktop e2e, keys meant for the running game must go through `webContents.sendInputEvent` (`pressInGame`), not `page.keyboard`.

## Conventions

- ESLint allows `void promise()` as a statement, and SonarCloud expects it for deliberate fire-and-forget promises.
- Log through `createLogger('namespace')` from `src/utils/logger.ts`, not `console`.
- AsyncStorage keys are versioned (`emuplay.foo.v2`). Bump the suffix when a value's meaning or default changes.
- Colors come from `src/theme/colors.ts`.

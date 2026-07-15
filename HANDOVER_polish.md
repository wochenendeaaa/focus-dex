# Handover: Polish Pass (5 Arbeitspakete)

Self-contained work order for the FocusDex repo. Execute the packages **in order**
(1 → 2 → 3 → 4 → 5). Each package is independent — finish, verify, and commit one
before starting the next.

## Project context (read first)

- Vite + TypeScript, **vanilla DOM, no framework**. UI is built with
  `document.createElement` in `src/ui/*.ts`. Follow that style exactly — do not
  introduce JSX, templates, or libraries.
- All user-facing UI strings are **German**. New strings must be German too.
- Retro GBA aesthetic: fixed 240×220 logical canvas, integer-upscaled
  (`src/styles/layout.css`), 16-color palette as CSS custom properties
  (`src/styles/tokens.css`). Colors must come from the existing `--sw-*` /
  semantic variables — never hardcode new hex values in TS or CSS.
- Timer core: pure state machine in `src/timer/state-machine.ts` with phases
  `idle | work | break | done`, orchestrated in `src/main.ts` (`render()`,
  `applyTick()`, 250ms interval). Timestamps, no background process.
- Spotify: PKCE client in `src/spotify/`, playback via Spotify Connect.

### Hard rules

1. **Do not modify** `src/timer/state-machine.ts`, `src/spotify/pkce.ts`,
   `src/spotify/auth.ts`, `src/spotify/api.ts`. No package needs changes there.
2. **Do not add runtime npm dependencies.** (Package 5 adds one **dev**
   dependency, `sharp`, for a build-time script — that is the only exception.)
3. **Do not touch `.env`** and never commit it (it is gitignored; keep it that way).
4. Spotify Web API: this app may only use `GET /me/playlists`,
   `GET/POST /playlists/{id}/items`, `GET /search`, and the `/me/player/*`
   endpoints. Endpoints like `/recommendations`, `/audio-features`, `/browse/*`
   return 403 for this app (2026 dev-mode restrictions). No package here should
   need any new API calls anyway.
5. After **every** package: `npx tsc --noEmit` and `npm run test` must pass.
6. One git commit per package, message in English, imperative mood, body
   explains the why. Push after each commit (push triggers the Vercel deploy of
   https://focus-dex.vercel.app).
7. Dev-server quirk on this machine: run `npm run dev -- --host 127.0.0.1`
   (plain `localhost` binds IPv6-only; `127.0.0.1` in the browser then fails).

---

## Package 1 — Show the session-complete screen (bug fix)

**Problem:** `render()` in `src/main.ts` maps phase `done` to the settings view,
so when the final cycle ends the app silently returns to settings. The
`"FERTIG!"` label and `"Gute Arbeit!"` text in `src/ui/timer-view.ts` are dead
code — they can never appear. There is also no sound on completion
(`announcePhase()` in `src/main.ts` only plays cues for `work` and `break`).

**Change:**

1. In `src/main.ts` `render()`: change the category mapping so that **only**
   `idle` maps to `"settings"`; `work`, `break`, **and `done`** map to
   `"timer"`. The timer view already renders the done state correctly
   (`FERTIG!`, `Gute Arbeit!`, STOPP/SKIP disabled, RESET enabled — RESET is the
   way back to settings and already works).
2. In `src/audio/cue-player.ts`: extend `CueKind` to
   `"work" | "break" | "done"` and add a third, slightly longer jingle for
   `"done"` (same oscillator style as the existing two; e.g. a rising 3-note
   arpeggio C5→E5→G5, each ~0.12s, 0.1s apart). Keep the existing two cues
   unchanged.
3. In `src/main.ts` `announcePhase()`: also play the cue when the phase is
   `"done"`.

**Notes:**
- `stopSpotifyPlayback()` on the done transition already exists in
  `applyTick()` — do not duplicate it.
- The ring shows 0% remaining in the done state (fraction is clamped) — fine.
- Browsers may block the done-cue if the page reloads straight into `done`
  with no prior user gesture. Acceptable; do not add workarounds.

**Verify:** In the browser set ARBEIT=1, PAUSE=1, ZYKLEN=1 — wait through both
phases (~2 min) or click SKIP twice. Expect: timer view stays visible, shows
`FERTIG!` + `Gute Arbeit!`, done-jingle plays, STOPP/SKIP disabled, RESET
returns to settings. Reload while in done state → done screen shows again.

---

## Package 2 — Add the pixel font (missing asset)

**Problem:** `src/styles/tokens.css` declares `@font-face` for
`/fonts/PixelOperator.woff2`, but `public/fonts/` does not exist. Every device
falls back to generic monospace.

**Change:**

1. Download **Pixel Operator** (public domain / CC0, by Jayvee Enaguas):
   https://www.dafont.com/pixel-operator.font — the zip contains multiple TTFs.
   Use `PixelOperator.ttf` (the regular 16px-design variant).
2. Place it at `public/fonts/PixelOperator.ttf`.
3. Add `public/fonts/LICENSE.txt` with one line:
   `Pixel Operator by Jayvee Enaguas (HarvettFox96), released under CC0 1.0 / public domain.`
4. In `tokens.css`, change the `@font-face` `src` to
   `url("/fonts/PixelOperator.ttf") format("truetype")` (no woff2 conversion —
   keep it simple; the TTF is small).

**Verify:** `npm run dev -- --host 127.0.0.1`, open the app: text must render
in the pixel font (blocky, no anti-aliased curves — compare against the current
monospace fallback). Check the Network tab: the TTF loads with HTTP 200. Then
check the timer view too (START a session): time digits render in the pixel font.

---

## Package 3 — Screen Wake Lock during sessions

**Problem:** On the phone, cues only work while the tab is in the foreground —
but the screen auto-locks after ~30s, killing the session UX. The Screen Wake
Lock API keeps the display on.

**Change:**

1. New file `src/wake-lock.ts` exporting a single function
   `syncWakeLock(active: boolean): void`:
   - Module-level variable holds the current `WakeLockSentinel | null`.
   - `active === true` and no sentinel held → `navigator.wakeLock.request("screen")`
     (guard with `"wakeLock" in navigator`; wrap in try/catch; on failure do
     nothing — no error UI, no console spam beyond a single `console.warn`).
   - `active === false` and a sentinel is held → `release()` it, clear the variable.
   - Also listen for the sentinel's `"release"` event to clear the variable
     (the browser auto-releases when the tab is hidden).
   - The function must be idempotent and never throw.
2. In `src/main.ts` `render()`: after the existing logic, call
   `syncWakeLock(isRunning)` where `isRunning` is: phase is `work` or `break`
   **and** `state.pausedRemainingMs === null`. (render() runs every tick, so
   this single call site also re-acquires the lock when the tab becomes
   visible again — the existing `visibilitychange` handler already triggers
   `applyTick()` → `render()`.)

**TypeScript note:** `WakeLockSentinel` types are included in the DOM lib. If
`tsc` complains, use `navigator.wakeLock?.request` behind the `in` check — do
not install @types packages.

**Verify:** `tsc` + tests green. In the browser: start a session, then in
DevTools console check `document.visibilityState` interactions aren't throwing;
functional wake-lock behavior can only be truly confirmed on the phone — note
that in the commit body. STOPP (pause) must release the lock (add a temporary
`console.log` in syncWakeLock while testing if needed, then remove it).

---

## Package 4 — Immediate session start + START feedback

**Problem:** In `src/main.ts`, `startSessionWithSpotify()` awaits the Spotify
device lookup and play call **before** starting the timer — with a slow API the
session starts seconds late, there is no UI feedback, and START can be
double-clicked (firing playback twice).

**Change:**

1. Rework `startSessionWithSpotify(newConfig)` in `src/main.ts`:
   - **First**: `state = start(newConfig, Date.now()); persistAndRender();`
     (timer starts and the view switches instantly).
   - **Then**: if `isConnected()` and a playlist is selected, call
     `void tryStartPlayback(playlistUri)` fire-and-forget (no await, no gating).
2. Simplify `tryStartPlayback` accordingly: it no longer needs to return a
   boolean and its callers no longer gate on it. The device-retry dialog keeps
   working (it overlays the now-visible timer view); its ABBRECHEN button now
   simply closes the dialog — the session continues without music. Keep the
   existing error dialogs (Premium, expired auth, generic) exactly as they are.
3. In `src/ui/settings-view.ts`: in the START click handler, set
   `startBtn.disabled = true` before calling `onStart(...)` (the view is
   replaced immediately afterwards, so it never needs re-enabling).

**Verify:** START switches to the timer view instantly (no perceptible delay)
with Spotify connected and disconnected. With Spotify connected but the Spotify
app closed on all devices, the device dialog appears **over the running timer**;
ABBRECHEN closes it and the timer keeps running. `tsc` + tests green.

---

## Package 5 — App icon, favicon, home-screen metadata

**Problem:** `public/manifest.webmanifest` has `"icons": []` and `index.html`
has no favicon or Apple touch icon — browser tabs and "Add to Home Screen"
show blank/default icons.

**Change:**

1. Create `scripts/gen-icons.mjs` (below, copy verbatim), add `sharp` as a dev
   dependency (`npm i -D sharp`), run `node scripts/gen-icons.mjs`. It generates:
   - `public/favicon.svg`
   - `public/icons/icon-192.png`, `public/icons/icon-512.png`,
     `public/icons/apple-touch-icon.png` (180×180)
2. In `index.html` `<head>` add:
   ```html
   <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
   <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
   <meta name="apple-mobile-web-app-capable" content="yes" />
   <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
   ```
3. In `public/manifest.webmanifest` set:
   ```json
   "icons": [
     { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
     { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
   ]
   ```
4. Commit the **generated PNG/SVG files** along with the script.

`scripts/gen-icons.mjs` — copy exactly, do not redesign the pixel art:

```js
import { mkdir, writeFile } from "node:fs/promises";
import sharp from "sharp";

// 16x16 pixel-art tomato (Pomodoro) on the app's dark-navy background.
// Legend: . = background, O = tomato body, Y = highlight, G = leaf
const GRID = [
  "................",
  "................",
  "......GG.GG.....",
  ".......GGG......",
  "........G.......",
  "....OOOOOOOO....",
  "...OOOOOOOOOO...",
  "..OOYOOOOOOOOO..",
  "..OYYOOOOOOOOO..",
  "..OOYOOOOOOOOO..",
  "..OOOOOOOOOOOO..",
  "..OOOOOOOOOOOO..",
  "...OOOOOOOOOO...",
  "....OOOOOOOO....",
  "................",
  "................",
];

// Sweetie-16 colors, matching src/styles/tokens.css
const COLORS = { ".": "#1a1c2c", O: "#ef7d57", Y: "#ffcd75", G: "#38b764" };

function gridToSvg() {
  const rects = [];
  GRID.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      rects.push(`<rect x="${x}" y="${y}" width="1" height="1" fill="${COLORS[ch]}"/>`);
    });
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="512" height="512" shape-rendering="crispEdges">${rects.join("")}</svg>`;
}

const svg = gridToSvg();
await mkdir("public/icons", { recursive: true });
await writeFile("public/favicon.svg", svg);
for (const [size, name] of [[192, "icon-192.png"], [512, "icon-512.png"], [180, "apple-touch-icon.png"]]) {
  await sharp(Buffer.from(svg)).resize(size, size, { kernel: "nearest" }).png().toFile(`public/icons/${name}`);
}
console.log("Icons generated.");
```

**Verify:** All four files exist and the PNGs show a crisp (not blurry) pixel
tomato — open them. Favicon appears in the browser tab on the dev server.
`tsc` + tests green (the script is not part of the app bundle).

---

## Final acceptance checklist

- [ ] All 5 packages committed individually and pushed; Vercel deploy green.
- [ ] `npx tsc --noEmit` clean, `npm run test` 10/10 green.
- [ ] Full manual run: connect Spotify → pick playlist → START (instant) →
      SKIP through to FERTIG! screen (jingle plays) → RESET → settings.
- [ ] No new hardcoded colors, no new runtime dependencies, `.env` untouched.

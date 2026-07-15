import "./styles/tokens.css";
import "./styles/layout.css";
import "./styles/components.css";

import { playCue } from "./audio/cue-player";
import { isAuthError, isPremiumRequiredError } from "./spotify/api";
import { disconnect, handleRedirectCallback, isConnected } from "./spotify/auth";
import { getDevices, pausePlayback, playContext } from "./spotify/player";
import { clearTimer, loadTimer, saveTimer } from "./timer/persistence";
import {
  initialState,
  pause,
  reset,
  resume,
  skip,
  start,
  tick,
  type TimerConfig,
  type TimerState,
} from "./timer/state-machine";
import { showDeviceRetryDialog, showMessageDialog } from "./ui/device-retry-dialog";
import { createSettingsView } from "./ui/settings-view";
import { getSelectedPlaylistUri } from "./ui/spotify-connect-view";
import { createTimerView } from "./ui/timer-view";
import { syncWakeLock } from "./wake-lock";

const DEFAULT_CONFIG: TimerConfig = { workMinutes: 25, breakMinutes: 5, cycles: 4 };

const app = document.getElementById("app");
if (!app) throw new Error("Missing #app root element");

const viewport = document.createElement("div");
viewport.className = "viewport";
const screen = document.createElement("div");
screen.className = "screen";
viewport.appendChild(screen);
app.appendChild(viewport);

const persisted = loadTimer();
let config: TimerConfig = persisted?.config ?? DEFAULT_CONFIG;
let state: TimerState = persisted?.state ?? initialState;
// Catch up immediately in case real time passed while the app was closed.
state = tick(state, config, Date.now());

function announcePhase(phase: TimerState["phase"]): void {
  if (phase === "work" || phase === "break" || phase === "done") {
    playCue(phase);
  }
}

function stopSpotifyPlayback(): void {
  if (!isConnected()) return;
  pausePlayback().catch((err: unknown) => {
    console.warn("Spotify pause failed", err);
  });
}

/**
 * Finds an active/available device and starts playback. Fire-and-forget from
 * the caller's perspective — the timer session already started by the time
 * this resolves; Spotify is an enhancement, not a gate on the timer.
 */
async function tryStartPlayback(playlistUri: string): Promise<void> {
  try {
    const devices = await getDevices();
    const device = devices.find((d) => d.isActive) ?? devices[0];
    if (!device) {
      const dismiss = showDeviceRetryDialog(screen, {
        onRetry: () => {
          dismiss();
          void tryStartPlayback(playlistUri);
        },
        onCancel: () => {
          dismiss();
        },
      });
      return;
    }
    await playContext(device.id, playlistUri);
  } catch (err) {
    if (isPremiumRequiredError(err)) {
      showMessageDialog(screen, "Spotify Premium erforderlich für die Wiedergabesteuerung.");
    } else if (isAuthError(err)) {
      disconnect();
      showMessageDialog(screen, "Spotify-Verbindung abgelaufen — bitte erneut verbinden.");
    } else {
      showMessageDialog(screen, "Spotify-Wiedergabe konnte nicht gestartet werden.");
    }
  }
}

function startSessionWithSpotify(newConfig: TimerConfig): void {
  state = start(newConfig, Date.now());
  persistAndRender();

  const playlistUri = getSelectedPlaylistUri();
  if (isConnected() && playlistUri) {
    void tryStartPlayback(playlistUri);
  }
}

const timerView = createTimerView({
  onPauseResume: () => {
    state =
      state.pausedRemainingMs !== null ? resume(state, Date.now()) : pause(state, Date.now());
    persistAndRender();
  },
  onSkip: () => {
    const before = state.phase;
    state = skip(state, config, Date.now());
    if (before !== state.phase) announcePhase(state.phase);
    persistAndRender();
  },
  onReset: () => {
    state = reset();
    clearTimer();
    stopSpotifyPlayback();
    render();
  },
});

let renderedView: "settings" | "timer" | null = null;

function showSettings(): void {
  screen.replaceChildren(
    createSettingsView({
      config,
      onStart: (newConfig) => {
        config = newConfig;
        startSessionWithSpotify(newConfig);
      },
    }),
  );
}

function showTimer(): void {
  screen.replaceChildren(timerView.element);
}

function render(): void {
  document.documentElement.dataset.phase = state.phase;
  const category = state.phase === "idle" ? "settings" : "timer";
  if (category !== renderedView) {
    renderedView = category;
    if (category === "settings") showSettings();
    else showTimer();
  }
  if (category === "timer") {
    timerView.update(state, config, Date.now());
  }

  const isRunning =
    (state.phase === "work" || state.phase === "break") && state.pausedRemainingMs === null;
  syncWakeLock(isRunning);
}

function persistAndRender(): void {
  saveTimer(state, config);
  render();
}

function applyTick(): void {
  const previous = state;
  state = tick(state, config, Date.now());
  if (state !== previous) {
    if (previous.phase !== state.phase) announcePhase(state.phase);
    if (previous.phase !== "done" && state.phase === "done") stopSpotifyPlayback();
    saveTimer(state, config);
  }
  render();
}

setInterval(applyTick, 250);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") applyTick();
});
window.addEventListener("focus", applyTick);

function updateScale(): void {
  const rawScale = Math.min(window.innerWidth / 240, window.innerHeight / 220);
  const scale =
    !Number.isFinite(rawScale) || rawScale <= 0
      ? 1
      : rawScale >= 1
        ? Math.max(1, Math.floor(rawScale))
        : rawScale;
  document.documentElement.style.setProperty("--scale", String(scale));
}

window.addEventListener("resize", updateScale);
updateScale();

render();

async function init(): Promise<void> {
  const result = await handleRedirectCallback();
  if (result.handled) {
    // Force the settings view to rebuild so it reflects the new auth state
    // (renderedView caching would otherwise skip the rebuild: idle -> idle).
    renderedView = null;
    render();
    if (result.error) {
      showMessageDialog(screen, result.error);
    }
  }
}

void init();

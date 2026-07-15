import {
  remainingMs,
  totalPhaseDurationMs,
  type TimerConfig,
  type TimerState,
} from "../timer/state-machine";
import { windowFrame } from "./window-frame";

export interface TimerViewCallbacks {
  onPauseResume: () => void;
  onSkip: () => void;
  onReset: () => void;
}

export interface TimerView {
  element: HTMLElement;
  update: (state: TimerState, config: TimerConfig, now: number) => void;
}

const PHASE_LABEL: Record<string, string> = {
  work: "ARBEIT",
  break: "PAUSE",
  done: "FERTIG!",
  idle: "",
};

export function createTimerView({ onPauseResume, onSkip, onReset }: TimerViewCallbacks): TimerView {
  const view = document.createElement("div");
  view.className = "view view-timer";
  view.style.alignItems = "center";
  view.style.justifyContent = "center";

  const phaseLabel = document.createElement("div");
  phaseLabel.style.fontSize = "10px";
  phaseLabel.style.color = "var(--accent-strong)";
  phaseLabel.style.textAlign = "center";

  const timeLabel = document.createElement("div");
  timeLabel.style.fontSize = "24px";
  timeLabel.style.textAlign = "center";
  timeLabel.style.margin = "4px 0";

  const cycleLabel = document.createElement("div");
  cycleLabel.style.fontSize = "8px";
  cycleLabel.style.color = "var(--text-muted)";
  cycleLabel.style.textAlign = "center";
  cycleLabel.style.marginBottom = "6px";

  const barTrack = document.createElement("div");
  barTrack.className = "bar-track";
  const barFill = document.createElement("div");
  barFill.className = "bar-fill";
  barTrack.appendChild(barFill);

  const pauseBtn = document.createElement("button");
  pauseBtn.className = "btn";
  pauseBtn.addEventListener("click", onPauseResume);

  const skipBtn = document.createElement("button");
  skipBtn.className = "btn";
  skipBtn.textContent = "SKIP";
  skipBtn.addEventListener("click", onSkip);

  const resetBtn = document.createElement("button");
  resetBtn.className = "btn";
  resetBtn.textContent = "RESET";
  resetBtn.addEventListener("click", onReset);

  const btnRow = document.createElement("div");
  btnRow.className = "btn-row";
  btnRow.style.marginTop = "8px";
  btnRow.append(pauseBtn, skipBtn, resetBtn);

  const frame = windowFrame(phaseLabel, timeLabel, cycleLabel, barTrack, btnRow);
  frame.style.display = "flex";
  frame.style.flexDirection = "column";
  frame.style.minWidth = "160px";
  view.appendChild(frame);

  function update(state: TimerState, config: TimerConfig, now: number): void {
    phaseLabel.textContent = PHASE_LABEL[state.phase] ?? "";
    cycleLabel.textContent =
      state.phase === "done"
        ? "Gute Arbeit!"
        : `Zyklus ${Math.min(state.cyclesCompleted + 1, config.cycles)}/${config.cycles}`;

    const remaining = remainingMs(state, now);
    timeLabel.textContent = formatMMSS(remaining);

    const total = totalPhaseDurationMs(state, config);
    const fillPct = total > 0 ? (remaining / total) * 100 : 0;
    barFill.style.width = `${Math.max(0, Math.min(100, fillPct))}%`;

    const isPaused = state.pausedRemainingMs !== null;
    pauseBtn.textContent = isPaused ? "WEITER" : "STOPP";

    const isDone = state.phase === "done";
    pauseBtn.disabled = isDone;
    skipBtn.disabled = isDone;
  }

  return { element: view, update };
}

function formatMMSS(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

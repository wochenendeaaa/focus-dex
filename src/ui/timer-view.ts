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

const RING_RADIUS = 42;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const SVG_NS = "http://www.w3.org/2000/svg";

export function createTimerView({ onPauseResume, onSkip, onReset }: TimerViewCallbacks): TimerView {
  const view = document.createElement("div");
  view.className = "view view-timer";
  view.style.alignItems = "center";
  view.style.justifyContent = "center";

  const phaseLabel = document.createElement("div");
  phaseLabel.style.fontSize = "10px";
  phaseLabel.style.color = "var(--accent-strong)";
  phaseLabel.style.textAlign = "center";

  const ring = document.createElement("div");
  ring.className = "timer-ring";

  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", "0 0 100 100");
  svg.classList.add("ring-svg");

  const track = document.createElementNS(SVG_NS, "circle");
  track.setAttribute("cx", "50");
  track.setAttribute("cy", "50");
  track.setAttribute("r", String(RING_RADIUS));
  track.classList.add("ring-track");

  const fill = document.createElementNS(SVG_NS, "circle");
  fill.setAttribute("cx", "50");
  fill.setAttribute("cy", "50");
  fill.setAttribute("r", String(RING_RADIUS));
  fill.classList.add("ring-fill");
  fill.style.strokeDasharray = `${RING_CIRCUMFERENCE}`;
  fill.style.strokeDashoffset = "0";

  svg.append(track, fill);

  const ringCenter = document.createElement("div");
  ringCenter.className = "ring-center";

  const timeLabel = document.createElement("div");
  timeLabel.style.fontSize = "16px";

  const cycleLabel = document.createElement("div");
  cycleLabel.style.fontSize = "6px";
  cycleLabel.style.color = "var(--text-muted)";
  cycleLabel.style.marginTop = "2px";

  ringCenter.append(timeLabel, cycleLabel);
  ring.append(svg, ringCenter);

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

  const frame = windowFrame(phaseLabel, ring, btnRow);
  frame.style.display = "flex";
  frame.style.flexDirection = "column";
  frame.style.alignItems = "center";
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
    const fraction = total > 0 ? Math.max(0, Math.min(1, remaining / total)) : 0;
    fill.style.strokeDashoffset = `${RING_CIRCUMFERENCE * (1 - fraction)}`;

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

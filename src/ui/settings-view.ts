import type { TimerConfig } from "../timer/state-machine";
import { createSpotifyConnectView } from "./spotify-connect-view";
import { windowFrame } from "./window-frame";

export interface SettingsViewOptions {
  config: TimerConfig;
  onStart: (config: TimerConfig) => void;
}

export function createSettingsView({ config, onStart }: SettingsViewOptions): HTMLElement {
  const view = document.createElement("div");
  view.className = "view view-settings";
  view.style.alignItems = "center";
  view.style.justifyContent = "center";

  const title = document.createElement("div");
  title.textContent = "FOCUSDEX";
  title.style.fontSize = "14px";
  title.style.textAlign = "center";
  title.style.marginBottom = "8px";
  title.style.color = "var(--accent-strong)";

  const form = document.createElement("div");
  form.style.display = "flex";
  form.style.flexDirection = "column";
  form.style.gap = "4px";
  form.style.minWidth = "140px";

  const workField = numberField("ARBEIT (MIN)", config.workMinutes, 1, 120);
  const breakField = numberField("PAUSE (MIN)", config.breakMinutes, 1, 60);
  const cyclesField = numberField("ZYKLEN", config.cycles, 1, 12);

  form.append(workField.row, breakField.row, cyclesField.row);

  const startBtn = document.createElement("button");
  startBtn.className = "btn";
  startBtn.textContent = "START";
  startBtn.style.marginTop = "8px";
  startBtn.style.alignSelf = "stretch";
  startBtn.addEventListener("click", () => {
    startBtn.disabled = true;
    onStart({
      workMinutes: workField.value(),
      breakMinutes: breakField.value(),
      cycles: cyclesField.value(),
    });
  });

  const frame = windowFrame(title, form, startBtn, createSpotifyConnectView());
  frame.style.display = "flex";
  frame.style.flexDirection = "column";
  view.appendChild(frame);
  return view;
}

function numberField(label: string, initial: number, min: number, max: number) {
  const row = document.createElement("label");
  row.className = "field-row";
  const span = document.createElement("span");
  span.textContent = label;
  const input = document.createElement("input");
  input.type = "number";
  input.min = String(min);
  input.max = String(max);
  input.value = String(initial);
  row.append(span, input);
  return {
    row,
    value: () => clamp(Number(input.value) || initial, min, max),
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(value)));
}

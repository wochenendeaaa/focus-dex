import type { TimerConfig, TimerState } from "./state-machine";

const STORAGE_KEY = "focusdex.timer.v1";

export interface PersistedTimer {
  state: TimerState;
  config: TimerConfig;
}

export function saveTimer(state: TimerState, config: TimerConfig): void {
  const payload: PersistedTimer = { state, config };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export function loadTimer(): PersistedTimer | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PersistedTimer;
    if (!parsed || typeof parsed !== "object" || !parsed.state || !parsed.config) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearTimer(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export type Phase = "idle" | "work" | "break" | "done";

export interface TimerConfig {
  workMinutes: number;
  breakMinutes: number;
  cycles: number;
}

export interface TimerState {
  phase: Phase;
  phaseEndsAt: number | null;
  pausedRemainingMs: number | null;
  cyclesCompleted: number;
}

export const initialState: TimerState = {
  phase: "idle",
  phaseEndsAt: null,
  pausedRemainingMs: null,
  cyclesCompleted: 0,
};

function phaseDurationMs(phase: Phase, config: TimerConfig): number {
  if (phase === "work") return config.workMinutes * 60_000;
  if (phase === "break") return config.breakMinutes * 60_000;
  return 0;
}

function nextPhase(
  state: TimerState,
  config: TimerConfig,
): { phase: Phase; cyclesCompleted: number } {
  if (state.phase === "work") {
    return { phase: "break", cyclesCompleted: state.cyclesCompleted };
  }
  if (state.phase === "break") {
    const cyclesCompleted = state.cyclesCompleted + 1;
    if (cyclesCompleted >= config.cycles) {
      return { phase: "done", cyclesCompleted };
    }
    return { phase: "work", cyclesCompleted };
  }
  return { phase: "work", cyclesCompleted: 0 };
}

export function start(config: TimerConfig, now: number): TimerState {
  return {
    phase: "work",
    phaseEndsAt: now + phaseDurationMs("work", config),
    pausedRemainingMs: null,
    cyclesCompleted: 0,
  };
}

export function pause(state: TimerState, now: number): TimerState {
  if (state.phaseEndsAt === null || state.phase === "idle" || state.phase === "done") {
    return state;
  }
  return {
    ...state,
    phaseEndsAt: null,
    pausedRemainingMs: Math.max(0, state.phaseEndsAt - now),
  };
}

export function resume(state: TimerState, now: number): TimerState {
  if (state.pausedRemainingMs === null) return state;
  return {
    ...state,
    phaseEndsAt: now + state.pausedRemainingMs,
    pausedRemainingMs: null,
  };
}

/** Advances to the next phase immediately, as if the current phase ended at `now`. */
export function skip(state: TimerState, config: TimerConfig, now: number): TimerState {
  if (state.phase === "idle" || state.phase === "done") return state;
  const { phase, cyclesCompleted } = nextPhase(state, config);
  if (phase === "done") {
    return { phase: "done", phaseEndsAt: null, pausedRemainingMs: null, cyclesCompleted };
  }
  return {
    phase,
    phaseEndsAt: now + phaseDurationMs(phase, config),
    pausedRemainingMs: null,
    cyclesCompleted,
  };
}

export function reset(): TimerState {
  return { ...initialState };
}

/**
 * Recomputes state after real wall-clock time has passed (reload, tab
 * resume, tick). Chains through any phases whose end time already lies in
 * the past — e.g. a tab backgrounded across a whole break — instead of just
 * clamping to zero, so the app never gets stuck showing a stale phase.
 */
export function tick(state: TimerState, config: TimerConfig, now: number): TimerState {
  if (state.phaseEndsAt === null) return state;
  let current = state;
  let guard = 0;
  while (current.phaseEndsAt !== null && current.phaseEndsAt <= now && guard < 10_000) {
    current = skip(current, config, current.phaseEndsAt);
    guard++;
  }
  return current;
}

export function remainingMs(state: TimerState, now: number): number {
  if (state.pausedRemainingMs !== null) return state.pausedRemainingMs;
  if (state.phaseEndsAt === null) return 0;
  return Math.max(0, state.phaseEndsAt - now);
}

export function totalPhaseDurationMs(state: TimerState, config: TimerConfig): number {
  return phaseDurationMs(state.phase, config);
}

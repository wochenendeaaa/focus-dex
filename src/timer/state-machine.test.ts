import { describe, expect, it } from "vitest";
import {
  initialState,
  pause,
  remainingMs,
  reset,
  resume,
  skip,
  start,
  tick,
  type TimerConfig,
} from "./state-machine";

const config: TimerConfig = { workMinutes: 25, breakMinutes: 5, cycles: 2 };
const T0 = 1_700_000_000_000;

describe("start", () => {
  it("begins a work phase ending after workMinutes", () => {
    const state = start(config, T0);
    expect(state.phase).toBe("work");
    expect(state.phaseEndsAt).toBe(T0 + 25 * 60_000);
    expect(state.cyclesCompleted).toBe(0);
  });
});

describe("tick", () => {
  it("is a no-op before the phase ends", () => {
    const state = start(config, T0);
    const ticked = tick(state, config, T0 + 60_000);
    expect(ticked).toEqual(state);
  });

  it("transitions work -> break exactly at the boundary", () => {
    const state = start(config, T0);
    const ticked = tick(state, config, T0 + 25 * 60_000);
    expect(ticked.phase).toBe("break");
    expect(ticked.phaseEndsAt).toBe(T0 + 25 * 60_000 + 5 * 60_000);
  });

  it("catches up through multiple phases if the tab was backgrounded a long time (reload scenario)", () => {
    // Simulates: session started, tab/app closed, reopened long after both
    // cycles would have finished.
    const state = start(config, T0);
    const farFuture = T0 + 10 * 60 * 60_000; // 10 hours later
    const ticked = tick(state, config, farFuture);
    expect(ticked.phase).toBe("done");
    expect(ticked.phaseEndsAt).toBeNull();
    expect(ticked.cyclesCompleted).toBe(config.cycles);
  });

  it("lands mid-break correctly after a reload during break", () => {
    let state = start(config, T0);
    state = tick(state, config, T0 + 25 * 60_000); // now in break
    const reloadedNow = T0 + 25 * 60_000 + 2 * 60_000; // 2 min into the 5 min break
    const ticked = tick(state, config, reloadedNow);
    expect(ticked.phase).toBe("break");
    expect(remainingMs(ticked, reloadedNow)).toBe(3 * 60_000);
  });
});

describe("pause / resume", () => {
  it("freezes remaining time and restores it on resume", () => {
    let state = start(config, T0);
    const pauseAt = T0 + 10 * 60_000;
    state = pause(state, pauseAt);
    expect(state.phaseEndsAt).toBeNull();
    expect(state.pausedRemainingMs).toBe(15 * 60_000);

    const resumeAt = pauseAt + 60 * 60_000; // an hour passes while paused
    state = resume(state, resumeAt);
    expect(state.phaseEndsAt).toBe(resumeAt + 15 * 60_000);
    expect(state.pausedRemainingMs).toBeNull();
  });

  it("is a no-op when idle", () => {
    expect(pause(initialState, T0)).toEqual(initialState);
  });
});

describe("skip", () => {
  it("moves from work directly to break, ignoring remaining time", () => {
    const state = start(config, T0);
    const skipped = skip(state, config, T0 + 60_000);
    expect(skipped.phase).toBe("break");
    expect(skipped.phaseEndsAt).toBe(T0 + 60_000 + 5 * 60_000);
  });

  it("reaches done after the configured number of cycles", () => {
    let state = start(config, T0);
    state = skip(state, config, T0); // work -> break (cycle 1)
    state = skip(state, config, T0); // break -> work (cycle 1 complete)
    state = skip(state, config, T0); // work -> break (cycle 2)
    state = skip(state, config, T0); // break -> done (cycle 2 complete)
    expect(state.phase).toBe("done");
    expect(state.cyclesCompleted).toBe(2);
  });
});

describe("reset", () => {
  it("returns to the initial idle state", () => {
    expect(reset()).toEqual(initialState);
  });
});

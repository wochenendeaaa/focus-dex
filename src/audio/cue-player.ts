/**
 * Synthesized 8-bit-style cues (Web Audio oscillators, no sound assets).
 * Only reliable while the tab is in the foreground — see README for why
 * that's an accepted limitation rather than a bug.
 */

export type CueKind = "work" | "break";

let audioCtx: AudioContext | null = null;

function getContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  return audioCtx;
}

function playTone(
  ctx: AudioContext,
  freq: number,
  startTime: number,
  duration: number,
  type: OscillatorType = "square",
): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, startTime);
  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(0.2, startTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start(startTime);
  osc.stop(startTime + duration + 0.02);
}

export function playCue(kind: CueKind): void {
  const ctx = getContext();
  if (ctx.state === "suspended") {
    void ctx.resume();
  }
  const now = ctx.currentTime;
  if (kind === "work") {
    playTone(ctx, 523.25, now, 0.09); // C5 — rising, alerting
    playTone(ctx, 783.99, now + 0.1, 0.14); // G5
  } else {
    playTone(ctx, 659.25, now, 0.09); // E5 — falling, calmer
    playTone(ctx, 440.0, now + 0.1, 0.18); // A4
  }
}

/**
 * Keeps the screen on while a session is actively running, so foreground
 * audio cues (see cue-player.ts) actually have a chance to fire on mobile
 * before the display auto-locks. Best-effort: unsupported or refused wake
 * locks degrade silently, they never surface as user-facing errors.
 */

let sentinel: WakeLockSentinel | null = null;
let requesting = false;

export function syncWakeLock(active: boolean): void {
  if (active) {
    if (sentinel || requesting) return;
    if (!("wakeLock" in navigator)) return;

    requesting = true;
    navigator.wakeLock
      .request("screen")
      .then((acquired) => {
        sentinel = acquired;
        sentinel.addEventListener("release", () => {
          sentinel = null;
        });
      })
      .catch((err: unknown) => {
        console.warn("Wake Lock request failed", err);
      })
      .finally(() => {
        requesting = false;
      });
    return;
  }

  if (sentinel) {
    const toRelease = sentinel;
    sentinel = null;
    void toRelease.release();
  }
}

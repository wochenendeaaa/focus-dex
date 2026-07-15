/**
 * Best-effort Fullscreen API to hide browser chrome while a session runs.
 * Only reliably succeeds when called synchronously within a user-gesture
 * call stack (e.g. the START click) — later calls from the tick loop will
 * just fail quietly if not already fullscreen, which is fine.
 *
 * Not supported for arbitrary page content on iOS Safari (WebKit restricts
 * the Fullscreen API to <video>) — there the real fix is "Add to Home
 * Screen", which launches without browser chrome via the manifest's
 * display: "standalone" regardless of this API. Degrades silently
 * everywhere this isn't supported or refused.
 */

export function syncFullscreen(active: boolean): void {
  if (active) {
    if (document.fullscreenElement) return;
    if (!document.documentElement.requestFullscreen) return;
    document.documentElement.requestFullscreen().catch((err: unknown) => {
      console.warn("Fullscreen request failed", err);
    });
    return;
  }

  if (document.fullscreenElement) {
    document.exitFullscreen().catch((err: unknown) => {
      console.warn("Fullscreen exit failed", err);
    });
  }
}

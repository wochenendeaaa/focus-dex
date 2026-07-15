function buildOverlay(): { overlay: HTMLDivElement; box: HTMLDivElement } {
  const overlay = document.createElement("div");
  overlay.style.position = "absolute";
  overlay.style.inset = "0";
  overlay.style.display = "flex";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";
  overlay.style.background = "rgba(0, 0, 0, 0.65)";
  overlay.style.zIndex = "10";

  const box = document.createElement("div");
  box.className = "window-frame";
  box.style.display = "flex";
  box.style.flexDirection = "column";
  box.style.gap = "6px";
  box.style.maxWidth = "200px";
  box.style.fontSize = "8px";
  box.style.textAlign = "center";
  overlay.appendChild(box);

  return { overlay, box };
}

export interface DeviceRetryDialogCallbacks {
  onRetry: () => void;
  onCancel: () => void;
}

/** Shown when session start finds no active Spotify Connect device. Returns a dismiss function. */
export function showDeviceRetryDialog(
  screen: HTMLElement,
  callbacks: DeviceRetryDialogCallbacks,
): () => void {
  const { overlay, box } = buildOverlay();

  const message = document.createElement("div");
  message.textContent = "Kein Spotify-Gerät gefunden. Öffne kurz Spotify auf deinem Handy.";
  box.appendChild(message);

  const btnRow = document.createElement("div");
  btnRow.className = "btn-row";
  btnRow.style.justifyContent = "center";

  const retryBtn = document.createElement("button");
  retryBtn.className = "btn";
  retryBtn.textContent = "ERNEUT VERSUCHEN";
  retryBtn.addEventListener("click", callbacks.onRetry);

  const cancelBtn = document.createElement("button");
  cancelBtn.className = "btn";
  cancelBtn.textContent = "ABBRECHEN";
  cancelBtn.addEventListener("click", callbacks.onCancel);

  btnRow.append(retryBtn, cancelBtn);
  box.appendChild(btnRow);
  screen.appendChild(overlay);

  return () => overlay.remove();
}

/** Generic dismissable message dialog — used for PREMIUM_REQUIRED / auth error paths. */
export function showMessageDialog(screen: HTMLElement, message: string): () => void {
  const { overlay, box } = buildOverlay();

  const text = document.createElement("div");
  text.textContent = message;
  box.appendChild(text);

  const dismissBtn = document.createElement("button");
  dismissBtn.className = "btn";
  dismissBtn.textContent = "OK";
  dismissBtn.style.alignSelf = "center";
  dismissBtn.addEventListener("click", () => overlay.remove());
  box.appendChild(dismissBtn);

  screen.appendChild(overlay);
  return () => overlay.remove();
}

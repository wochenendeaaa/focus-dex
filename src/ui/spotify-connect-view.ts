import { isAuthError } from "../spotify/api";
import { disconnect, isConnected, isSpotifyConfigured, redirectToAuthorize } from "../spotify/auth";
import { getOwnPlaylists, type SpotifyPlaylist } from "../spotify/playlists";

const SELECTED_PLAYLIST_KEY = "focusdex.spotify.selected_playlist";

export function getSelectedPlaylistUri(): string | null {
  return localStorage.getItem(SELECTED_PLAYLIST_KEY);
}

function setSelectedPlaylistUri(uri: string | null): void {
  if (uri) localStorage.setItem(SELECTED_PLAYLIST_KEY, uri);
  else localStorage.removeItem(SELECTED_PLAYLIST_KEY);
}

export function createSpotifyConnectView(): HTMLElement {
  const container = document.createElement("div");
  container.style.display = "flex";
  container.style.flexDirection = "column";
  container.style.gap = "4px";
  container.style.marginTop = "8px";
  container.style.paddingTop = "6px";
  container.style.borderTop = "1px solid var(--frame-border)";
  container.style.fontSize = "8px";

  if (!isSpotifyConfigured()) {
    const notice = document.createElement("div");
    notice.style.color = "var(--text-muted)";
    notice.textContent = "Spotify nicht konfiguriert (siehe SPOTIFY_SETUP.md)";
    container.appendChild(notice);
    return container;
  }

  if (!isConnected()) {
    const connectBtn = document.createElement("button");
    connectBtn.className = "btn";
    connectBtn.textContent = "MIT SPOTIFY VERBINDEN";
    connectBtn.addEventListener("click", () => {
      void redirectToAuthorize();
    });
    container.appendChild(connectBtn);
    return container;
  }

  const status = document.createElement("div");
  status.style.color = "var(--text-muted)";
  status.textContent = "Lade Playlists…";
  container.appendChild(status);

  const disconnectBtn = document.createElement("button");
  disconnectBtn.className = "btn";
  disconnectBtn.textContent = "TRENNEN";
  disconnectBtn.style.marginTop = "4px";
  disconnectBtn.addEventListener("click", () => {
    disconnect();
    setSelectedPlaylistUri(null);
    container.replaceWith(createSpotifyConnectView());
  });

  getOwnPlaylists()
    .then((playlists) => {
      status.remove();
      renderPlaylistPicker(container, playlists, disconnectBtn);
    })
    .catch((err: unknown) => {
      if (isAuthError(err)) {
        disconnect();
        container.replaceWith(createSpotifyConnectView());
        return;
      }
      status.textContent = "Playlists konnten nicht geladen werden.";
      container.appendChild(disconnectBtn);
    });

  return container;
}

function renderPlaylistPicker(
  container: HTMLElement,
  playlists: SpotifyPlaylist[],
  disconnectBtn: HTMLButtonElement,
): void {
  if (playlists.length === 0) {
    const empty = document.createElement("div");
    empty.textContent = "Keine eigenen Playlists gefunden.";
    container.append(empty, disconnectBtn);
    return;
  }

  const select = document.createElement("select");
  select.style.fontFamily = "var(--font-pixel)";
  select.style.fontSize = "8px";
  select.style.background = "var(--bg-base)";
  select.style.color = "var(--text-primary)";
  select.style.border = "1px solid var(--frame-border)";

  const currentSelection = getSelectedPlaylistUri();
  for (const playlist of playlists) {
    const option = document.createElement("option");
    option.value = playlist.uri;
    option.textContent = playlist.name;
    if (playlist.uri === currentSelection) option.selected = true;
    select.appendChild(option);
  }
  if (!currentSelection) {
    setSelectedPlaylistUri(playlists[0].uri);
  }
  select.addEventListener("change", () => setSelectedPlaylistUri(select.value));

  container.append(select, disconnectBtn);
}

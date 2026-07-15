import { spotifyFetch } from "./api";

export interface SpotifyPlaylist {
  id: string;
  name: string;
  uri: string;
}

interface PlaylistsResponse {
  items: Array<{ id: string; name: string; uri: string }>;
}

/** Own playlists only — the 2026 API no longer returns track contents for others'. */
export async function getOwnPlaylists(): Promise<SpotifyPlaylist[]> {
  const data = await spotifyFetch<PlaylistsResponse>("/me/playlists?limit=50");
  return data.items.map((item) => ({ id: item.id, name: item.name, uri: item.uri }));
}

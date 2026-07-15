import { spotifyFetch } from "./api";

export interface SpotifyDevice {
  id: string;
  name: string;
  isActive: boolean;
}

interface DevicesResponse {
  devices: Array<{ id: string | null; name: string; is_active: boolean }>;
}

export async function getDevices(): Promise<SpotifyDevice[]> {
  const data = await spotifyFetch<DevicesResponse>("/me/player/devices");
  return data.devices
    .filter((d): d is DevicesResponse["devices"][number] & { id: string } => d.id !== null)
    .map((d) => ({ id: d.id, name: d.name, isActive: d.is_active }));
}

export async function playContext(deviceId: string, contextUri: string): Promise<void> {
  await spotifyFetch(`/me/player/play?device_id=${encodeURIComponent(deviceId)}`, {
    method: "PUT",
    body: JSON.stringify({ context_uri: contextUri }),
  });
}

export async function pausePlayback(deviceId?: string): Promise<void> {
  const query = deviceId ? `?device_id=${encodeURIComponent(deviceId)}` : "";
  await spotifyFetch(`/me/player/pause${query}`, { method: "PUT" });
}

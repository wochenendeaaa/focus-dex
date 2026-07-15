import { ensureValidToken } from "./auth";

export class SpotifyApiError extends Error {
  readonly status: number;
  readonly code: string | null;

  constructor(status: number, code: string | null) {
    super(`Spotify API error ${status}${code ? ` (${code})` : ""}`);
    this.name = "SpotifyApiError";
    this.status = status;
    this.code = code;
  }
}

export function isPremiumRequiredError(err: unknown): boolean {
  return err instanceof SpotifyApiError && err.status === 403 && err.code === "PREMIUM_REQUIRED";
}

export function isAuthError(err: unknown): boolean {
  return err instanceof SpotifyApiError && (err.status === 401 || err.code === "NO_TOKEN");
}

export async function spotifyFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await ensureValidToken();
  if (!token) throw new SpotifyApiError(401, "NO_TOKEN");

  const res = await fetch(`https://api.spotify.com/v1${path}`, {
    ...init,
    headers: {
      ...init.headers,
      Authorization: `Bearer ${token}`,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
    },
  });

  if (res.status === 204) {
    return undefined as T;
  }

  if (!res.ok) {
    let code: string | null = null;
    try {
      const body = (await res.json()) as { error?: { reason?: string } };
      code = body.error?.reason ?? null;
    } catch {
      // error body wasn't JSON — leave code null
    }
    throw new SpotifyApiError(res.status, code);
  }

  return (await res.json()) as T;
}

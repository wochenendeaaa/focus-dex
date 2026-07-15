import { generateChallenge, generateVerifier } from "./pkce";
import { clearTokens, loadTokens, saveTokens, type SpotifyTokens } from "./token-storage";

const CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
const REDIRECT_URI = `${window.location.origin}/`;
const SCOPES = "user-modify-playback-state user-read-playback-state playlist-read-private";

const VERIFIER_KEY = "focusdex.spotify.pkce_verifier";
const STATE_KEY = "focusdex.spotify.oauth_state";
const EXPIRY_SAFETY_MARGIN_MS = 60_000;

function randomState(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function isSpotifyConfigured(): boolean {
  return Boolean(CLIENT_ID);
}

export async function redirectToAuthorize(): Promise<void> {
  if (!CLIENT_ID) {
    throw new Error("VITE_SPOTIFY_CLIENT_ID ist nicht gesetzt (.env prüfen, siehe SPOTIFY_SETUP.md)");
  }
  const verifier = generateVerifier();
  const challenge = await generateChallenge(verifier);
  const state = randomState();
  sessionStorage.setItem(VERIFIER_KEY, verifier);
  sessionStorage.setItem(STATE_KEY, state);

  const url = new URL("https://accounts.spotify.com/authorize");
  url.searchParams.set("client_id", CLIENT_ID);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", REDIRECT_URI);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("state", state);
  url.searchParams.set("scope", SCOPES);

  window.location.assign(url.toString());
}

export interface CallbackResult {
  handled: boolean;
  error?: string;
}

/** Detects and processes a Spotify OAuth redirect (?code=&state=) on the current URL. */
export async function handleRedirectCallback(): Promise<CallbackResult> {
  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");
  const state = params.get("state");
  const error = params.get("error");

  if (!code && !error) return { handled: false };

  // Strip the OAuth params so a reload never replays the (single-use) code.
  window.history.replaceState({}, "", window.location.origin + window.location.pathname);

  if (error) {
    return { handled: true, error: `Spotify-Login abgebrochen: ${error}` };
  }

  const expectedState = sessionStorage.getItem(STATE_KEY);
  const verifier = sessionStorage.getItem(VERIFIER_KEY);
  sessionStorage.removeItem(STATE_KEY);
  sessionStorage.removeItem(VERIFIER_KEY);

  if (!state || state !== expectedState || !verifier) {
    return { handled: true, error: "Ungültiger OAuth-State — bitte erneut verbinden." };
  }

  try {
    await exchangeCodeForToken(code!, verifier);
    return { handled: true };
  } catch {
    return { handled: true, error: "Token-Austausch fehlgeschlagen." };
  }
}

async function exchangeCodeForToken(code: string, verifier: string): Promise<void> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: REDIRECT_URI,
    client_id: CLIENT_ID,
    code_verifier: verifier,
  });
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) throw new Error(`Token exchange failed: ${res.status}`);
  const json = (await res.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };
  saveTokens({
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    expiresAt: Date.now() + json.expires_in * 1000,
  });
}

async function refreshAccessToken(refreshToken: string): Promise<SpotifyTokens> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: CLIENT_ID,
  });
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) throw new Error(`Token refresh failed: ${res.status}`);
  const json = (await res.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  };
  const tokens: SpotifyTokens = {
    accessToken: json.access_token,
    refreshToken: json.refresh_token ?? refreshToken,
    expiresAt: Date.now() + json.expires_in * 1000,
  };
  saveTokens(tokens);
  return tokens;
}

/** Returns a valid access token, refreshing first if it's expired or about to expire. */
export async function ensureValidToken(): Promise<string | null> {
  const tokens = loadTokens();
  if (!tokens) return null;
  if (tokens.expiresAt - EXPIRY_SAFETY_MARGIN_MS > Date.now()) {
    return tokens.accessToken;
  }
  try {
    const refreshed = await refreshAccessToken(tokens.refreshToken);
    return refreshed.accessToken;
  } catch {
    clearTokens();
    return null;
  }
}

export function isConnected(): boolean {
  return loadTokens() !== null;
}

export function disconnect(): void {
  clearTokens();
}

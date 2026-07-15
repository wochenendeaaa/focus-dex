# Spotify-App einrichten

FocusDex braucht eine eigene Spotify-App (Client ID), um sich per PKCE bei deinem
Account anzumelden. Das musst du selbst im Spotify Developer Dashboard anlegen — kein
Client-Secret nötig, die Client ID allein reicht für den PKCE-Flow.

## Schritte

1. Öffne https://developer.spotify.com/dashboard und logge dich mit deinem (Premium-)
   Spotify-Account ein.
2. **Create app** klicken.
   - **App name:** z. B. "FocusDex" (frei wählbar, nur du siehst das im Consent-Screen)
   - **App description:** z. B. "Persönlicher Pomodoro-Timer"
   - **Redirect URI:** genau `http://127.0.0.1:5173/` eintragen (mit Schrägstrich am
     Ende!) und auf **Add** klicken, bevor du speicherst. Diese URI muss exakt mit der
     übereinstimmen, die die App beim Login verwendet — nicht `localhost`, sondern
     `127.0.0.1`.
   - **Which API/SDKs are you planning to use?** Web API auswählen.
   - Nutzungsbedingungen akzeptieren, **Save**.
3. Auf der App-Seite: **Settings** öffnen, die **Client ID** kopieren (kein Client Secret
   nötig — das bleibt leer/unbenutzt).
4. Im Projektordner `FocusDex/`: Datei `.env.example` nach `.env` kopieren und die
   Client ID eintragen:

   ```
   VITE_SPOTIFY_CLIENT_ID=deine_client_id_hier
   ```

5. Dev-Server neu starten (`npm run dev`), falls er bereits lief — Vite liest `.env` nur
   beim Start ein.

## Wichtig: Dev-Mode-Limits (Stand 2026)

- Deine Spotify-App läuft im **Development Mode**: maximal 5 autorisierte Nutzer, du als
  App-Owner brauchst ein aktives Premium-Abo (sonst wird die App deaktiviert).
- Für dieses persönliche Projekt (nur du) ist das ausreichend — mehr dazu im
  Architektur-Dokument.

## Warum `127.0.0.1` statt `localhost`?

Spotify verlangt eine exakte String-Übereinstimmung der Redirect-URI. Wir verwenden
durchgängig `127.0.0.1`, damit Browser-Adresse, Vite-Dev-Server und die im Dashboard
eingetragene URI garantiert übereinstimmen.

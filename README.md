# FocusDex

Retro-Pomodoro-Timer im GBA-Look mit Spotify-Steuerung. Aktueller Stand: Phase 0+1
(Projektgerüst, Retro-Design-System, Timer-Kern) und Phase 3+4 (Spotify-Auth &
Playback-Steuerung) — siehe Architektur-Dokument für die vollständige Roadmap.

## Setup

```
npm install
npm run dev      # Dev-Server, http://127.0.0.1:5173
npm run test     # Unit-Tests der Timer-State-Machine
npm run build    # Produktions-Build
```

Für die Spotify-Anbindung: siehe [SPOTIFY_SETUP.md](SPOTIFY_SETUP.md) — du musst
einmalig eine eigene Spotify-Developer-App anlegen und die Client ID in eine `.env`
eintragen, bevor "Mit Spotify verbinden" funktioniert. Ohne das läuft der Timer normal,
nur ohne Musiksteuerung.

## Bekannte Einschränkung: Audio-Cue bei gesperrtem Bildschirm (iOS)

Bewusste Architekturentscheidung: FocusDex ist eine reine Webapp, kein
Capacitor-Wrapper. Das bedeutet, der Signalton beim Phasenwechsel
(Arbeit → Pause) ist **nur zuverlässig, wenn der Tab im Vordergrund ist**.
Bei gesperrtem Bildschirm (v. a. iOS Safari) kann JavaScript nicht
zuverlässig zu einem exakten Zeitpunkt einen Ton abspielen — das ist eine
bekannte WebKit-Einschränkung (Bug 198277), keine Fehlfunktion dieser App.

Die Spotify-Wiedergabe ist davon **nicht** betroffen: sie läuft über Spotify
Connect in der nativen Spotify-App auf dem Handy und damit unabhängig vom
Zustand dieses Browser-Tabs.

Der Timer selbst driftet nicht: Endzeitpunkte werden als Timestamps
gespeichert, beim nächsten Öffnen/Fokussieren wird die korrekte Phase neu
berechnet — nur der akustische Hinweis kann verpasst werden.

## Architektur

- Vite + TypeScript, kein UI-Framework.
- `src/timer/` — reine State-Machine (`state-machine.ts`) + localStorage-
  Persistenz (`persistence.ts`), unabhängig vom DOM getestet.
- `src/ui/` — Retro-Views (Settings, Timer, Fensterrahmen).
- `src/audio/` — synthetisierte 8-Bit-Cues via Web Audio (keine Sound-Dateien).
- `src/styles/` — Design-Tokens (Sweetie-16-Palette, CC0), festes 240×160-
  Logik-Grid mit Integer-Upscaling.
- `src/spotify/` — PKCE-Auth (clientseitig, kein Backend), Token-Refresh,
  Playlist- und Player-Endpunkte. Nur Endpunkte, die im 2026er Dev-Mode
  tatsächlich verfügbar sind (siehe Architektur-Dokument).

Kein Prompt-Modus (Claude-API-Kuration) in diesem Stand.

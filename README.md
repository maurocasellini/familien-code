# Familien-Code v2 · herzbewegung von Susana

Numerologie & Astrologie Tool — Next.js App für Vercel Deployment.

Basiert auf dem Original-Repo `familien-code` (https://github.com/maurocasellini/familien-code).
**Neu in v2:** Optionale Ahnenlinie-Sektion (Mutter + Vater).

## Lokale Entwicklung

```bash
npm install
npm run dev
```

Dann `.env.local` anlegen:

```
ANTHROPIC_API_KEY=sk-ant-...
```

App läuft auf http://localhost:3000

## Deployment via GitHub + Vercel

1. Dieses Repo auf GitHub pushen
2. Auf vercel.com → New Project → GitHub Repo importieren
3. Environment Variable setzen:
   - Key: `ANTHROPIC_API_KEY`
   - Value: dein Anthropic API Key (`sk-ant-...`)
4. Deploy klicken — fertig.

## Löwenherz – Kinder-App (Selbstvertrauen & Sprechen)

Statische Offline-App unter `public/loewenherz/` (kein Build, kein Server-Code).
Nach dem Deploy erreichbar unter `/loewenherz` (ohne Passwort-Schutz).

- **Mut-Welt:** Mut-Missionen, Löwen-Brüller, Gefühle-Wetter, Erzähl-Würfel, Kraft tanken, Stolz-Glas
- **Sprech-Dschungel:** Laut-Training K/T/S/SCH in 6 Stufen, Ohren-Detektiv (Tasse/Tasche), Zungen-Turnen
- **Eltern-Ecke** (Rechenaufgabe als Sperre): Name, Fortschritt, Tipps

Aufs Handy: iPhone → Safari → Teilen → «Zum Home-Bildschirm». Android → Chrome → «App installieren».
Einmal online öffnen, danach läuft alles offline. Daten bleiben nur auf dem Gerät.
Bei Änderungen an der App `VERSION` in `public/loewenherz/sw.js` hochzählen.

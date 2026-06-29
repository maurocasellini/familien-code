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

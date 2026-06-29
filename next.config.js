/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,

  experimental: {
    // swisseph-wasm NICHT in den Webpack-Bundle packen, sondern zur Laufzeit
    // aus node_modules laden. Nur so finden die internen Pfad-Aufrufe der
    // Bibliothek (import.meta.url) ihre WASM-Datei.
    serverComponentsExternalPackages: ['swisseph-wasm'],

    // Die WASM- und Datendatei mit ins Vercel-Deployment der drei
    // Ephemeriden-Endpunkte packen (sie werden ueber einen berechneten Pfad
    // geladen, daher findet Vercels Auto-Erkennung sie sonst nicht).
    outputFileTracingIncludes: {
      '/api/humandesign': ['./node_modules/swisseph-wasm/wasm/**'],
      '/api/connection': ['./node_modules/swisseph-wasm/wasm/**'],
      '/api/astrology': ['./node_modules/swisseph-wasm/wasm/**'],
    },
  },
}

module.exports = nextConfig

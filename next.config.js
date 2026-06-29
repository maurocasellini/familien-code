/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,

  experimental: {
    // App-Router-Pfad (schadet nicht, hilft falls je genutzt).
    serverComponentsExternalPackages: ['swisseph-wasm'],

    // Das ganze swisseph-wasm-Paket (inkl. wasm/ und src/) mit ins Deployment
    // der drei Ephemeriden-Endpunkte packen, da es zur Laufzeit aus node_modules
    // geladen wird.
    outputFileTracingIncludes: {
      '/api/humandesign': ['./node_modules/swisseph-wasm/**'],
      '/api/connection': ['./node_modules/swisseph-wasm/**'],
      '/api/astrology': ['./node_modules/swisseph-wasm/**'],
    },
  },

  // Entscheidend: swisseph-wasm NICHT von Webpack buendeln/minifizieren lassen,
  // sondern zur Laufzeit als echtes ES-Modul aus node_modules laden. Nur so
  // funktionieren der interne WASM-Lader und die import.meta.url-Pfadaufloesung.
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push({ 'swisseph-wasm': 'module swisseph-wasm' });
    }
    return config;
  },
}

module.exports = nextConfig

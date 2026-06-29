// middleware.js — Basic Auth Schutz fuer Vercel-Deployment
// Lokal (NODE_ENV=development) ist Auth deaktiviert.
// In Production: nur durchlassen mit korrekten Credentials aus Env.

export const config = {
  // Schuetzt alles AUSSER Next-internal Pfade
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

export function middleware(request) {
  // Auth nur in Production aktiv (Vercel setzt NODE_ENV=production)
  if (process.env.NODE_ENV !== 'production') return;

  // Wenn keine Credentials konfiguriert sind, lass durch (Backwards-compat)
  const user = process.env.BASIC_AUTH_USER;
  const pass = process.env.BASIC_AUTH_PASS;
  if (!user || !pass) return;

  const authHeader = request.headers.get('authorization');
  if (authHeader) {
    const [scheme, encoded] = authHeader.split(' ');
    if (scheme === 'Basic' && encoded) {
      try {
        const decoded = atob(encoded);
        const sep = decoded.indexOf(':');
        const u = decoded.slice(0, sep);
        const p = decoded.slice(sep + 1);
        if (u === user && p === pass) return; // Auth OK, durchlassen
      } catch (e) { /* fall through to 401 */ }
    }
  }

  // 401 mit WWW-Authenticate Header → Browser zeigt Passwort-Dialog
  return new Response('Authentication required', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Familien-Code v2"',
      'Content-Type': 'text/plain',
    },
  });
}

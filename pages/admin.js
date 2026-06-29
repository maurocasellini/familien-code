import Head from 'next/head'
import { useState, useEffect } from 'react'

const CONSTELLATION_LABELS = {
  solo: 'Nur ich',
  pair: 'Paar',
  family: 'Familie',
  solo_children: 'Ich & Kinder',
};

const FOCUS_LABELS = {
  overview: 'Gesamtbild',
  relationship: 'Beziehung',
  personal: 'Lebensweg',
  children_focus: 'Kinder',
  future: 'Zukunft',
};

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' })
    + ' ' + d.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' });
}

export default function Admin() {
  const [password, setPassword] = useState('');
  const [authed, setAuthed] = useState(false);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  async function login(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin', {
        headers: { 'x-admin-password': password },
      });
      if (!res.ok) { setError('Falsches Passwort.'); setLoading(false); return; }
      const data = await res.json();
      setLeads(data.leads || []);
      setAuthed(true);
    } catch {
      setError('Verbindungsfehler.');
    }
    setLoading(false);
  }

  async function refresh() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin', {
        headers: { 'x-admin-password': password },
      });
      const data = await res.json();
      setLeads(data.leads || []);
    } catch {}
    setLoading(false);
  }

  function exportCSV() {
    const headers = ['Datum', 'Name', 'Email', 'Konstellation', 'Fokus'];
    const rows = filtered.map(l => [
      formatDate(l.timestamp),
      l.name,
      l.email,
      CONSTELLATION_LABELS[l.constellation] || l.constellation,
      FOCUS_LABELS[l.focus] || l.focus,
    ]);
    const csv = [headers, ...rows]
      .map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `familien-code-leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const filtered = leads.filter(l =>
    !search || l.name?.toLowerCase().includes(search.toLowerCase()) ||
    l.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <Head>
        <title>Admin · Familien-Code</title>
        <meta name="robots" content="noindex" />
        <link href="https://fonts.googleapis.com/css2?family=Lato:wght@300;400;700&display=swap" rel="stylesheet" />
        <style>{`
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
          html { font-size: 15px; }
          body { font-family: 'Lato', sans-serif; font-weight: 300; background: #f5f4f2; color: #1c1714; min-height: 100vh; }

          :root {
            --gold: #9a7020;
            --gold-light: #c4962a;
            --gold-pale: #f0e4c0;
            --ink: #1c1714;
            --muted: #6a5a50;
            --paper: #fff;
            --border: #e8e2da;
            --rose: #8b4060;
          }

          /* LOGIN */
          .login-wrap { min-height: 100vh; display: flex; align-items: center; justify-content: center; }
          .login-card { background: white; border: 1px solid var(--border); border-radius: 16px; padding: 48px; width: 100%; max-width: 400px; }
          .login-logo { font-size: 11px; letter-spacing: 2.5px; text-transform: uppercase; color: var(--gold); margin-bottom: 8px; }
          .login-title { font-size: 24px; font-weight: 400; color: var(--ink); margin-bottom: 32px; }
          .login-label { display: block; font-size: 10px; letter-spacing: 2px; text-transform: uppercase; color: var(--muted); margin-bottom: 10px; }
          .login-input { width: 100%; border: 1px solid var(--border); border-radius: 8px; padding: 12px 16px; font-family: 'Lato', sans-serif; font-size: 15px; color: var(--ink); background: #faf9f7; outline: none; transition: border-color 0.2s; }
          .login-input:focus { border-color: var(--gold); }
          .login-btn { width: 100%; margin-top: 20px; background: var(--ink); color: white; border: none; border-radius: 8px; padding: 14px; font-family: 'Lato', sans-serif; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; cursor: pointer; transition: background 0.2s; }
          .login-btn:hover { background: var(--gold); }
          .login-btn:disabled { opacity: 0.5; cursor: default; }
          .login-error { margin-top: 14px; color: var(--rose); font-size: 13px; }

          /* DASHBOARD */
          .dash-header { background: white; border-bottom: 1px solid var(--border); padding: 0 32px; height: 60px; display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; z-index: 10; }
          .dash-brand { display: flex; align-items: center; gap: 10px; }
          .dash-brand-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--gold); }
          .dash-brand-name { font-size: 13px; letter-spacing: 1px; color: var(--ink); }
          .dash-brand-sub { font-size: 11px; color: var(--muted); }
          .dash-actions { display: flex; align-items: center; gap: 12px; }
          .btn-sm { padding: 8px 18px; border-radius: 6px; border: none; font-family: 'Lato', sans-serif; font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase; cursor: pointer; transition: all 0.2s; }
          .btn-outline { background: transparent; border: 1px solid var(--border); color: var(--muted); }
          .btn-outline:hover { border-color: var(--gold); color: var(--gold); }
          .btn-primary { background: var(--ink); color: white; }
          .btn-primary:hover { background: var(--gold); }
          .btn-csv { background: var(--gold-pale); color: var(--gold); border: 1px solid var(--gold-pale); }
          .btn-csv:hover { background: var(--gold); color: white; }

          .dash-body { padding: 32px; max-width: 1100px; margin: 0 auto; }

          .dash-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 28px; }
          .stat-card { background: white; border: 1px solid var(--border); border-radius: 12px; padding: 20px 24px; }
          .stat-val { font-size: 36px; font-weight: 700; color: var(--ink); line-height: 1; }
          .stat-label { font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase; color: var(--muted); margin-top: 6px; }

          .dash-toolbar { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
          .search-input { flex: 1; border: 1px solid var(--border); border-radius: 8px; padding: 10px 16px; font-family: 'Lato', sans-serif; font-size: 14px; color: var(--ink); background: white; outline: none; max-width: 320px; }
          .search-input:focus { border-color: var(--gold); }

          .table-wrap { background: white; border: 1px solid var(--border); border-radius: 12px; overflow: hidden; }
          table { width: 100%; border-collapse: collapse; }
          thead th { background: #f9f7f4; font-size: 10px; letter-spacing: 2px; text-transform: uppercase; color: var(--muted); padding: 14px 20px; text-align: left; font-weight: 400; border-bottom: 1px solid var(--border); }
          tbody tr { border-bottom: 1px solid var(--border); transition: background 0.15s; }
          tbody tr:last-child { border-bottom: none; }
          tbody tr:hover { background: #fdf9f4; }
          tbody td { padding: 14px 20px; font-size: 14px; color: var(--ink); }
          .td-date { color: var(--muted); font-size: 12px; white-space: nowrap; }
          .td-email { color: var(--gold); }
          .badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 11px; background: var(--gold-pale); color: var(--gold); }
          .empty-state { text-align: center; padding: 60px; color: var(--muted); font-size: 14px; }

          @media (max-width: 600px) {
            .dash-stats { grid-template-columns: 1fr; }
            .dash-body { padding: 16px; }
            .dash-header { padding: 0 16px; }
          }
        `}</style>
      </Head>

      {!authed ? (
        <div className="login-wrap">
          <div className="login-card">
            <div className="login-logo">Familien-Code · herzbewegung</div>
            <div className="login-title">Admin</div>
            <form onSubmit={login}>
              <label className="login-label">Passwort</label>
              <input
                className="login-input"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                autoFocus
              />
              <button className="login-btn" type="submit" disabled={loading || !password}>
                {loading ? 'Prüfen…' : 'Einloggen'}
              </button>
              {error && <div className="login-error">{error}</div>}
            </form>
          </div>
        </div>
      ) : (
        <>
          <div className="dash-header">
            <div className="dash-brand">
              <div className="dash-brand-dot" />
              <div>
                <div className="dash-brand-name">Familien-Code</div>
                <div className="dash-brand-sub">herzbewegung · Admin</div>
              </div>
            </div>
            <div className="dash-actions">
              <button className="btn-sm btn-csv" onClick={exportCSV}>↓ CSV Export</button>
              <button className="btn-sm btn-outline" onClick={refresh} disabled={loading}>
                {loading ? '…' : '↺ Aktualisieren'}
              </button>
              <button className="btn-sm btn-outline" onClick={() => { setAuthed(false); setLeads([]); setPassword(''); }}>
                Logout
              </button>
            </div>
          </div>

          <div className="dash-body">
            <div className="dash-stats">
              <div className="stat-card">
                <div className="stat-val">{leads.length}</div>
                <div className="stat-label">Leads total</div>
              </div>
              <div className="stat-card">
                <div className="stat-val">
                  {leads.filter(l => {
                    const d = new Date(l.timestamp);
                    const now = new Date();
                    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
                  }).length}
                </div>
                <div className="stat-label">Diesen Monat</div>
              </div>
              <div className="stat-card">
                <div className="stat-val">
                  {leads.filter(l => {
                    const d = new Date(l.timestamp);
                    const now = new Date();
                    return now - d < 7 * 24 * 60 * 60 * 1000;
                  }).length}
                </div>
                <div className="stat-label">Letzte 7 Tage</div>
              </div>
            </div>

            <div className="dash-toolbar">
              <input
                className="search-input"
                placeholder="Suche nach Name oder Email…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              <span style={{ fontSize: 12, color: '#9a8a80' }}>{filtered.length} Einträge</span>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Datum</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Konstellation</th>
                    <th>Fokus</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={5}>
                        <div className="empty-state">Noch keine Leads vorhanden.</div>
                      </td>
                    </tr>
                  ) : (
                    filtered.map((l, i) => (
                      <tr key={l.id || i}>
                        <td className="td-date">{formatDate(l.timestamp)}</td>
                        <td>{l.name || '—'}</td>
                        <td className="td-email">{l.email || '—'}</td>
                        <td><span className="badge">{CONSTELLATION_LABELS[l.constellation] || l.constellation || '—'}</span></td>
                        <td>{FOCUS_LABELS[l.focus] || l.focus || '—'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </>
  );
}

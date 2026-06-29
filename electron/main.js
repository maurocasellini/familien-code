// electron/main.js
// Robust Electron main: startet Next.js als EMBEDDED Library (kein child_process).
// Logs alles in eine Datei damit Susana bei Problemen rausschicken kann.

const { app, BrowserWindow, Menu, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');

const isDev = !app.isPackaged;
const PORT = isDev ? 3000 : 3456;

let mainWindow = null;
let nextServer = null;

// ── LOGGING ──────────────────────────────────────────────────────
// Logs landen im User-Data-Verzeichnis (auf Windows: %APPDATA%\FamilienCode\app.log)
const logFile = path.join(app.getPath('userData'), 'app.log');
function log(...args) {
  const line = `[${new Date().toISOString()}] ${args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')}\n`;
  try { fs.appendFileSync(logFile, line); } catch (_) {}
  console.log(line.trim());
}
process.on('uncaughtException', (err) => {
  log('UNCAUGHT EXCEPTION:', err.stack || err.message);
});
process.on('unhandledRejection', (err) => {
  log('UNHANDLED REJECTION:', err?.stack || err);
});

log('=== FamilienCode startet ===');
log('isDev:', isDev, 'isPackaged:', app.isPackaged);
log('Platform:', process.platform, 'Arch:', process.arch);
log('Node:', process.versions.node, 'Electron:', process.versions.electron);
log('userData:', app.getPath('userData'));
log('__dirname:', __dirname);
log('process.resourcesPath:', process.resourcesPath);

// ── .env.local SUCHEN UND LADEN ──────────────────────────────────
function loadEnvLocal() {
  const candidates = [
    path.join(app.getPath('userData'), '.env.local'),
    path.join(path.dirname(app.getPath('exe')), '.env.local'),
    path.join(process.resourcesPath || '', '.env.local'),
    path.join(__dirname, '..', '.env.local'),
  ];
  log('Suche .env.local in:', candidates);
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) {
        const content = fs.readFileSync(p, 'utf8');
        content.split('\n').forEach(line => {
          const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
          if (m) {
            process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
          }
        });
        log('✓ .env.local geladen von:', p);
        log('  ANTHROPIC_API_KEY gesetzt:', !!process.env.ANTHROPIC_API_KEY, 'prefix:', process.env.ANTHROPIC_API_KEY?.slice(0, 12));
        return true;
      }
    } catch (e) { log('Fehler beim Lesen:', p, e.message); }
  }
  log('⚠ Keine .env.local gefunden!');
  return false;
}

// ── NEXT.JS EMBEDDED STARTEN ─────────────────────────────────────
async function startNextServer() {
  if (isDev) return; // Im Dev-Modus läuft `next dev` extern

  log('Starte Next.js embedded...');

  // Resources-Pfad: bei electron-builder mit asar:false → resources/app/
  // bei asar:true → resources/app.asar/
  const appPath = process.resourcesPath
    ? path.join(process.resourcesPath, 'app')
    : path.join(__dirname, '..');

  log('Next.js appPath:', appPath);
  log('  .next exists:', fs.existsSync(path.join(appPath, '.next')));
  log('  package.json exists:', fs.existsSync(path.join(appPath, 'package.json')));

  // Lade Next.js direkt aus node_modules
  let next;
  try {
    const nextPath = path.join(appPath, 'node_modules', 'next');
    log('Lade next von:', nextPath);
    next = require(nextPath);
  } catch (e) {
    log('FEHLER beim Laden von next:', e.message);
    throw new Error(`Next.js konnte nicht geladen werden: ${e.message}`);
  }

  process.env.NODE_ENV = 'production';

  const nextApp = next({
    dev: false,
    dir: appPath,
    customServer: false,
  });

  await nextApp.prepare();
  log('Next.js prepared.');

  const handle = nextApp.getRequestHandler();

  return new Promise((resolve, reject) => {
    nextServer = http.createServer((req, res) => {
      handle(req, res).catch(err => {
        log('Request-Handler Fehler:', err.message);
        res.statusCode = 500;
        res.end('Server error');
      });
    });
    nextServer.listen(PORT, '127.0.0.1', () => {
      log(`Next.js Server läuft auf http://127.0.0.1:${PORT}`);
      resolve();
    });
    nextServer.on('error', (err) => {
      log('HTTP-Server Fehler:', err.message);
      reject(err);
    });
  });
}

// ── BROWSER WINDOW ───────────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 960,
    minHeight: 600,
    title: 'Familien-Code',
    backgroundColor: '#F4E4D9',
    icon: path.join(__dirname, '..', 'icon.png'),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false,
  });

  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.loadURL(`http://127.0.0.1:${PORT}`);

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  const template = [
    { label: 'Familien-Code', submenu: [
      { role: 'about' }, { type: 'separator' },
      { label: 'Log-Datei öffnen', click: () => shell.openPath(logFile) },
      { label: 'Konfig-Ordner öffnen', click: () => shell.openPath(app.getPath('userData')) },
      { type: 'separator' },
      { role: 'hide' }, { role: 'hideOthers' }, { role: 'unhide' },
      { type: 'separator' },
      { role: 'quit', label: 'Beenden' },
    ]},
    { label: 'Bearbeiten', submenu: [
      { role: 'undo', label: 'Rückgängig' }, { role: 'redo', label: 'Wiederherstellen' },
      { type: 'separator' },
      { role: 'cut', label: 'Ausschneiden' }, { role: 'copy', label: 'Kopieren' }, { role: 'paste', label: 'Einfügen' },
      { role: 'selectAll', label: 'Alles auswählen' },
    ]},
    { label: 'Ansicht', submenu: [
      { role: 'reload', label: 'Neu laden' }, { role: 'forceReload', label: 'Erzwungenes Neuladen' },
      { type: 'separator' },
      { role: 'resetZoom', label: 'Zoom zurücksetzen' }, { role: 'zoomIn', label: 'Vergrössern' }, { role: 'zoomOut', label: 'Verkleinern' },
      { type: 'separator' },
      { role: 'togglefullscreen', label: 'Vollbild' },
      { role: 'toggleDevTools', label: 'Entwickler-Werkzeuge' },
    ]},
    { label: 'Fenster', submenu: [
      { role: 'minimize', label: 'Minimieren' },
      { role: 'close', label: 'Schliessen' },
    ]},
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));

  mainWindow.on('closed', () => { mainWindow = null; });
}

// ── APP LIFECYCLE ────────────────────────────────────────────────
app.whenReady().then(async () => {
  loadEnvLocal();

  try {
    if (!isDev) {
      await startNextServer();
    }
    createWindow();
    log('✓ App gestartet.');
  } catch (err) {
    log('STARTUP FEHLER:', err.stack || err.message);
    dialog.showErrorBox(
      'Familien-Code konnte nicht starten',
      `Fehler beim Starten:\n\n${err.message}\n\nLog-Datei:\n${logFile}\n\nBitte das Log an Mauro schicken.`
    );
    shell.openPath(logFile);
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (nextServer) { nextServer.close(); nextServer = null; }
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) createWindow();
});

app.on('before-quit', () => {
  if (nextServer) { nextServer.close(); nextServer = null; }
});

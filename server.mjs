// Creature Clash server. Runs the whole game on this computer: the game, the account pages, the API and the
// database (saved in the data/ folder). No cloud services are needed.
//
//   npm install      (once)
//   npm start        then open http://localhost:3000
//
// Settings go in a .env.local file next to package.json (see .env.example). Emails are printed in this window
// instead of being sent, unless you add a Resend key.
import http from 'node:http';
import { readFileSync, existsSync, statSync, mkdirSync, writeFileSync, createReadStream } from 'node:fs';
import { join, extname, normalize, sep } from 'node:path';
import { randomBytes } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const PUBLIC = join(ROOT, 'public');
const MODULES = join(ROOT, 'node_modules');

// ---- settings -------------------------------------------------------------------------------------------
for (const f of ['.env.local', '.env']) {
  const p = join(ROOT, f);
  if (!existsSync(p)) continue;
  for (const line of readFileSync(p, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (!m || process.env[m[1]] !== undefined) continue;
    let v = m[2];
    if (/^(['"]).*\1$/.test(v)) v = v.slice(1, -1);
    if (v !== '') process.env[m[1]] = v;
  }
}
const { DATA_DIR, openDb, backupNow, closeDb } = await import('./lib/db.js');
mkdirSync(DATA_DIR, { recursive: true });
process.env.NODE_ENV ||= 'production';
process.env.INSECURE_COOKIES = '1';             // plain http, so cookies can't carry the Secure flag
if (!process.env.APP_SECRET) {                  // a private secret for this computer, kept between runs
  const f = join(DATA_DIR, 'app-secret');
  if (!existsSync(f)) writeFileSync(f, randomBytes(32).toString('base64url'), { mode: 0o600 });
  process.env.APP_SECRET = readFileSync(f, 'utf8').trim();
}
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '127.0.0.1';   // HOST=0.0.0.0 lets tablets on your Wi-Fi join

let dbOk = true;
try { await openDb(); }
catch (e) { dbOk = false; console.error('\nThe database could not start: ' + e.message + '\nThe game still runs, but only as a guest (no accounts).\n'); }

// ---- site rules: clean URLs, rewrites, security headers ---------------------------------------------------
const site = JSON.parse(readFileSync(join(ROOT, 'lib', 'site-config.json'), 'utf8'));
const toRe = src => new RegExp('^' + src.split('(.*)').map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('(.*)') + '$');
const rewrites = site.rewrites.map(r => ({ re: toRe(r.source), dest: r.destination }));
const headerRules = site.headers.map(h => ({ re: toRe(h.source), headers: h.headers }));
function applyHeaders(res, path) {
  for (const rule of headerRules) if (rule.re.test(path)) for (const { key, value } of rule.headers) res.setHeader(key, value);
}

// ---- API: api/foo.js and api/foo/[action].js ------------------------------------------------------------
const handlers = new Map();
async function loadHandler(file) {
  if (!handlers.has(file)) handlers.set(file, (await import(pathToFileURL(file).href)).default);
  return handlers.get(file);
}
function findApi(path) {
  const parts = path.replace(/^\/api\/?/, '').split('/').filter(Boolean);
  if (!parts.length || parts.some(p => !/^[A-Za-z0-9_-]+$/.test(p))) return null;
  const direct = join(ROOT, 'api', ...parts) + '.js';
  if (existsSync(direct)) return { file: direct, params: {} };
  const dyn = join(ROOT, 'api', ...parts.slice(0, -1), '[action].js');
  if (parts.length > 1 && existsSync(dyn)) return { file: dyn, params: { action: parts[parts.length - 1] } };
  return null;
}

// ---- static files ---------------------------------------------------------------------------------------
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.ico': 'image/x-icon', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg',
  '.wav': 'audio/wav', '.woff2': 'font/woff2', '.woff': 'font/woff', '.txt': 'text/plain; charset=utf-8' };

function inside(base, rel) {
  base = base.replace(/[\\/]+$/, '');
  let clean;
  try { clean = normalize(decodeURIComponent(rel)).replace(/^([/\\])+/, ''); } catch { return null; }
  const full = join(base, clean);
  return full === base || full.startsWith(base + sep) ? full : null;
}
function staticFile(path) {
  // The 3D engine and fonts come from node_modules, at the exact versions in package.json.
  for (const [prefix, dir] of Object.entries(site.vendor)) {
    if (!path.startsWith(prefix)) continue;
    const pkg = join(MODULES, dir);
    const f = inside(pkg, path.slice(prefix.length));
    return f && /\.(js|css|woff2?)$/.test(f) && existsSync(f) && statSync(f).isFile() ? f : null;
  }
  const base = inside(PUBLIC, path);
  if (!base) return null;
  const tries = extname(base) ? [base] : [base + '.html', join(base, 'index.html')];
  for (const f of tries) if (existsSync(f) && statSync(f).isFile()) return f;
  return null;
}
function sendFile(res, file, status = 200) {
  res.statusCode = status;
  res.setHeader('Content-Type', TYPES[extname(file).toLowerCase()] || 'application/octet-stream');
  if (!res.getHeader('Cache-Control')) res.setHeader('Cache-Control', file.startsWith(MODULES) ? 'public, max-age=604800' : 'no-cache');
  createReadStream(file).pipe(res);
}

// ---- server ---------------------------------------------------------------------------------------------
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  let path = url.pathname;
  try {
    applyHeaders(res, path);
    if (path === '/api' || path.startsWith('/api/')) {
      const hit = findApi(path);
      if (!hit) { res.statusCode = 404; res.setHeader('Content-Type', 'application/json'); return res.end('{"error":{"code":"not_found","message":"Not found."}}'); }
      if (!dbOk && !path.startsWith('/api/telemetry')) {
        res.statusCode = 503; res.setHeader('Content-Type', 'application/json');
        return res.end('{"error":{"code":"no_database","message":"Accounts are off because the database did not start. You can still play as a guest."}}');
      }
      req.query = { ...Object.fromEntries(url.searchParams), ...hit.params };
      return await (await loadHandler(hit.file))(req, res);
    }
    if (path.endsWith('.html') || (path.length > 1 && path.endsWith('/') && !path.startsWith('/vendor/'))) { // clean URLs
      const clean = path.replace(/(index)?\.html$/, '').replace(/\/+$/, '') || '/';
      res.statusCode = 308; res.setHeader('Location', clean + url.search); return res.end();
    }
    for (const r of rewrites) if (r.re.test(path)) { path = r.dest; break; }
    const file = staticFile(path === '/' ? '/index.html' : path);
    if (file) return sendFile(res, file);
    return sendFile(res, join(PUBLIC, '404.html'), 404);
  } catch (e) {
    console.error(e);
    if (!res.headersSent) { res.statusCode = 500; res.setHeader('Content-Type', 'text/plain'); }
    res.end('Server error. See the Creature Clash window for details.');
  }
});

// ---- backups: one at start, then once a day while running ------------------------------------------------
async function backup() {
  try { const f = await backupNow(); if (f) console.log('  Backup saved: ' + (f.startsWith(ROOT) ? f.slice(ROOT.length) : f)); }
  catch (e) { console.error('  Backup failed: ' + e.message); }
}

server.listen(PORT, HOST, () => {
  const url = `http://localhost:${PORT}`;
  console.log(`\n  Creature Clash is running at  ${url}\n`);
  console.log(dbOk ? `  Database: ${DATA_DIR}` : '  Database: off (guest play only)');
  if (HOST === '0.0.0.0') console.log('  Other devices on your Wi-Fi can join at http://<this computer\'s IP address>:' + PORT);
  console.log('  Emails are printed here instead of being sent.');
  console.log('  Admin Analytics: ' + url + '/admin' + (process.env.ADMIN_USERNAMES ? '' : '  (add ADMIN_USERNAMES=yourname to .env.local)'));
  console.log('  Stop the game with Ctrl+C.\n');
  if (dbOk) { backup(); setInterval(backup, 24 * 3600 * 1000).unref(); }
  if (process.env.OPEN_BROWSER === '1') {
    const cmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'explorer' : 'xdg-open';
    try { spawn(cmd, [url], { stdio: 'ignore', detached: true }).unref(); } catch { /* open it by hand */ }
  }
});
server.on('error', e => {
  if (e.code === 'EADDRINUSE') console.error(`Port ${PORT} is busy. Is Creature Clash already running? Or try: PORT=3001 npm start`);
  else console.error(e);
  process.exit(1);
});
let stopping = false;
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, async () => {
  if (stopping) process.exit(0);
  stopping = true; console.log('\n  Stopping Creature Clash…');
  server.close(); try { await closeDb(); } catch { /* ignore */ }
  process.exit(0);
});

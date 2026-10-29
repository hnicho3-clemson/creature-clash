// Runs Creature Clash on your own computer: the game, the account pages and the API, at http://localhost:3000
//
//   npm install
//   npm run dev
//
// It follows vercel.json (clean URLs, rewrites, security headers) so it behaves like the live site.
// Emails are not sent: sign-up, reset and parent codes are printed in this terminal instead.
// Settings can go in a .env.local file next to package.json (see .env.example). PORT changes the port.
import http from 'node:http';
import { readFileSync, existsSync, statSync, mkdirSync, writeFileSync, createReadStream } from 'node:fs';
import { join, extname, normalize, sep } from 'node:path';
import { randomBytes } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PUBLIC = join(ROOT, 'public');
const DATA = join(ROOT, '.data');

// ---- settings -------------------------------------------------------------------------------------------
for (const f of ['.env.local', '.env']) {
  const p = join(ROOT, f);
  if (!existsSync(p)) continue;
  for (const line of readFileSync(p, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m || process.env[m[1]] !== undefined) continue;
    let v = m[2];
    if (/^(['"]).*\1$/.test(v)) v = v.slice(1, -1);
    if (v !== '') process.env[m[1]] = v;
  }
}
mkdirSync(DATA, { recursive: true });
process.env.NODE_ENV ||= 'development';
process.env.INSECURE_COOKIES = '1';             // plain http on localhost, so no Secure flag on the cookie
if (!process.env.APP_SECRET) {                  // a private secret for this computer, kept between runs
  const f = join(DATA, 'app-secret');
  if (!existsSync(f)) writeFileSync(f, randomBytes(32).toString('base64url'), { mode: 0o600 });
  process.env.APP_SECRET = readFileSync(f, 'utf8').trim();
}
const PORT = Number(process.env.PORT) || 3000;

const { setupLocalDb } = await import('./dev-db.mjs');
let dbLabel;
try { dbLabel = await setupLocalDb(DATA); }
catch (e) { console.error('\nThe database could not start: ' + e.message + '\nThe game still runs, but only as a guest (no sign-in).\n'); dbLabel = 'none (guest play only)'; }

// ---- vercel.json ----------------------------------------------------------------------------------------
const vercel = JSON.parse(readFileSync(join(ROOT, 'vercel.json'), 'utf8'));
const toRe = src => new RegExp('^' + src.split('(.*)').map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('(.*)') + '$');
const rewrites = (vercel.rewrites || []).map(r => ({ re: toRe(r.source), dest: r.destination }));
const headerRules = (vercel.headers || []).map(h => ({ re: toRe(h.source), headers: h.headers }));

function applyHeaders(res, path) {
  for (const rule of headerRules) {
    if (!rule.re.test(path)) continue;
    for (const { key, value } of rule.headers) {
      if (key === 'Strict-Transport-Security') continue;   // never pin HSTS on localhost
      // localhost is plain http: upgrading requests to https would break every request
      res.setHeader(key, key === 'Content-Security-Policy' ? value.replace(/;\s*upgrade-insecure-requests/, '') : value);
    }
  }
}

// ---- API: api/foo.js and api/foo/[param].js, like Vercel ------------------------------------------------
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
  const dir = join(ROOT, 'api', ...parts.slice(0, -1));
  if (existsSync(dir) && statSync(dir).isDirectory()) {
    for (const name of ['[action].js']) {
      const f = join(dir, name);
      if (existsSync(f)) return { file: f, params: { action: parts[parts.length - 1] } };
    }
  }
  return null;
}

// ---- static files ---------------------------------------------------------------------------------------
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.ico': 'image/x-icon', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg',
  '.wav': 'audio/wav', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8', '.webmanifest': 'application/manifest+json' };

function staticFile(path) {
  const safe = normalize(decodeURIComponent(path)).replace(/^([/\\])+/, '');
  const base = join(PUBLIC, safe);
  if (!(base + sep).startsWith(PUBLIC + sep) && base !== PUBLIC) return null;
  const tries = extname(base) ? [base] : [base + '.html', join(base, 'index.html')];
  for (const f of tries) if (existsSync(f) && statSync(f).isFile()) return f;
  return null;
}
function sendFile(res, file, status = 200) {
  res.statusCode = status;
  res.setHeader('Content-Type', TYPES[extname(file).toLowerCase()] || 'application/octet-stream');
  if (!res.getHeader('Cache-Control')) res.setHeader('Cache-Control', 'no-cache');
  createReadStream(file).pipe(res);
}

// ---- server ---------------------------------------------------------------------------------------------
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  let path = url.pathname;
  try {
    applyHeaders(res, path);
    if (path.startsWith('/api/') || path === '/api') {
      const hit = findApi(path);
      if (!hit) { res.statusCode = 404; res.setHeader('Content-Type', 'application/json'); return res.end('{"error":{"code":"not_found","message":"Not found."}}'); }
      req.query = { ...Object.fromEntries(url.searchParams), ...hit.params };
      return await (await loadHandler(hit.file))(req, res);
    }
    if (path.endsWith('.html') || (path.length > 1 && path.endsWith('/'))) {   // cleanUrls and trailingSlash: false
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
    res.end('Local server error. See the terminal.');
  }
});

server.listen(PORT, () => {
  console.log(`\n  Creature Clash is running at  http://localhost:${PORT}\n`);
  console.log(`  Database: ${dbLabel}`);
  console.log(`  Emails are printed here instead of sent. Add #dev to the address for the developer console.`);
  console.log(`  Admin page: http://localhost:${PORT}/admin  (set ADMIN_USERNAMES in .env.local)\n`);
});
server.on('error', e => {
  if (e.code === 'EADDRINUSE') console.error(`Port ${PORT} is busy. Try:  PORT=3001 npm run dev`);
  else console.error(e);
  process.exit(1);
});

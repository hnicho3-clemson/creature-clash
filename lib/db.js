// Database access. Creature Clash keeps its database on this computer: PGlite, a full Postgres compiled to
// WebAssembly, saved in the data/ folder (or CC_DATA_DIR). Nothing is sent to a cloud database.
// Every query is a tagged template: values travel as bound parameters, never as SQL text.
//   const rows = await sql`SELECT * FROM users WHERE id = ${id}`;
import { readFileSync, mkdirSync, readdirSync, writeFileSync, unlinkSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
export const DATA_DIR = resolve(process.env.CC_DATA_DIR || join(ROOT, 'data'));
export const PG_DIR = join(DATA_DIR, 'pg');
export const BACKUP_DIR = join(DATA_DIR, 'backups');
const SCHEMA = readFileSync(join(ROOT, 'db', 'schema.sql'), 'utf8');

let client = null;   // a function (strings, ...values) => Promise<rows>
let opening = null;  // Promise while PGlite starts
let pg = null;       // the PGlite instance

// Results look the same as before: 64-bit integers and decimals as strings, JSON as objects.
// (BigInts would also break JSON.stringify.)
function plain(v) { return typeof v === 'bigint' ? v.toString() : v; }
function param(v) {
  if (v === undefined) return null;
  if (v instanceof Date) return v.toISOString();
  if (v !== null && typeof v === 'object') return JSON.stringify(v);
  return v;
}

export async function openDb() {
  if (client) return client;
  if (globalThis.__CC_TEST_SQL__) return (client = globalThis.__CC_TEST_SQL__); // tests run against a throwaway Postgres
  if (!opening) opening = (async () => {
    let mod;
    try { mod = await import('@electric-sql/pglite'); }
    catch { throw new Error('The database package is missing. Run "npm install" in the game folder first.'); }
    mkdirSync(DATA_DIR, { recursive: true });
    // 20 = int8, 1700 = numeric: keep them as text.
    pg = new mod.PGlite(PG_DIR, { parsers: { 20: x => x, 1700: x => x } });
    await pg.waitReady;
    await pg.exec(SCHEMA); // creates or updates the tables; safe to run every start
    client = async (strings, ...values) => {
      let text = strings[0];
      for (let i = 1; i < strings.length; i++) text += '$' + i + strings[i];
      const r = await pg.query(text, values.map(param));
      return (r.rows || []).map(row => { const o = {}; for (const k in row) o[k] = plain(row[k]); return o; });
    };
    return client;
  })();
  return opening;
}

export async function sql(strings, ...values) {
  if (!Array.isArray(strings) || !Array.isArray(strings.raw)) throw new Error('sql must be used as a tagged template');
  return (client || await openDb())(strings, ...values);
}

// Backups: a compressed copy of the whole database in data/backups. The server makes one when it starts
// and once a day while it runs, and keeps the newest KEEP. Restore with: npm run restore
const KEEP = 14;
export async function backupNow() {
  await openDb();
  if (!pg) return null; // tests
  mkdirSync(BACKUP_DIR, { recursive: true });
  const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
  const file = join(BACKUP_DIR, `creature-clash-${stamp}.tar.gz`);
  const blob = await pg.dumpDataDir('gzip');
  writeFileSync(file, Buffer.from(await blob.arrayBuffer()), { mode: 0o600 });
  const old = listBackups().slice(KEEP);
  for (const f of old) try { unlinkSync(join(BACKUP_DIR, f)); } catch { /* ignore */ }
  return file;
}
export function listBackups() {
  if (!existsSync(BACKUP_DIR)) return [];
  return readdirSync(BACKUP_DIR).filter(f => /^creature-clash-.*\.tar\.gz$/.test(f)).sort().reverse();
}

export async function closeDb() { if (pg) { await pg.close(); pg = null; client = null; opening = null; } }
export function resetDbForTests() { client = null; opening = null; }

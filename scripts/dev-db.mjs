// Database for local development. The API code talks to Postgres through lib/db.js; this file plugs a local
// database into it so `npm run dev` needs no Neon account and no Postgres install.
//
//   DATABASE_URL set   -> the real Neon driver (for example a Neon dev branch). Nothing here is used.
//   LOCAL_PG set       -> a Postgres you run yourself, reached with psql. LOCAL_PG holds psql's connection
//                         flags, e.g. LOCAL_PG="-h localhost -p 5432 -U postgres". Database: creature_clash_dev.
//   neither            -> PGlite, a full Postgres compiled to WebAssembly, saved in the .data/ folder.
import { readFileSync, mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';

const SCHEMA = readFileSync(new URL('../db/schema.sql', import.meta.url), 'utf8');

// Neon returns 64-bit integers and decimals as strings and JSON as objects. Keep local results the same shape,
// so code that works here works on Vercel. BigInts would also break JSON.stringify.
function plain(v) {
  if (typeof v === 'bigint') return v.toString();
  if (Array.isArray(v)) return v.map(plain);
  return v;
}
const plainRows = rows => rows.map(r => { const o = {}; for (const k in r) o[k] = plain(r[k]); return o; });

function toText(strings) { let t = strings[0]; for (let i = 1; i < strings.length; i++) t += '$' + i + strings[i]; return t; }
function param(v) {
  if (v === undefined) return null;
  if (v instanceof Date) return v.toISOString();
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (v !== null && typeof v === 'object') return JSON.stringify(v);
  return v;
}

async function pglite(dir) {
  let mod;
  try { mod = await import('@electric-sql/pglite'); }
  catch { throw new Error('The built-in database is not installed. Run "npm install" first.'); }
  mkdirSync(dir, { recursive: true });
  // 20 = int8, 1700 = numeric: return them as text, like Neon does.
  const db = new mod.PGlite(dir, { parsers: { 20: x => x, 1700: x => x } });
  await db.waitReady;
  await db.exec(SCHEMA);
  return async (strings, ...values) => {
    const r = await db.query(toText(strings), values.map(param));
    return plainRows(r.rows || []);
  };
}

// psql adapter: one psql call per query, values embedded as dollar-quoted literals with a random tag.
function psqlAdapter(flags) {
  const PG = flags.trim().split(/\s+/);
  const DB = process.env.LOCAL_PG_DB || 'creature_clash_dev';
  const run = (db, input) => {
    const r = spawnSync('psql', [...PG, '-d', db, '-At', '-q', '-v', 'ON_ERROR_STOP=1'], { input, encoding: 'utf8' });
    if (r.error) throw new Error('Could not run psql: ' + r.error.message);
    if (r.status !== 0) throw new Error((r.stderr || 'psql failed').trim());
    return r.stdout;
  };
  const exists = run('postgres', `SELECT 1 FROM pg_database WHERE datname = '${DB}';`).trim() === '1';
  if (!exists) run('postgres', `CREATE DATABASE ${DB};`);
  run(DB, SCHEMA);
  const literal = v => {
    v = param(v);
    if (v === null) return 'NULL';
    const s = String(v);
    let tag; do { tag = 'v' + randomBytes(6).toString('hex'); } while (s.includes('$' + tag + '$'));
    return `$${tag}$${s}$${tag}$`;
  };
  return async (strings, ...values) => {
    let text = strings[0];
    values.forEach((v, i) => { text += literal(v) + strings[i + 1]; });
    const returns = /^\s*SELECT\b/i.test(text) || /\bRETURNING\b/i.test(text);
    const out = run(DB, returns ? `WITH __q AS (${text}) SELECT coalesce(json_agg(__q), '[]') FROM __q;` : text + ';');
    return returns ? JSON.parse(out.trim() || '[]') : [];
  };
}

// Returns a short description of the database in use.
export async function setupLocalDb(dataDir) {
  if (process.env.DATABASE_URL) return 'Neon (DATABASE_URL)';
  if (process.env.LOCAL_PG) {
    globalThis.__CC_TEST_SQL__ = psqlAdapter(process.env.LOCAL_PG);
    return `your Postgres (LOCAL_PG), database ${process.env.LOCAL_PG_DB || 'creature_clash_dev'}`;
  }
  globalThis.__CC_TEST_SQL__ = await pglite(dataDir + '/pg');
  return 'built-in PGlite, saved in .data/pg';
}

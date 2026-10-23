// Test helpers: a throwaway Postgres database, a psql-backed stand-in for the Neon driver,
// and fake req/res objects that drive the real API handlers.
// Needs a local Postgres. Set TEST_PG (default: -h /var/tmp/ccpg -p 5433 -U cc).
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';

process.env.NODE_ENV = 'test';
process.env.APP_SECRET = process.env.APP_SECRET || 'test-secret-'.padEnd(48, 'x');

const PG = (process.env.TEST_PG || '-h /var/tmp/ccpg -p 5433 -U cc').split(' ');
const DB = 'cc_test_' + randomBytes(4).toString('hex');

function psql(db, input) {
  const r = spawnSync('psql', [...PG, '-d', db, '-At', '-q', '-v', 'ON_ERROR_STOP=1'], { input, encoding: 'utf8' });
  if (r.status !== 0) throw new Error((r.stderr || 'psql failed').trim());
  return r.stdout;
}

// Values are embedded as dollar-quoted literals with a random tag, so no value can end the quote.
function literal(v) {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'boolean') return v ? "'true'" : "'false'";
  if (v instanceof Date) v = v.toISOString();
  const s = String(v);
  let tag; do { tag = 'v' + randomBytes(6).toString('hex'); } while (s.includes('$' + tag + '$'));
  return `$${tag}$${s}$${tag}$`;
}

export const queryLog = [];
export function makeSql() {
  return async (strings, ...values) => {
    let text = strings[0];
    values.forEach((v, i) => { text += literal(v) + strings[i + 1]; });
    queryLog.push(text);
    const returns = /^\s*SELECT\b/i.test(text) || /\bRETURNING\b/i.test(text);
    const out = psql(DB, returns ? `WITH __q AS (${text}) SELECT coalesce(json_agg(__q), '[]') FROM __q;` : text + ';');
    return returns ? JSON.parse(out.trim() || '[]') : [];
  };
}

export function setupDb() {
  psql('postgres', `CREATE DATABASE ${DB};`);
  psql(DB, readFileSync(new URL('../db/schema.sql', import.meta.url), 'utf8'));
  globalThis.__CC_TEST_SQL__ = makeSql();
}
export function teardownDb() { try { psql('postgres', `DROP DATABASE IF EXISTS ${DB} WITH (FORCE);`); } catch { /* ignore */ } }
export const rawQuery = (text) => psql(DB, text);

// A tiny cookie-keeping client that calls handlers directly.
let ipCounter = 0;
export class Client {
  static nextIp() { ipCounter++; return `10.${(ipCounter >> 16) & 255}.${(ipCounter >> 8) & 255}.${ipCounter & 255}`; }
  constructor(ip = Client.nextIp()) { this.cookies = {}; this.ip = ip; }
  async call(handler, { method = 'POST', body, query = {}, headers = {}, raw } = {}) {
    const h = { host: 'clash.test', 'x-forwarded-for': this.ip, ...headers };
    if (method !== 'GET' && !('x-cc-request' in headers)) h['x-cc-request'] = '1';
    if (method !== 'GET' && !('content-type' in headers)) h['content-type'] = 'application/json';
    const ck = Object.entries(this.cookies).map(([k, v]) => `${k}=${v}`).join('; ');
    if (ck) h.cookie = ck;
    const req = { method, headers: h, query, url: '/api', body: raw !== undefined ? raw : (body === undefined ? undefined : body), socket: {} };
    const headersOut = {};
    const res = {
      statusCode: 200, writableEnded: false, body: '',
      setHeader(k, v) { headersOut[k.toLowerCase()] = v; }, getHeader(k) { return headersOut[k.toLowerCase()]; },
      end(b) { this.body = b || ''; this.writableEnded = true; },
    };
    await handler(req, res);
    for (const c of [].concat(headersOut['set-cookie'] || [])) {
      const [kv, ...attrs] = c.split(';'); const i = kv.indexOf('=');
      const k = kv.slice(0, i), v = kv.slice(i + 1);
      if (attrs.some(a => /max-age=0/i.test(a.trim())) || v === '') delete this.cookies[k]; else this.cookies[k] = v;
    }
    let data = null; try { data = JSON.parse(res.body); } catch { data = res.body; }
    return { status: res.statusCode, data, headers: headersOut };
  }
}

// Request plumbing shared by every API route: methods, CSRF checks, JSON bodies, cookies, errors.
import { randomUUID } from 'node:crypto';
import { recordServerError, scrub } from './telemetry.js';

export class ApiError extends Error {
  constructor(status, code, message, extra) { super(message); this.status = status; this.code = code; this.extra = extra; }
}
export const bad = (code, message, extra) => new ApiError(400, code, message, extra);

const UNSAFE = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const MAX_BODY_BYTES = 256 * 1024;

export function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.end(JSON.stringify(body));
}

export function parseCookies(req) {
  const out = {};
  const h = req.headers.cookie;
  if (!h) return out;
  for (const part of h.split(';')) {
    const i = part.indexOf('=');
    if (i < 1) continue;
    const k = part.slice(0, i).trim();
    if (!/^[A-Za-z0-9_-]+$/.test(k)) continue;
    try { out[k] = decodeURIComponent(part.slice(i + 1).trim()); } catch { /* ignore malformed */ }
  }
  return out;
}

export function setCookie(res, name, value, { maxAge, httpOnly = true } = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`, 'Path=/', 'SameSite=Lax'];
  if (httpOnly) parts.push('HttpOnly');
  if (process.env.NODE_ENV !== 'test' && process.env.INSECURE_COOKIES !== '1') parts.push('Secure');
  if (maxAge != null) parts.push(`Max-Age=${Math.floor(maxAge)}`);
  const prev = res.getHeader('Set-Cookie');
  res.setHeader('Set-Cookie', [].concat(prev || [], parts.join('; ')));
}

export function clientIp(req) {
  // Vercel sets x-forwarded-for; its first entry is the client. Fall back to the socket.
  const xf = req.headers['x-forwarded-for'];
  if (typeof xf === 'string' && xf.trim()) return xf.split(',')[0].trim().slice(0, 64);
  return (req.headers['x-real-ip'] || req.socket?.remoteAddress || 'unknown').toString().slice(0, 64);
}

export function siteOrigin(req) {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/+$/, '');
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const proto = req.headers['x-forwarded-proto'] || 'https';
  return `${proto}://${host}`;
}

// CSRF defence for cookie-authenticated requests:
// 1. state-changing requests must carry our custom header (a cross-site form or image cannot set it,
//    and a cross-site fetch with it triggers a CORS preflight we never approve);
// 2. if the browser sends Origin, it must be this site.
function checkCsrf(req) {
  if (req.headers['x-cc-request'] !== '1') throw new ApiError(403, 'csrf', 'This request was blocked. Reload the page and try again.');
  const origin = req.headers.origin;
  if (origin) {
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    let ok = false;
    try { ok = new URL(origin).host === host; } catch { ok = false; }
    if (!ok) throw new ApiError(403, 'csrf', 'This request was blocked. Reload the page and try again.');
  }
}

async function readBody(req) {
  if (req.body !== undefined && req.body !== null && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body;
  const ct = (req.headers['content-type'] || '').toLowerCase();
  if (!ct.startsWith('application/json')) throw new ApiError(415, 'content_type', 'Send JSON.');
  let raw = typeof req.body === 'string' ? req.body : Buffer.isBuffer(req.body) ? req.body.toString('utf8') : null;
  if (raw == null) {
    raw = await new Promise((resolve, reject) => {
      let size = 0; const chunks = [];
      req.on('data', c => { size += c.length; if (size > MAX_BODY_BYTES) { reject(new ApiError(413, 'too_large', 'That request is too big.')); req.destroy?.(); } else chunks.push(c); });
      req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
      req.on('error', reject);
    });
  }
  if (raw.length > MAX_BODY_BYTES) throw new ApiError(413, 'too_large', 'That request is too big.');
  if (!raw) return {};
  try {
    const v = JSON.parse(raw, (k, val) => (k === '__proto__' || k === 'constructor' || k === 'prototype') ? undefined : val);
    if (v === null || typeof v !== 'object' || Array.isArray(v)) throw new Error();
    return v;
  } catch { throw new ApiError(400, 'bad_json', 'That request was not valid JSON.'); }
}

// Wraps a route: method allowlist, CSRF, body parsing, and errors that never leak internals.
export function route(methods, fn) {
  return async function handler(req, res) {
    const reqId = randomUUID();
    try {
      res.setHeader('X-Request-Id', reqId);
      if (!methods.includes(req.method)) {
        res.setHeader('Allow', methods.join(', '));
        throw new ApiError(405, 'method', 'That method is not allowed here.');
      }
      let body = {};
      if (UNSAFE.has(req.method)) { checkCsrf(req); body = await readBody(req); }
      const out = await fn({ req, res, body, query: req.query || {} });
      if (!res.writableEnded) json(res, 200, out ?? { ok: true });
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.status === 429 && e.extra?.retryAfter) res.setHeader('Retry-After', String(e.extra.retryAfter));
        return json(res, e.status, { error: { code: e.code, message: e.message, ...(e.extra?.public || {}) } });
      }
      // Unexpected: log a short, secret-free line and return a generic message.
      console.error(`[${reqId}] ${req.method} ${(req.url || '').split('?')[0]} failed: ${e && e.name}: ${e && e.message ? scrub(e.message, 200) : ''}`);
      await recordServerError(req, e, reqId); // shows up in db/reports.sql under server errors
      return json(res, 500, { error: { code: 'server', message: 'Something went wrong on our side. Please try again.', requestId: reqId } });
    }
  };
}

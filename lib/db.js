// Database access. Every query is a tagged template: values travel as bound parameters, never as SQL text.
//   const rows = await sql`SELECT * FROM users WHERE id = ${id}`;
import { neon } from '@neondatabase/serverless';

let client = null;

function getClient() {
  if (client) return client;
  if (globalThis.__CC_TEST_SQL__) return (client = globalThis.__CC_TEST_SQL__); // tests run against local Postgres
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');
  client = neon(url);
  return client;
}

export function sql(strings, ...values) {
  if (!Array.isArray(strings) || !Array.isArray(strings.raw)) throw new Error('sql must be used as a tagged template');
  return getClient()(strings, ...values);
}

export function resetDbForTests() { client = null; }

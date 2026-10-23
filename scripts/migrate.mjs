// Creates or updates the database tables. Safe to run more than once.
// Run with your Neon connection string:  DATABASE_URL="postgres://..." npm run migrate
import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'node:fs';

const url = process.env.DATABASE_URL;
if (!url) { console.error('Set DATABASE_URL first (Vercel > Storage > your Neon database > .env.local tab).'); process.exit(1); }
const sql = neon(url);
const schema = readFileSync(new URL('../db/schema.sql', import.meta.url), 'utf8');

// Split on semicolons at line ends; the schema has no functions or quoted semicolons.
const statements = schema.split(/;\s*$/m).map(s => s.replace(/--.*$/gm, '').trim()).filter(Boolean);
for (const s of statements) {
  await sql.query ? sql.query(s) : sql(s);
}
console.log(`Database ready: ${statements.length} statements applied.`);

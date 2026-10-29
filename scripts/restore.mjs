// Restores the database from a backup in data/backups.
//   npm run restore              lists the backups
//   npm run restore -- latest    restores the newest one
//   npm run restore -- <file>    restores that one
// Stop the game server first. The current database is kept in data/pg-before-restore-<time> just in case.
import { renameSync, existsSync, readFileSync } from 'node:fs';
import { join, basename } from 'node:path';
import { PG_DIR, BACKUP_DIR, DATA_DIR, listBackups } from '../lib/db.js';

const arg = process.argv[2];
const all = listBackups();
if (!arg) {
  if (!all.length) console.log('No backups yet. The game makes one each time the server starts and once a day while it runs.');
  else { console.log('Backups, newest first:\n'); for (const f of all) console.log('  ' + f); console.log('\nRestore one with:  npm run restore -- latest   (or the file name)'); }
  process.exit(0);
}
const name = arg === 'latest' ? all[0] : basename(arg);
const file = name && join(BACKUP_DIR, name);
if (!file || !existsSync(file)) { console.error('No backup called ' + arg + '. Run "npm run restore" to see the list.'); process.exit(1); }

const { PGlite } = await import('@electric-sql/pglite');
if (existsSync(PG_DIR)) {
  const aside = join(DATA_DIR, 'pg-before-restore-' + Date.now());
  renameSync(PG_DIR, aside);
  console.log('Moved the current database to ' + aside);
}
const blob = new Blob([readFileSync(file)]);
const db = new PGlite(PG_DIR, { loadDataDir: blob });
await db.waitReady;
const [{ n }] = (await db.query('SELECT count(*)::int AS n FROM users')).rows;
await db.close();
console.log(`Restored ${name} (${n} account${n === 1 ? '' : 's'}). Start the game again with: npm start`);

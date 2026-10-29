# Creature Clash

A goofy 3D creature-building battle game in the browser, with optional accounts and cloud saves.

- `public/` is the game and the account, parent, privacy, rules and 404 pages (static files).
- `api/` is the server: Vercel functions for sign-in, saves, matches, the part shop, account deletion, and anonymous stats and error reports.
- `lib/` holds the server code those functions share. `db/schema.sql` is the database, and `db/reports.sql` has ready-made stats and error queries.

Guests can play without an account; their progress stays in the browser. Signed-in players' DNA, XP, levels and parts are kept and awarded by the server.

## Deploy on Vercel (one-time setup)

1. **Import the repo.** In Vercel, choose *Add New → Project*, pick this GitHub repo, and deploy with the default settings. The first deploy works as a guest-only game until the steps below are done.
2. **Add a database.** In the project, open *Storage → Create Database → Neon (Postgres)* and connect it to the project. This adds `DATABASE_URL` automatically.
3. **Create the tables.** In Vercel, open *Storage*, click your database, then *Open in Neon*. In Neon, open *SQL Editor*, paste the whole contents of `db/schema.sql`, and click *Run*. Check *Tables* shows `users`, `sessions`, `user_codes`, `rate_limits`, `saves`, `matches`, `daily_stats` and `error_reports`. Running it again is harmless.
   (Prefer a terminal? `npm install`, then `DATABASE_URL="..." npm run migrate` does the same.)
4. **Set up email.** Create a free account at [resend.com](https://resend.com) (or add Resend from Vercel's Marketplace), verify a domain you own, and create an API key.
5. **Add environment variables** in *Settings → Environment Variables* (Production and Preview). See `.env.example`:
   - `APP_SECRET`: 32+ random characters. Generate with `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`
   - `RESEND_API_KEY`: from Resend
   - `MAIL_FROM`: for example `Creature Clash <noreply@yourdomain.com>`
   - `SITE_URL`: your site's address, for example `https://creature-clash.vercel.app`
   - `ADMIN_USERNAMES`: usernames that can open the Admin Analytics page at `/admin`, separated by commas, for example `haley`
6. **Fill in your contact email** in `public/privacy.html` and `public/terms.html` (search for `YOUR-DOMAIN`). A real contact address is required for the children's privacy rules.
7. **Redeploy** (*Deployments → … → Redeploy*) so the new settings take effect.

## Updating the database after a code update

When `db/schema.sql` changes, run it again in Neon's *SQL Editor* (or `npm run migrate`) **before** the new code goes live. It only adds what's missing and never deletes data. The October 29 update adds the `display_name` and `portrait` columns for player cards; without them, signed-in players get errors.

## Backups

Every day a GitHub Action copies the whole database, encrypts it, and keeps it for 30 days. Neon also keeps its own short restore history (how long depends on your Neon plan), which is the fastest way to undo a mistake from the last few hours.

**Set it up once:**

1. In Vercel, open *Storage*, click your database, and copy the `DATABASE_URL` connection string (the *.env.local* tab shows it).
2. Make a long passphrase and keep it somewhere safe, like a password manager. Without it, the backups can't be opened. One way: `node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))"`
3. On GitHub, open this repo's *Settings → Secrets and variables → Actions* and add two repository secrets: `DATABASE_URL` and `BACKUP_PASSPHRASE`.
4. Open the *Actions* tab, pick *Daily database backup*, and click *Run workflow* once. When it turns green, the backup is listed at the bottom of the run's page under *Artifacts*. After that it runs by itself every night.

GitHub pauses scheduled workflows in a repo with no commits for 60 days. If that happens, the *Actions* tab shows a button to turn it back on.

**Restore a backup:**

1. Download the backup from the run's *Artifacts* section and unzip it. You get a `.dump.gpg` file.
2. Decrypt it: `gpg --decrypt creature-clash-DATE.dump.gpg > backup.dump` (it asks for the passphrase).
3. In Neon, create a new branch or database to restore into, so you never overwrite live data by accident, and copy its connection string.
4. Restore: `pg_restore --no-owner --no-privileges -d "NEW_CONNECTION_STRING" backup.dump`
5. Check the data, then point Vercel's `DATABASE_URL` at the restored database and redeploy.

Try a restore once before launch, so you know it works when you need it.

## Stats and error reports

The game counts a few anonymous daily totals and reports crashes to its own server. There are no cookies, no player IDs and no outside analytics or error service, which keeps it simple for a game kids play. Browsers that send Do Not Track or Global Privacy Control are not counted, and nothing is sent from `localhost` or when the page is opened with `#dev`.

- **Counted each day:** page views, visitors (each browser once a day), battles and challenges started, and minutes played.
- **Errors:** game crashes and unexpected server errors, scrubbed of emails, codes and tokens, grouped so one bug is one row with a count. Server errors include a request ID you can search for in Vercel's logs. Reports are deleted after 90 days.

To read them, open Neon's *SQL Editor* and run a query from `db/reports.sql`: the last 30 days, all-time totals, account counts, and the latest errors.

## Before launching to kids

- Have the privacy policy and rules read by someone who knows COPPA. They're a careful draft, not legal advice.
- Set up the daily backup above and test a restore once.

## Running it on your computer

You need [Node.js 22](https://nodejs.org). Then, in the project folder:

```
npm install
npm run dev
```

Open http://localhost:3000. That's the whole game with accounts, saves and the API, using a built-in database (PGlite) saved in the `.data/` folder, so you don't need Neon or Postgres. Delete `.data/` to start over with an empty database.

- **Emails aren't sent.** Sign-up, reset and parent-approval emails are printed in the terminal, codes and links included.
- **Admin page.** Make a file called `.env.local` next to `package.json` with `ADMIN_USERNAMES=yourname`, restart, sign in as that user and open http://localhost:3000/admin. Local play isn't counted in the stats, so the charts start empty.
- **Other databases.** Put `DATABASE_URL=...` in `.env.local` to use a Neon database instead (use a separate Neon branch, not the live one). If you run Postgres yourself, set `LOCAL_PG="-h localhost -p 5432 -U postgres"` to use it through `psql`.
- **Developer console.** Add `#dev` to the address, then press Ctrl+Shift+C.
- **Different port.** `PORT=3001 npm run dev` (on Windows PowerShell: `$env:PORT=3001; npm run dev`).

## Tests

```
npm test        # needs a local Postgres; set TEST_PG, e.g. TEST_PG="-h localhost -p 5432 -U postgres"
```

After changing part prices, unlock levels or rewards in `public/js/parts.js`, `core.js` or `campaign.js`, run `npm run catalog` so the server's copy matches. A test fails if you forget.

The developer console in the game (Ctrl+Shift+C) only works when the page is opened with `#dev` at the end of the address, and it never changes a signed-in player's server progress.

## Launch checklist

| Item | Where it lives |
| --- | --- |
| Real sign-in and sign-out | `/signin`; sign-out revokes the session on the server |
| Password reset | `/forgot-password`: an emailed 8-digit code, then a new password; signs out other devices |
| Email verification | `/verify-email`: an 8-digit code that lasts 20 minutes, with resend. Under-13 accounts need a parent's approval instead |
| Loading states | A loading screen while the game first loads, "Checking your account…" on the menu and account page, "Loading the numbers…" on Admin Analytics, and "Please wait…"/"Saving…" on every form button |
| Empty states | Empty Workshop slots, mystery pods for locked parts, the guest or offline account messages, and "No errors reported" on Admin Analytics |
| Clear error messages | Every form shows a readable alert; the server never shows internal errors |
| Form validation | Checked in the page for quick feedback and again on the server |
| Rate limiting | Sign-in, sign-up, codes, resets, parent links, saves, matches, the shop, player cards, the admin page, stats and error reports |
| Database backups | Daily encrypted backup kept 30 days (see *Backups*) plus Neon's own restore history. **Not running yet:** the nightly job fails until the two GitHub secrets are added |
| Row level security | On for every table. The game connects as the table owner; any other role sees nothing |
| API keys off the frontend | Database, email and app secrets only exist as Vercel environment variables |
| Mobile layout | Phone-sized layouts and touch controls (joystick and buttons) |
| Custom 404 page | `public/404.html` |
| Analytics | Anonymous first-party daily counts, shown on the admin-only **Admin Analytics** page (`/admin`): games played, hours played, page views and active players, plus accounts and the latest errors |
| Error tracking | First-party, scrubbed, grouped error reports from the game and the API |
| Privacy policy | `/privacy` |
| Terms | `/terms` (the game rules) |
| Delete account | Account page: password plus typing DELETE |
| Onboarding | No automatic tour. New accounts pick a player name and a creature portrait the first time they reach the main menu (no bio, no photo upload). Settings has a **Walkthrough** button (intro cutscene, then How to play) and a **Player card** button. The comfort-settings welcome and the campaign (the tutorial) stay |

## Security notes

- Passwords are hashed with scrypt; sessions are random tokens in HttpOnly, Secure, SameSite=Lax cookies, stored hashed and revocable.
- Every database query uses bound parameters. Every input is checked on the server.
- State-changing requests need a custom header and a same-site Origin (CSRF protection).
- Sign-in, sign-up, codes and resets are rate limited in the database.
- Under-13 accounts stay locked until a parent approves by email; unapproved requests are deleted after 7 days.
- Matches run in the player's browser, so the server can't watch them. It checks every report (kills against team size and time, one payout per match, drops only for real kills) but a determined cheater can still claim plausible results. True anti-cheat needs server-run matches.

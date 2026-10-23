# Creature Clash

A goofy 3D creature-building battle game in the browser, with optional accounts and cloud saves.

- `public/` is the game and the account, parent, privacy, rules and 404 pages (static files).
- `api/` is the server: Vercel functions for sign-in, saves, matches, the part shop and account deletion.
- `lib/` holds the server code those functions share. `db/schema.sql` is the database.

Guests can play without an account; their progress stays in the browser. Signed-in players' DNA, XP, levels and parts are kept and awarded by the server.

## Deploy on Vercel (one-time setup)

1. **Import the repo.** In Vercel, choose *Add New → Project*, pick this GitHub repo, and deploy with the default settings. The first deploy works as a guest-only game until the steps below are done.
2. **Add a database.** In the project, open *Storage → Create Database → Neon (Postgres)* and connect it to the project. This adds `DATABASE_URL` automatically.
3. **Create the tables.** On your computer, in this repo folder:
   ```
   npm install
   DATABASE_URL="(copy it from Vercel → Storage → your database → .env.local)" npm run migrate
   ```
   You should see `Database ready`.
4. **Set up email.** Create a free account at [resend.com](https://resend.com) (or add Resend from Vercel's Marketplace), verify a domain you own, and create an API key.
5. **Add environment variables** in *Settings → Environment Variables* (Production and Preview). See `.env.example`:
   - `APP_SECRET`: 32+ random characters. Generate with `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`
   - `RESEND_API_KEY`: from Resend
   - `MAIL_FROM`: for example `Creature Clash <noreply@yourdomain.com>`
   - `SITE_URL`: your site's address, for example `https://creature-clash.vercel.app`
6. **Fill in your contact email** in `public/privacy.html` and `public/terms.html` (search for `YOUR-DOMAIN`). A real contact address is required for the children's privacy rules.
7. **Redeploy** (*Deployments → … → Redeploy*) so the new settings take effect.

## Before launching to kids

- Have the privacy policy and rules read by someone who knows COPPA. They're a careful draft, not legal advice.
- Turn on Neon's backups and point-in-time restore for your plan, and test a restore once.

## Developing

```
npm install
npm test        # needs a local Postgres; set TEST_PG, e.g. TEST_PG="-h localhost -p 5432 -U postgres"
```

After changing part prices, unlock levels or rewards in `public/js/parts.js`, `core.js` or `campaign.js`, run `npm run catalog` so the server's copy matches. A test fails if you forget.

The developer console in the game (Ctrl+Shift+C) only works when the page is opened with `#dev` at the end of the address, and it never changes a signed-in player's server progress.

## Security notes

- Passwords are hashed with scrypt; sessions are random tokens in HttpOnly, Secure, SameSite=Lax cookies, stored hashed and revocable.
- Every database query uses bound parameters. Every input is checked on the server.
- State-changing requests need a custom header and a same-site Origin (CSRF protection).
- Sign-in, sign-up, codes and resets are rate limited in the database.
- Under-13 accounts stay locked until a parent approves by email; unapproved requests are deleted after 7 days.
- Matches run in the player's browser, so the server can't watch them. It checks every report (kills against team size and time, one payout per match, drops only for real kills) but a determined cheater can still claim plausible results. True anti-cheat needs server-run matches.

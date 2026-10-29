# Creature Clash

A goofy 3D creature-building battle game in the browser, with optional accounts and saves. Everything runs on your own computer: the game, the accounts, the database and the backups. No Vercel, Neon or other cloud service is needed, and after the first setup it works without the internet.

## Start the game

You need [Node.js](https://nodejs.org) (the LTS version, 20 or newer).

**On a Mac:** double-click **Start Creature Clash.command**. The first time, it sets things up (this needs the internet once), then opens the game in your browser. Keep that window open while you play; close it to stop the game.
If macOS says it can't open the file, right-click it, choose *Open*, then *Open* again.

**On Windows:** double-click **Start Creature Clash.bat**.

**From a terminal**, in this folder:

```
npm install
npm start
```

Then open http://localhost:3000.

## What's where

- `server.mjs` is the game server. It serves the pages in `public/`, runs the API in `api/`, and opens the database.
- `public/` holds the game and the account, parent, privacy, rules, admin and 404 pages.
- `api/` and `lib/` are the server code: sign-in, saves, matches, the part shop, player cards, account deletion, stats and error reports.
- `db/schema.sql` describes the database. The server applies it every time it starts, so updates need no extra step.
- `data/` is created on first start. It holds the database (`data/pg`), the backups (`data/backups`) and this computer's private sign-in secret. **Don't share or delete it** unless you want to wipe every account. Git ignores it.

Guests can play without an account; their progress stays in the browser. Signed-in players' DNA, XP, levels and parts are kept and awarded by the server.

## Settings

The game works without any settings. To change something, copy `.env.example` to a file called `.env.local` in this folder, fill in what you need, and restart the game.

- `ADMIN_USERNAMES`: who can open **Admin Analytics** at http://localhost:3000/admin, for example `ADMIN_USERNAMES=haley`.
- `HOST=0.0.0.0`: lets tablets and other computers on the same Wi-Fi play, at `http://<this computer's IP address>:3000`. By default only this computer can.
- `PORT`: a different port than 3000.

## Emails

Account emails (sign-up codes, password reset codes and parent approval links) are **printed in the game's window** instead of being sent. Whoever runs the game reads the code there and passes it on. To send real emails instead, add `RESEND_API_KEY` and `MAIL_FROM` from [resend.com](https://resend.com) to `.env.local`.

## Backups

The game copies the whole database into `data/backups` when it starts and once a day while it runs, and keeps the newest 14.

To restore one, stop the game, then:

```
npm run restore              # lists the backups
npm run restore -- latest    # restores the newest
```

The database you replace is kept in `data/pg-before-restore-…` in case you change your mind. For extra safety, copy the `data/backups` folder to another drive now and then.

## Stats and error reports

The game counts a few anonymous daily totals and records crashes in its own database. There are no tracking cookies, no player IDs and no outside analytics or error service, which keeps it simple for a game kids play. Browsers that send Do Not Track or Global Privacy Control aren't counted, and neither are pages opened with `#dev`.

- **Counted each day:** page views, visitors (each browser once a day), battles and challenges started, and minutes played.
- **Errors:** game crashes and unexpected server errors, scrubbed of emails, codes and tokens, and grouped so one bug is one row with a count. Reports are deleted after 90 days.

Admins see all of it on the **Admin Analytics** page (`/admin`).

## Developing

```
npm test        # needs a Postgres with psql; set TEST_PG, e.g. TEST_PG="-h localhost -p 5432 -U postgres"
```

After changing part prices, unlock levels or rewards in `public/js/parts.js`, `core.js` or `campaign.js`, run `npm run catalog` so the server's copy matches. A test fails if you forget.

The developer console in the game (Ctrl+Shift+C) only works when the page is opened with `#dev` at the end of the address, and it never changes a signed-in player's server progress.

## Before letting kids play

- Have the privacy policy and rules read by someone who knows COPPA. They're a careful draft, not legal advice.
- Put your contact email in `public/privacy.html` and `public/terms.html` (search for `YOUR-DOMAIN`).
- Try a restore once, so you know it works when you need it.

## Launch checklist

| Item | Where it lives |
| --- | --- |
| Real sign-in and sign-out | `/signin`; sign-out revokes the session on the server |
| Password reset | `/forgot-password`: an 8-digit code, then a new password; signs out other devices |
| Email verification | `/verify-email`: an 8-digit code that lasts 20 minutes, with resend. Under-13 accounts need a parent's approval instead |
| Loading states | A loading screen while the game loads, "Checking your account…" on the menu and account page, "Loading the numbers…" on Admin Analytics, and "Please wait…"/"Saving…" on every form button |
| Empty states | Empty Workshop slots, mystery pods for locked parts, the guest account message, and "No errors reported" on Admin Analytics |
| Clear error messages | Every form shows a readable alert; the server never shows internal errors |
| Form validation | Checked in the page for quick feedback and again on the server |
| Rate limiting | Sign-in, sign-up, codes, resets, parent links, saves, matches, the shop, player cards, the admin page, stats and error reports |
| Database backups | Automatic: at every start and daily while running, newest 14 kept in `data/backups`; `npm run restore` brings one back |
| Row level security | On for every table. Only the game server opens the database, and it isn't reachable over the network |
| API keys off the frontend | The sign-in secret and any email key stay on the server (`data/app-secret`, `.env.local`) |
| Mobile layout | Phone-sized layouts and touch controls (joystick and buttons) |
| Custom 404 page | `public/404.html` |
| Analytics | Anonymous first-party daily counts on the admin-only **Admin Analytics** page (`/admin`): games played, hours played, page views and active players, plus accounts and the latest errors |
| Error tracking | First-party, scrubbed, grouped error reports from the game and the server |
| Privacy policy | `/privacy` |
| Terms | `/terms` (the game rules) |
| Delete account | Account page: password plus typing DELETE |
| Onboarding | No automatic tour. New accounts pick a player name and a creature portrait the first time they reach the main menu (no bio, no photo upload). Settings has a **Walkthrough** button (intro cutscene, then How to play) and a **Player card** button. The comfort-settings welcome and the campaign (the tutorial) stay |

## Security notes

- Passwords are hashed with scrypt; sessions are random tokens in HttpOnly, SameSite=Lax cookies, stored hashed and revocable.
- Every database query uses bound parameters. Every input is checked on the server.
- State-changing requests need a custom header and a same-site Origin (CSRF protection).
- Sign-in, sign-up, codes and resets are rate limited in the database.
- Under-13 accounts stay locked until a parent approves; unapproved requests are deleted after 7 days.
- The game is served over plain http on your own computer or Wi-Fi. Don't open it to the internet as is: that would need HTTPS in front of it.
- Matches run in the player's browser, so the server can't watch them. It checks every report (kills against team size and time, one payout per match, drops only for real kills), but a determined cheater can still claim plausible results.

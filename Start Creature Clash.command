#!/bin/bash
# Double-click to start Creature Clash on a Mac. It opens the game in your browser.
# Close this window (or press Ctrl+C) to stop the game.
cd "$(dirname "$0")" || exit 1
if ! command -v node >/dev/null 2>&1; then
  echo "Creature Clash needs Node.js. Install the LTS version from https://nodejs.org, then double-click this file again."
  open "https://nodejs.org"
  read -r -p "Press Enter to close."
  exit 1
fi
if [ ! -d node_modules ] || [ package.json -nt node_modules ]; then
  echo "Setting up (first time only, needs the internet once)..."
  if ! npm install --no-audit --no-fund; then read -r -p "Setup failed. Press Enter to close."; exit 1; fi
  touch node_modules
fi
OPEN_BROWSER=1 exec npm start

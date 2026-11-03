@echo off
rem Double-click to start Creature Clash on Windows. Close this window to stop the game.
cd /d "%~dp0"
where node >nul 2>nul || (echo Creature Clash needs Node.js. Install the LTS version from https://nodejs.org, then try again. & start https://nodejs.org & pause & exit /b 1)
if not exist node_modules (echo Setting up, first time only... & call npm install --no-audit --no-fund || (pause & exit /b 1))
set OPEN_BROWSER=1
npm start

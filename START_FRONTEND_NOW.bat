@echo off
echo ========================================
echo Starting Admin Dashboard Frontend
echo ========================================
echo.
echo Dashboard will start on: http://localhost:3001
echo.
echo Keep this window open!
echo Press Ctrl+C to stop the server
echo.
cd /d "%~dp0sensesafe\src\apps\admin-dashboard"
npm run dev
pause

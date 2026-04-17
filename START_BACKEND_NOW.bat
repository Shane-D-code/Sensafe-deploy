@echo off
echo ========================================
echo Starting SenseSafe Backend Server
echo ========================================
echo.
echo Backend will start on: http://100.31.117.111:8000
echo.
echo Keep this window open!
echo Press Ctrl+C to stop the server
echo.
cd /d "%~dp0backend"
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
pause

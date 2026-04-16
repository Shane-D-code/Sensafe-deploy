@echo off
echo ========================================
echo Starting Backend Server
echo ========================================
echo.
echo Backend will start on: http://172.31.186.150:8001
echo.
echo Keep this window open!
echo ========================================
echo.

python -m uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload

pause

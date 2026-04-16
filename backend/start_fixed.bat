@echo off
echo ========================================
echo   STARTING SENSESAFE BACKEND (FIXED)
echo ========================================
echo.
echo CORS: Fixed for localhost:3002 + network IPs
echo 500 Errors: All admin endpoints have error handling
echo Infinite Loops: Frontend components fixed
echo.
echo Starting on http://0.0.0.0:8000
echo Network access: http://192.168.0.130:8000
echo.
echo Press Ctrl+C to stop
echo ========================================
echo.

uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

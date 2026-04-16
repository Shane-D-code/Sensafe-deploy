@echo off
echo ========================================
echo   SOS FLOW COMPLETE TEST
echo ========================================
echo.
echo This script will:
echo 1. Check if backend is running
echo 2. Run complete SOS flow test
echo 3. Show you what to check in frontend
echo.
echo ========================================
echo.

cd backend

echo Step 1: Checking backend health...
curl -s http://192.168.0.130:8000/health
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ❌ Backend is NOT running!
    echo.
    echo Please start backend first:
    echo   cd microsoft_back/backend
    echo   uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
    echo.
    pause
    exit /b 1
)

echo.
echo ✅ Backend is running!
echo.

echo Step 2: Running complete SOS flow test...
echo ========================================
python test_sos_complete_flow.py

echo.
echo ========================================
echo   NEXT STEPS
echo ========================================
echo.
echo 1. Start frontend (if not already running):
echo    cd microsoft_back/sensesafe/src/apps/admin-dashboard
echo    npm run dev
echo.
echo 2. Open http://localhost:3002
echo.
echo 3. Login: admin@sensesafe.com / admin123
echo.
echo 4. Open DevTools Console (F12)
echo.
echo 5. Look for:
echo    - "Fetching alerts from backend..."
echo    - "Loaded X alerts from backend"
echo.
echo 6. Check Dashboard for SOS alerts
echo.
echo If SOS still doesn't appear:
echo    - Check browser Network tab for API calls
echo    - Check for CORS or 401 errors
echo    - See SOS_FLOW_DIAGNOSTIC.md for detailed troubleshooting
echo.
pause

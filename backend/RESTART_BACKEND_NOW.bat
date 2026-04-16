@echo off
echo ========================================
echo   RESTARTING BACKEND WITH FIX
echo ========================================
echo.
echo Killing existing backend processes...
taskkill /F /IM python.exe /FI "WINDOWTITLE eq *uvicorn*" 2>nul
timeout /t 2 /nobreak >nul

echo.
echo Starting backend with fix applied...
echo.
echo ✅ FIX APPLIED: AuditService now uses flush() instead of commit()
echo ✅ This fixes the StatementError in admin endpoints
echo.
echo Backend will start on:
echo   - Local: http://127.0.0.1:8000
echo   - Network: http://100.31.117.111:8000
echo.
echo Press Ctrl+C to stop
echo ========================================
echo.

uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

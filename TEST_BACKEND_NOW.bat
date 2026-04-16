@echo off
echo ========================================
echo Testing Backend Endpoints
echo ========================================
echo.
cd /d "%~dp0backend"
python test_sos_flow.py
echo.
echo ========================================
pause

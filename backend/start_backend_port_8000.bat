@echo off
echo ========================================
echo Starting Backend Server
echo ========================================
echo.
echo Backend will start on: http://172.31.186.150:8000
echo Network accessible from: http://172.31.186.150:8000
echo Local access: http://localhost:8000
echo API Docs: http://172.31.186.150:8000/docs
echo.
echo Keep this window open!
echo ========================================
echo.

python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

pause

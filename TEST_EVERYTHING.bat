@echo off
echo ========================================
echo TESTING ALL ENDPOINTS
echo ========================================
echo.
echo Current IP: 172.31.186.150
echo Port: 8000
echo.
echo ========================================
echo.

echo Test 1: Backend Health Check
echo ----------------------------------------
curl http://172.31.186.150:8000/health
echo.
echo.

echo Test 2: API Docs (should return HTML)
echo ----------------------------------------
curl -I http://172.31.186.150:8000/docs
echo.
echo.

echo Test 3: Login Endpoint
echo ----------------------------------------
cd backend
python test_login.py
cd ..
echo.
echo.

echo ========================================
echo TESTS COMPLETE
echo ========================================
echo.
echo Next: Test from phone browser
echo URL: http://172.31.186.150:8000/docs
echo.
pause

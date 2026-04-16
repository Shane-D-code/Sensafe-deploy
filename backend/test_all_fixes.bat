@echo off
echo ========================================
echo   TESTING ALL FIXES
echo ========================================
echo.

echo [1/5] Testing Health Endpoint...
curl -s http://100.31.117.111:8000/health
echo.
echo.

echo [2/5] Getting Admin Token...
for /f "tokens=*" %%i in ('curl -s -X POST http://100.31.117.111:8000/api/auth/login -H "Content-Type: application/json" -d "{\"email\":\"admin@sensesafe.com\",\"password\":\"admin123\"}" ^| jq -r .access_token') do set TOKEN=%%i
echo Token obtained: %TOKEN:~0,20%...
echo.

echo [3/5] Testing Admin Incidents Endpoint...
curl -s http://100.31.117.111:8000/api/admin/incidents -H "Authorization: Bearer %TOKEN%"
echo.
echo.

echo [4/5] Testing Admin SOS Endpoint...
curl -s http://100.31.117.111:8000/api/admin/sos -H "Authorization: Bearer %TOKEN%"
echo.
echo.

echo [5/5] Testing Scan Stats Endpoint...
curl -s http://100.31.117.111:8000/api/admin/scans/stats -H "Authorization: Bearer %TOKEN%"
echo.
echo.

echo ========================================
echo   CORS TEST (Check for Access-Control headers)
echo ========================================
curl -X OPTIONS http://100.31.117.111:8000/api/admin/incidents -H "Origin: http://localhost:3002" -H "Access-Control-Request-Method: GET" -v
echo.

echo ========================================
echo   ALL TESTS COMPLETE
echo ========================================
echo.
echo If you see JSON responses above (not 500 errors), everything is working!
echo.
pause

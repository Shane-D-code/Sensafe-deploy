@echo off
echo ========================================
echo INSTALLING COMPLETE VOICE SYSTEM
echo ========================================
echo.

echo New Features in This Build:
echo   ✅ Explicit broadcasts (Android 8+ fix)
echo   ✅ Voice incident reporting with description
echo   ✅ Enhanced description extraction
echo   ✅ Audio feedback for all actions
echo   ✅ Pre-filled incident forms from voice
echo.

echo Step 1: Uninstalling old app...
adb uninstall com.example.myapplication
timeout /t 2 /nobreak >nul
echo.

echo Step 2: Installing NEW APK...
adb install app\build\outputs\apk\debug\app-debug.apk
timeout /t 2 /nobreak >nul
echo.

echo Step 3: Granting permissions...
adb shell pm grant com.example.myapplication android.permission.RECORD_AUDIO
adb shell pm grant com.example.myapplication android.permission.CAMERA
adb shell pm grant com.example.myapplication android.permission.ACCESS_FINE_LOCATION
adb shell pm grant com.example.myapplication android.permission.ACCESS_COARSE_LOCATION
adb shell pm grant com.example.myapplication android.permission.READ_MEDIA_IMAGES
adb shell pm grant com.example.myapplication android.permission.POST_NOTIFICATIONS
echo.

echo ========================================
echo INSTALLATION COMPLETE!
echo ========================================
echo.

echo TEST THESE VOICE COMMANDS:
echo   1. "scan" - Opens camera
echo   2. "sos" - Sends SOS alert
echo   3. "timeline" - Opens timeline
echo   4. "report incident fire" - Opens incident report with "fire"
echo   5. "report incident about flooding" - Pre-fills "flooding"
echo.

echo Starting log viewer...
timeout /t 3 /nobreak >nul
echo.
echo ========================================
echo LOGS (Press Ctrl+C to stop):
echo ========================================
adb logcat -c
adb logcat | findstr /C:"Broadcast sent" /C:"MainActivity: Received" /C:"MainActivity: Navigating" /C:"MainActivity: Reporting"

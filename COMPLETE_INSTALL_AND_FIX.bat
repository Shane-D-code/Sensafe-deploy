@echo off
echo ========================================
echo COMPLETE INSTALL AND FIX
echo ========================================
echo.

echo Step 1: Uninstalling old app...
adb uninstall com.example.myapplication
timeout /t 2 /nobreak >nul
echo.

echo Step 2: Installing new APK...
adb install app\build\outputs\apk\debug\app-debug.apk
timeout /t 2 /nobreak >nul
echo.

echo Step 3: Granting all permissions...
echo   - Granting RECORD_AUDIO...
adb shell pm grant com.example.myapplication android.permission.RECORD_AUDIO
echo   - Granting CAMERA...
adb shell pm grant com.example.myapplication android.permission.CAMERA
echo   - Granting ACCESS_FINE_LOCATION...
adb shell pm grant com.example.myapplication android.permission.ACCESS_FINE_LOCATION
echo   - Granting ACCESS_COARSE_LOCATION...
adb shell pm grant com.example.myapplication android.permission.ACCESS_COARSE_LOCATION
echo   - Granting READ_MEDIA_IMAGES...
adb shell pm grant com.example.myapplication android.permission.READ_MEDIA_IMAGES
echo   - Granting POST_NOTIFICATIONS...
adb shell pm grant com.example.myapplication android.permission.POST_NOTIFICATIONS
echo.

echo Step 4: Verifying permissions...
adb shell dumpsys package com.example.myapplication | findstr "RECORD_AUDIO"
echo.

echo ========================================
echo INSTALLATION COMPLETE!
echo ========================================
echo.
echo The app is now installed with all permissions granted.
echo.
echo IMPORTANT: Open the app and test voice commands.
echo.
echo To view logs in real-time:
echo   adb logcat -c
echo   adb logcat ^| findstr "MainActivity BlindVoiceService CommandProcessor"
echo.
echo Expected behavior:
echo   1. Open app
echo   2. Select "Blind" mode
echo   3. You should hear: "Voice assistant activated"
echo   4. Say "scan" - Camera should open
echo   5. Say "sos" - SOS should be sent
echo.
pause

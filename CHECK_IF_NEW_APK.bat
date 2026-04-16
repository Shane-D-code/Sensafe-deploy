@echo off
echo ========================================
echo CHECKING APK VERSION
echo ========================================
echo.

echo Checking installed app info...
adb shell dumpsys package com.example.myapplication | findstr "versionName versionCode firstInstallTime lastUpdateTime"
echo.

echo Checking APK build time...
dir app\build\outputs\apk\debug\app-debug.apk
echo.

echo ========================================
echo INSTRUCTIONS:
echo ========================================
echo.
echo If lastUpdateTime is BEFORE 11:21 AM today (2026-04-16),
echo then you're running the OLD APK without the fix!
echo.
echo Solution: Run INSTALL_NEW_APK.bat
echo.
pause

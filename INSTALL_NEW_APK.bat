@echo off
echo ========================================
echo INSTALLING NEW APK WITH VOICE FIX
echo ========================================
echo.

echo Step 1: Uninstalling old app...
adb uninstall com.example.myapplication
echo.

echo Step 2: Installing new APK...
adb install app\build\outputs\apk\debug\app-debug.apk
echo.

echo ========================================
echo INSTALLATION COMPLETE!
echo ========================================
echo.
echo The app now has the BroadcastReceiver fix.
echo Open the app and test voice commands.
echo.
pause

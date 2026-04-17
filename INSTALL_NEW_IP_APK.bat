@echo off
echo ========================================
echo  Installing SenseSafe APK (New IP)
echo ========================================
echo.
echo New IP: 100.31.117.111:8000
echo Old IP: 100.31.117.111:8000
echo.
echo ========================================
echo.

echo Step 1: Uninstalling old APK...
adb uninstall com.example.myapplication
echo.

echo Step 2: Installing new APK...
adb install app\build\outputs\apk\debug\app-debug.apk
echo.

echo Step 3: Granting permissions...
adb shell pm grant com.example.myapplication android.permission.RECORD_AUDIO
adb shell pm grant com.example.myapplication android.permission.ACCESS_FINE_LOCATION
adb shell pm grant com.example.myapplication android.permission.CAMERA
adb shell pm grant com.example.myapplication android.permission.READ_MEDIA_IMAGES
adb shell pm grant com.example.myapplication android.permission.FOREGROUND_SERVICE_MICROPHONE
echo.

echo Step 4: Launching app...
adb shell am start -n com.example.myapplication/.MainActivity
echo.

echo ========================================
echo  Installation Complete!
echo ========================================
echo.
echo App is now running with:
echo - Backend: http://100.31.117.111:8000
echo - Voice-guided incident reporting
echo - Auto-category detection
echo - Auto-location fetch
echo.
echo Test voice commands:
echo 1. Say: "report incident"
echo 2. Say: "fire"
echo 3. Say: "smoke from building"
echo 4. Say: "submit report"
echo.
pause

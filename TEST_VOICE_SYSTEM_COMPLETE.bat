@echo off
echo ========================================
echo VOICE SYSTEM COMPLETE TEST
echo ========================================
echo.

echo This will test the COMPLETE voice system end-to-end:
echo   1. Speech recognition
echo   2. Command processing
echo   3. Action execution
echo   4. Backend API calls
echo   5. TTS feedback
echo   6. Navigation
echo.

echo Step 1: Clear logs
adb logcat -c
echo.

echo Step 2: Start logging
echo Starting log capture... (Press Ctrl+C to stop)
echo.
echo INSTRUCTIONS:
echo   1. Open the app on your phone
echo   2. Select "Blind" mode
echo   3. Say "scan" - Camera should open
echo   4. Say "sos" - SOS should be sent
echo   5. Watch the logs below
echo.
echo ========================================
echo LOGS:
echo ========================================
adb logcat | findstr /C:"MainActivity" /C:"BlindVoiceService" /C:"CommandProcessor" /C:"SOS_REQUEST" /C:"SOSViewModel"

@echo off
echo ========================================
echo GRANTING ALL PERMISSIONS
echo ========================================
echo.

echo Granting RECORD_AUDIO permission...
adb shell pm grant com.example.myapplication android.permission.RECORD_AUDIO

echo Granting CAMERA permission...
adb shell pm grant com.example.myapplication android.permission.CAMERA

echo Granting ACCESS_FINE_LOCATION permission...
adb shell pm grant com.example.myapplication android.permission.ACCESS_FINE_LOCATION

echo Granting ACCESS_COARSE_LOCATION permission...
adb shell pm grant com.example.myapplication android.permission.ACCESS_COARSE_LOCATION

echo Granting READ_MEDIA_IMAGES permission...
adb shell pm grant com.example.myapplication android.permission.READ_MEDIA_IMAGES

echo Granting POST_NOTIFICATIONS permission...
adb shell pm grant com.example.myapplication android.permission.POST_NOTIFICATIONS

echo.
echo ========================================
echo ALL PERMISSIONS GRANTED!
echo ========================================
echo.
echo Now open the app and test voice commands.
echo.
pause

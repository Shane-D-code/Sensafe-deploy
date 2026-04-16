# SOS Double Request Fix - COMPLETED ✅

## Issue Summary
- First SOS API call: 201 Created ✓
- Second automatic SOS call: 422 Unprocessable Entity ✗

## Root Causes Identified
1. **LocationCallback fires multiple times** - `requestLocationUpdates()` can receive multiple location results
2. **No idempotency guard** - ViewModel has no flag to prevent duplicate API calls
3. **Silent exit on null location** - If `lastLocation` is null, callback exits without cleanup
4. **JSON logging needed** - Need to see what's being sent in the request

## Fix Plan - COMPLETED
- [x] Analyze codebase and identify root causes
- [x] Add idempotency guard in SOSViewModel
- [x] Add JSON logging for outgoing requests
- [x] Fix location callback cleanup logic
- [x] Update MainScreen to call resetState() after dialog dismissal

## Files Modified
1. `app/src/main/java/com/example/myapplication/viewmodel/SOSViewModel.kt`
2. `app/src/main/java/com/example/myapplication/ui/MainScreen.kt`

## Key Changes Made

### 1. Idempotency Guard ✅
```kotlin
private var isSendingSOS = false

fun sendSOS(status: SOSStatus) {
    if (isSendingSOS) {
        Log.w("SOSViewModel", "SOS already in progress, ignoring duplicate call")
        return
    }
    isSendingSOS = true
    // ... rest of implementation
    finally {
        isSendingSOS = false  // Reset after completion
    }
}
```

### 2. JSON Logging ✅
```kotlin
val gson = Gson()
val jsonPayload = gson.toJson(sosRequest)
Log.d("SOS_REQUEST", "=== OUTGOING SOS REQUEST ===")
Log.d("SOS_REQUEST", "JSON Payload: $jsonPayload")
Log.d("SOS_REQUEST", "ability: ${sosRequest.ability}")
Log.d("SOS_REQUEST", "lat: ${sosRequest.lat}")
Log.d("SOS_REQUEST", "lng: ${sosRequest.lng}")
Log.d("SOS_REQUEST", "battery: ${sosRequest.battery}")
Log.d("SOS_REQUEST", "status: ${sosRequest.status}")
Log.d("SOS_REQUEST", "============================")
```

### 3. Fixed Location Callback Cleanup ✅
```kotlin
val locationCallback = object : LocationCallback() {
    override fun onLocationResult(locationResult: LocationResult) {
        // CLEANUP: Immediately remove updates to prevent multiple calls
        fusedLocationClient.removeLocationUpdates(this)
        
        val location = locationResult.lastLocation
        if (location == null) {
            Log.e("SOSViewModel", "Location result was null")
            _sosState.value = SOSState.Error("Could not get current location")
            isSendingSOS = false
            return
        }
        // ... rest of implementation
    }
}

// Only request ONE location update
locationRequest.setMaxUpdates(1)
```

### 4. Safety Timeout ✅
```kotlin
// Safety timeout - reset guard if no location received within 30 seconds
viewModelScope.launch {
    kotlinx.coroutines.delay(30000)
    if (isSendingSOS) {
        Log.w("SOSViewModel", "Safety timeout reached, resetting SOS guard")
        isSendingSOS = false
        if (_sosState.value is SOSState.Loading) {
            _sosState.value = SOSState.Error("Location request timed out")
        }
    }
}
```

## How to Debug
Check Logcat for these tags:
- `SOSViewModel` - General SOS lifecycle logs
- `SOS_REQUEST` - JSON payload of outgoing SOS requests

Example log output:
```
D/SOSViewModel: Starting SOS request with status: NEED_HELP
D/SOSViewModel: Got location: 37.4219983, -122.084
D/SOS_REQUEST: === OUTGOING SOS REQUEST ===
D/SOS_REQUEST: JSON Payload: {"ability":"LOW_VISION","lat":37.4219983,"lng":-122.084,"battery":80,"status":"NEED_HELP"}
D/SOS_REQUEST: ability: LOW_VISION
D/SOS_REQUEST: lat: 37.4219983
D/SOS_REQUEST: lng: -122.084
D/SOS_REQUEST: battery: 80
D/SOS_REQUEST: status: NEED_HELP
D/SOS_REQUEST: ============================
D/SOSViewModel: SOS sent successfully! ID: 123e4567-e89b-12d3-a456-426614174000
```

## Why This Fixes the 422 Error
The 422 error occurs when the backend receives invalid data. With JSON logging, you can:
1. See exactly what JSON is being sent
2. Verify enum values match backend expectations (e.g., "LOW_VISION", not "LowVision")
3. Identify any malformed data before sending

## Expected Behavior After Fix
- Only ONE API call will be made when SOS is triggered
- The idempotency guard prevents accidental double-taps
- Location updates are cleaned up immediately after first fix
- JSON logging helps debug any remaining issues


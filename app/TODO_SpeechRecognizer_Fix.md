# Speech Recognizer Fix - TODO List

## Objective
Fix SpeechRecognizer error 13 (ERROR_SPEECH_TIMEOUT) and implement auto-restart logic.

## Changes Required

### 1. VoiceViewModel.kt - Core Fixes
- [x] Add speech timeout configuration extras to intent
- [x] Add restartListening() with delay after timeout errors
- [x] Add crash-safe wrapper for SpeechRecognizer operations
- [x] Add retry counter to prevent infinite loops
- [x] Update error handling to auto-restart on error 13

### 2. Changes Explanation
- `EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS`: Sets how long of silence to wait before considering speech complete (5000ms)
- `EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS`: Sets silence length for potentially complete speech (3000ms)
- `EXTRA_SPEECH_INPUT_MINIMUM_LENGTH_MILLIS`: Minimum utterance length (3000ms)
- `restartListening()`: Auto-restarts listening after timeout with exponential backoff
- Retry counter: Prevents infinite restart loops (max 3 retries before requiring manual restart)

## Implementation Progress
- [x] Implement fixes in VoiceViewModel.kt
- [ ] Test speech recognition behavior
- [ ] Verify auto-restart works correctly

## Fix Summary (Completed)

### File Modified: `app/src/main/java/com/example/myapplication/viewmodel/VoiceViewModel.kt`

**Changes Made:**

1. **Added retry tracking variables:**
   - `retryCount = 0` - tracks number of auto-restart attempts
   - `maxRetries = 3` - maximum retries before requiring manual restart
   - `isAutoRestartEnabled = true` - toggle for auto-restart feature

2. **Updated `onError()` callback:**
   - Detects ERROR_SPEECH_TIMEOUT (13) and ERROR_NO_MATCH (7)
   - Auto-restarts listening after 1.5 second delay
   - Respects max retries to prevent infinite loops
   - Announces "Too many attempts" after max retries reached

3. **Added speech timeout configuration in `startListening()`:**
   - `EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS = 5000` (5 seconds)
   - `EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS = 3000` (3 seconds)
   - `EXTRA_SPEECH_INPUT_MINIMUM_LENGTH_MILLIS = 3000` (3 seconds minimum)

4. **Added `restartListening()` function:**
   - Resets state and retry count
   - Starts new listening session

5. **Added helper methods:**
   - `setAutoRestartEnabled(Boolean)` - toggle auto-restart
   - `getRetryCount()` - debugging helper

6. **Reset retry count on successful recognition in `onResults()`**

### Why Each Change is Needed:

| Change | Why |
|--------|-----|
| Silence length extras | Default timeout is too short; 5s silence gives users more time |
| Auto-restart | Error 13 shouldn't stop the app; user should stay in listening mode |
| Retry counter | Prevents infinite restart loops if microphone is blocked |
| Partial results (already set) | Provides real-time feedback to user |


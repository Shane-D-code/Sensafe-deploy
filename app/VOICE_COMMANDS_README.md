# Voice Commands Implementation - SenseSafe Android App

This document explains the voice commands feature implemented using Android's native `SpeechRecognizer` (not Azure).

---

## 📁 File Structure

### New Files Created

| File | Location | Purpose |
|------|----------|---------|
| `VoiceViewModel.kt` | `app/src/main/java/com/example/myapplication/viewmodel/` | MVVM ViewModel managing voice state, command processing, and actions |

### Updated Files

| File | Location | Changes |
|------|----------|---------|
| `VoiceCommandScreen.kt` | `app/src/main/java/com/example/myapplication/ui/screens/` | Added permission handling, VoiceViewModel integration, navigation callbacks |
| `MainAppNavGraph.kt` | `app/src/main/java/com/example/myapplication/ui/` | Added navigation callbacks for all voice commands |
| `ReportIncidentScreen.kt` | `app/src/main/java/com/example/myapplication/ui/` | Added support for voice-provided incident descriptions |

---

## 🎤 Supported Voice Commands

| Command | Action | Example |
|---------|--------|---------|
| **"open scan"** | Navigate to Camera/Scan screen | "Open scan" / "Scan area" / "Look around" |
| **"send sos"** | Trigger SOS emergency flow | "Send SOS" / "Emergency" / "Help me" |
| **"show alerts"** | Open Alerts screen | "Show alerts" / "View alerts" / "Check alerts" |
| **"back home"** | Navigate to Home screen | "Back home" / "Go home" / "Main menu" |
| **"send incident [description]"** | Report incident with voice | "Send incident there is a fire" |

---

## 🔧 Implementation Details

### 1. VoiceViewModel.kt

**Key Components:**

```kotlin
// States managed
sealed class ListeningState {
    data object Idle : ListeningState()
    data object Listening : ListeningState()
    data object Processing : ListeningState()
    data class Error(val message: String) : ListeningState()
}

sealed class VoiceAction {
    data object NavigateToScan : VoiceAction()
    data object TriggerSOS : VoiceAction()
    data object ShowAlerts : VoiceAction()
    data object NavigateToHome : VoiceAction()
    data class ReportIncident(val description: String) : VoiceAction()
}

// Navigation callbacks (set by UI)
var onNavigateToScan: (() -> Unit)? = null
var onTriggerSOS: ((SOSStatus) -> Unit)? = null
var onShowAlerts: (() -> Unit)? = null
var onNavigateToHome: (() -> Unit)? = null
var onReportIncident: ((String) -> Unit)? = null
```

**Key Methods:**

| Method | Purpose |
|--------|---------|
| `startListening(languageCode)` | Starts speech recognition |
| `stopListening()` | Stops speech recognition |
| `resetState()` | Resets all state |
| `isSpeechRecognizerAvailable()` | Checks if device supports speech recognition |
| `getSupportedCommands()` | Returns list of supported commands |

---

### 2. VoiceCommandScreen.kt

**Features:**
- Microphone button with pulse animation
- Real-time status indicator (Listening, Processing, Error)
- Permission handling with Accompanist library
- Command display with "Heard:" feedback
- List of supported commands for user reference

**Permission Handling:**
```kotlin
val micPermissionState = rememberPermissionState(
    android.Manifest.permission.RECORD_AUDIO
)
```

---

### 3. MainAppNavGraph.kt

**Navigation Flow:**

```
VoiceCommandScreen
├── "open scan" → camera screen
├── "send sos" → main screen + trigger SOS
├── "show alerts" → alert screen
├── "back home" → main screen
└── "send incident [desc]" → reportIncident screen (with description)
```

---

### 4. ReportIncidentScreen.kt

**Voice Description Handling:**

When user says "send incident [description]", the description is:
1. Passed via `savedStateHandle` during navigation
2. Auto-populated in the description field
3. User can edit before submitting

```kotlin
LaunchedEffect(Unit) {
    val voiceDescription = savedStateHandle?.get<String>("voiceIncidentDescription")
    if (voiceDescription != null && description.isEmpty()) {
        viewModel.updateDescription(voiceDescription)
    }
}
```

---

## 📝 AndroidManifest.xml Changes

**NO CHANGES NEEDED** - The `RECORD_AUDIO` permission is already configured:

```xml
<!-- Already present in AndroidManifest.xml -->
<uses-permission android:name="android.permission.RECORD_AUDIO" />
```

---

## 🚨 Error Handling

| Error Type | Message | User Feedback |
|------------|---------|---------------|
| Network Error | "No internet connection" | TTS announcement |
| No Match | "Could not understand" | TTS announcement |
| Timeout | "No speech detected" | TTS announcement |
| Speech Recognizer Busy | "Recognition service busy" | TTS announcement |
| No Permissions | "Microphone permission not granted" | Permission dialog |
| Not Available | "Speech recognition not available" | Warning UI shown |

---

## 🔒 Permissions Required

| Permission | Reason | Status |
|------------|--------|--------|
| `RECORD_AUDIO` | To capture voice for speech recognition | ✅ Already configured |

---

## 🧪 Testing Checklist

- [ ] Test microphone permission request
- [ ] Test "open scan" command navigation
- [ ] Test "send sos" command triggers SOS dialog
- [ ] Test "show alerts" command opens alerts
- [ ] Test "back home" command returns to home
- [ ] Test "send incident" with description
- [ ] Test error handling (no network, no match)
- [ ] Verify TTS feedback works
- [ ] Verify accessibility announcements

---

## 📦 Dependencies

All required dependencies are already in `build.gradle.kts`:

```kotlin
// Already included
implementation(libs.com.google.accompanist.permissions)
implementation(libs.androidx.navigation.compose)
implementation(libs.androidx.lifecycle.runtime.ktx)
implementation(libs.androidx.lifecycle.viewmodel.compose)
```

---

## 💡 Usage from MainActivity

The voice command screen is already integrated into the navigation. Users can access it via:

1. **Main Screen** → "Voice Command" quick action card
2. **Direct Navigation** → `navController.navigate("voiceCommand")`

---

## 🔄 Command Recognition Flow

```
1. User taps microphone button
   ↓
2. Request RECORD_AUDIO permission (if needed)
   ↓
3. Start SpeechRecognizer
   ↓
4. User speaks command
   ↓
5. SpeechRecognizer returns results
   ↓
6. VoiceViewModel normalizes and matches command
   ↓
7. Execute corresponding VoiceAction
   ↓
8. Trigger navigation callback
```

---

## 📞 SOS Flow with Voice

When user says **"send sos"**:

1. VoiceViewModel triggers `onTriggerSOS` callback
2. Navigates back to Main screen
3. Opens SOS status selection dialog
4. User selects status (I_NEED_HELP, IM_TRAPPED, etc.)
5. SOS is sent with location

---

## 🏠 Incident Reporting with Voice

When user says **"send incident there is a fire"**:

1. VoiceViewModel extracts description: "there is a fire"
2. Navigates to ReportIncidentScreen
3. Description field auto-populates with "there is a fire"
4. User can edit/confirm description
5. User selects category and submits
6. Incident is reported to backend

---

## 📱 Device Compatibility

SpeechRecognizer requires:
- Android API 8+ (our minSdk is 26)
- Device must have speech recognition capability

The implementation includes a check:
```kotlin
fun isSpeechRecognizerAvailable(): Boolean {
    return speechRecognizer != null
}
```

If not available, a warning is shown in the UI.

---

## 🎨 UI States

| State | Icon | Color | Text |
|-------|------|-------|------|
| Idle | 🎤 Mic | Primary | "Tap to speak" |
| Listening | 🎤 Mic | Red | "Listening... Say a command" |
| Processing | ⏳ Hourglass | Secondary | "Processing..." |
| Error | ⚠️ Warning | Error | Error message |

---

## 📖 Additional Resources

- [Android SpeechRecognizer Documentation](https://developer.android.com/reference/android/speech/SpeechRecognizer)
- [Accompanist Permissions](https://google.github.io/accompanist/permissions/)


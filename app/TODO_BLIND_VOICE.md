# Blind Mode Full Voice Control - Implementation TODO
[x] Backend/frontend started (already running)

**Files Analyzed**: MainActivity.kt, VoiceCommandScreen.kt, MainAppNavGraph.kt, AccessibilityManager.kt, UserPreferencesRepository.kt, VoiceCommandManager.kt, VoiceViewModel.kt, HomeScreen.kt

**Information Gathered**:
- MVVM + Compose NavHost. AbilityType.BLIND in DataStore.
- Button STT in VoiceCommandScreen (RecognizerIntent).
- AccessibilityManager: TTS ready, add vibration.
- No continuous service, screen-specific.

**Progress**:
- [x] Created BlindVoiceService.kt (Foreground continuous STT with wakeword)
- [x] Created CommandProcessor.kt (synonyms, context parser)
- [x] Created BlindVoiceViewModel.kt (global command handler)
- [x] Updated MainActivity.kt (auto-start service on BLIND)
- [x] Updated AndroidManifest.xml (service + microphone type)
- [x] Updated MainAppNavGraph.kt (pass VM)

**Plan** (Step-by-step):
1. Create `services/BlindVoiceService.kt`: ForegroundService + continuous SpeechRecognizer, wakeword "Sensa".
2. `utils/CommandProcessor.kt`: Rule-based parser (synonyms/context), map to actions (nav, SOS).
3. Edit `MainActivity.kt`: Observe abilityType, start/stop service.
4. Edit `MainAppNavGraph.kt`: Global VoiceController observer, NavController listener for screen read.
5. Add `viewmodel/BlindVoiceViewModel.kt`: Global VM for commands.
6. Update UI: Auto TTS screen summary on change.
7. Permissions: RECORD_AUDIO, FOREGROUND_SERVICE.

**Dependent Files**:
- MainActivity.kt, MainAppNavGraph.kt, AndroidManifest.xml (service perm).
- build.gradle.kts (no new deps).

**Follow-up Steps**:
- ./gradlew build
- Test on device/emulator (audio).
- Commands: "Sensa send SOS", "Sensa scan area", "go home", "report fire".

Proceeding with Step 1-2 creation.

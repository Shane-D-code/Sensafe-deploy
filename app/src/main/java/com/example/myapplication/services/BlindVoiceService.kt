package com.example.myapplication.services

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.speech.tts.TextToSpeech
import android.util.Log
import androidx.core.app.NotificationCompat
import com.example.myapplication.MainActivity
import com.example.myapplication.R
import com.example.myapplication.model.SOSStatus
import com.example.myapplication.utils.CommandProcessor
import kotlinx.coroutines.MainScope
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.launch
import com.example.myapplication.voice.model.VoiceCommandEvent
import com.example.myapplication.voice.model.VoiceCommandResult
import java.util.Locale

class BlindVoiceService : Service(), TextToSpeech.OnInitListener {

    companion object {
        const val CHANNEL_ID = "BlindVoiceChannel"
        const val NOTIFICATION_ID = 1
        const val ACTION_START = "START_VOICE"
        const val ACTION_STOP = "STOP_VOICE"
        private const val TAG = "BlindVoiceService"
    }

    private val scope = MainScope()
    private lateinit var speechRecognizer: SpeechRecognizer
    private lateinit var commandProcessor: CommandProcessor
    private lateinit var tts: TextToSpeech
    private var isListening = false
    private var isTtsReady = false

    // Public flow for UI to observe voice commands
    val commandFlow = MutableSharedFlow<VoiceCommandEvent>()

    override fun onCreate() {
        super.onCreate()
        Log.d(TAG, "Service created")
        createNotificationChannel()
        speechRecognizer = SpeechRecognizer.createSpeechRecognizer(this)
        commandProcessor = CommandProcessor()
        tts = TextToSpeech(this, this)
        setupRecognitionListener()
    }

    override fun onInit(status: Int) {
        if (status == TextToSpeech.SUCCESS) {
            val result = tts.setLanguage(Locale.US)
            isTtsReady = result != TextToSpeech.LANG_MISSING_DATA && result != TextToSpeech.LANG_NOT_SUPPORTED
            if (isTtsReady) {
                Log.d(TAG, "TTS initialized successfully")
                speak("Voice assistant activated. Say your command.")
            }
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_START -> {
                Log.d(TAG, "Starting voice service")
                startForeground(NOTIFICATION_ID, createNotification())
                speak("Voice assistant starting. Listening for commands.")
                startListening()
            }
            ACTION_STOP -> {
                Log.d(TAG, "Stopping voice service")
                stopListening()
                stopForeground(STOP_FOREGROUND_REMOVE)
                stopSelf()
            }
        }
        return START_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private fun setupRecognitionListener() {
        speechRecognizer.setRecognitionListener(object : RecognitionListener {
            override fun onReadyForSpeech(params: android.os.Bundle?) {
                isListening = true
                Log.d(TAG, "Ready for speech")
            }
            
            override fun onBeginningOfSpeech() {
                Log.d(TAG, "Speech detected")
            }
            
            override fun onRmsChanged(rmsdB: Float) {}
            override fun onBufferReceived(buffer: ByteArray?) {}
            
            override fun onEndOfSpeech() {
                Log.d(TAG, "Speech ended")
            }
            
            override fun onError(error: Int) {
                isListening = false
                val errorMsg = when (error) {
                    SpeechRecognizer.ERROR_AUDIO -> "Audio error"
                    SpeechRecognizer.ERROR_CLIENT -> "Client error"
                    SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS -> "Insufficient permissions"
                    SpeechRecognizer.ERROR_NETWORK -> "Network error"
                    SpeechRecognizer.ERROR_NETWORK_TIMEOUT -> "Network timeout"
                    SpeechRecognizer.ERROR_NO_MATCH -> "No match"
                    SpeechRecognizer.ERROR_RECOGNIZER_BUSY -> "Recognizer busy"
                    SpeechRecognizer.ERROR_SERVER -> "Server error"
                    SpeechRecognizer.ERROR_SPEECH_TIMEOUT -> "Speech timeout"
                    else -> "Unknown error"
                }
                Log.e(TAG, "Recognition error: $errorMsg ($error)")
                
                // Don't restart on NO_MATCH - just continue listening
                if (error != SpeechRecognizer.ERROR_NO_MATCH) {
                    scope.launch {
                        kotlinx.coroutines.delay(1000) // Wait 1 second before restarting
                        startListening()
                    }
                } else {
                    // Immediately restart for no match
                    scope.launch {
                        startListening()
                    }
                }
            }
            
            override fun onResults(results: android.os.Bundle?) {
                isListening = false
                val matches = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                val text = matches?.firstOrNull()
                
                Log.d(TAG, "Recognition results: $matches")
                
                if (text != null) {
                    // Process command directly without wake word requirement
                    Log.d(TAG, "Processing command: $text")
                    speak("Processing: $text")
                    
                    val processed = commandProcessor.process(text.lowercase())
                    
                    scope.launch {
                        commandFlow.emit(VoiceCommandEvent.CommandProcessed(processed))
                        handleCommandResult(processed)
                    }
                }
                
                // Continue listening
                scope.launch {
                    kotlinx.coroutines.delay(500) // Small delay before restarting
                    startListening()
                }
            }
            
            override fun onPartialResults(partialResults: android.os.Bundle?) {
                val matches = partialResults?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                Log.d(TAG, "Partial results: $matches")
            }
            
            override fun onEvent(eventType: Int, params: android.os.Bundle?) {}
        })
    }

    private fun handleCommandResult(result: VoiceCommandResult) {
        when (result) {
            is VoiceCommandResult.SOS -> {
                speak("Sending S O S alert")
                Log.d(TAG, "SOS command detected")
                val intent = Intent("com.example.myapplication.ACTION_SEND_SOS")
                intent.setPackage(packageName)
                sendBroadcast(intent)
                Log.d(TAG, "Broadcast sent: ACTION_SEND_SOS")
            }
            is VoiceCommandResult.SOSWithStatus -> {
                speak("Setting S O S status to ${result.status}")
                Log.d(TAG, "SOS status command: ${result.status}")
                val intent = Intent("com.example.myapplication.ACTION_SET_SOS_STATUS")
                intent.putExtra("status", result.status.name)
                intent.setPackage(packageName)
                sendBroadcast(intent)
                Log.d(TAG, "Broadcast sent: ACTION_SET_SOS_STATUS")
            }
            is VoiceCommandResult.Navigate -> {
                speak("Navigating to ${result.destination}")
                Log.d(TAG, "Navigate command: ${result.destination}")
                val intent = Intent("com.example.myapplication.ACTION_NAVIGATE")
                intent.putExtra("destination", result.destination)
                intent.setPackage(packageName)
                sendBroadcast(intent)
                Log.d(TAG, "Broadcast sent: ACTION_NAVIGATE to ${result.destination}")
            }
            is VoiceCommandResult.ReportIncident -> {
                speak("Opening incident report")
                Log.d(TAG, "Report incident command")
                val intent = Intent("com.example.myapplication.ACTION_REPORT_INCIDENT")
                intent.putExtra("description", "" as String)
                intent.putExtra("category", null as String?)
                intent.setPackage(packageName)
                sendBroadcast(intent)
                Log.d(TAG, "Broadcast sent: ACTION_REPORT_INCIDENT")
            }
            is VoiceCommandResult.SelectCategory -> {
                speak("Category: ${result.category}")
                Log.d(TAG, "Category selected: ${result.category}")
                val intent = Intent("com.example.myapplication.ACTION_SELECT_CATEGORY")
                intent.putExtra("category", result.category)
                intent.setPackage(packageName)
                sendBroadcast(intent)
                Log.d(TAG, "Broadcast sent: ACTION_SELECT_CATEGORY")
            }
            is VoiceCommandResult.DescriptionInput -> {
                speak("Description recorded")
                Log.d(TAG, "Description input: ${result.description}")
                val intent = Intent("com.example.myapplication.ACTION_DESCRIPTION_INPUT")
                intent.putExtra("description", result.description)
                intent.setPackage(packageName)
                sendBroadcast(intent)
                Log.d(TAG, "Broadcast sent: ACTION_DESCRIPTION_INPUT")
            }
            is VoiceCommandResult.SubmitForm -> {
                speak("Submitting form")
                Log.d(TAG, "Submit form command")
                val intent = Intent("com.example.myapplication.ACTION_SUBMIT_FORM")
                intent.setPackage(packageName)
                sendBroadcast(intent)
                Log.d(TAG, "Broadcast sent: ACTION_SUBMIT_FORM")
            }
            is VoiceCommandResult.Unknown -> {
                speak("Command not recognized. Try saying: scan, S O S, timeline, or location")
                Log.d(TAG, "Unknown command")
            }
        }
    }

    private fun speak(text: String) {
        if (isTtsReady) {
            tts.speak(text, TextToSpeech.QUEUE_ADD, null, null)
        }
    }

    private fun startListening() {
        if (!isListening && SpeechRecognizer.isRecognitionAvailable(this)) {
            val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
                putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
                putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
                putExtra(RecognizerIntent.EXTRA_CALLING_PACKAGE, packageName)
                putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 5)
                putExtra(RecognizerIntent.EXTRA_LANGUAGE, "en-US")
            }
            try {
                speechRecognizer.startListening(intent)
                Log.d(TAG, "Started listening")
            } catch (e: Exception) {
                Log.e(TAG, "Error starting recognition", e)
            }
        } else {
            Log.w(TAG, "Cannot start listening: isListening=$isListening, available=${SpeechRecognizer.isRecognitionAvailable(this)}")
        }
    }

    private fun stopListening() {
        isListening = false
        try {
            speechRecognizer.stopListening()
            Log.d(TAG, "Stopped listening")
        } catch (e: Exception) {
            Log.e(TAG, "Error stopping recognition", e)
        }
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Blind Voice Assistant",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Continuous voice listening for blind mode"
            }
            val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            manager.createNotificationChannel(channel)
        }
    }

    private fun createNotification(): Notification {
        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        }
        val pendingIntent = PendingIntent.getActivity(
            this, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Voice Assistant Active")
            .setContentText("Listening for voice commands")
            .setSmallIcon(R.drawable.ic_launcher_foreground)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()
    }

    override fun onDestroy() {
        super.onDestroy()
        Log.d(TAG, "Service destroyed")
        stopListening()
        speechRecognizer.destroy()
        if (::tts.isInitialized) {
            tts.stop()
            tts.shutdown()
        }
    }
}

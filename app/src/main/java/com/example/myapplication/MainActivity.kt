package com.example.myapplication

import android.Manifest
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.util.Log
import androidx.activity.compose.setContent
import androidx.activity.viewModels
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.core.content.ContextCompat
import androidx.lifecycle.lifecycleScope
import androidx.navigation.NavHostController
import androidx.navigation.compose.rememberNavController
import kotlinx.coroutines.launch
import com.example.myapplication.accessibility.AccessibilityManager
import com.example.myapplication.model.AbilityType as AbilityProfile
import com.example.myapplication.model.SOSStatus
import com.example.myapplication.data.UserPreferencesRepository
import com.example.myapplication.ui.AlertScreen
import com.example.myapplication.ui.MainAppNavGraph
import com.example.myapplication.ui.theme.MyApplicationTheme
import com.example.myapplication.viewmodel.AlertViewModel
import com.example.myapplication.viewmodel.IncidentViewModel
import com.example.myapplication.viewmodel.SOSViewModel
import com.example.myapplication.viewmodel.ScanViewModel
import com.example.myapplication.viewmodel.ScanViewModelFactory
import com.example.myapplication.viewmodel.BlindVoiceViewModelFactory
import com.example.myapplication.viewmodel.BlindVoiceViewModel

class MainActivity : BaseActivity() {

    companion object {
        private const val TAG = "MainActivity"
    }

    private val sosViewModel: SOSViewModel by viewModels { ViewModelFactory(application) }
    private val alertViewModel: AlertViewModel by viewModels { ViewModelFactory(application) }
    private val incidentViewModel: IncidentViewModel by viewModels { ViewModelFactory(application) }
    private val scanViewModel: ScanViewModel by viewModels { ScanViewModelFactory(application) }
    
    private lateinit var accessibilityManager: AccessibilityManager
    private lateinit var blindVoiceViewModel: BlindVoiceViewModel
    private var navController: NavHostController? = null
    
    // BroadcastReceiver for voice commands
    private val voiceCommandReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            Log.d(TAG, "Received broadcast: ${intent?.action}")
            when (intent?.action) {
                "com.example.myapplication.ACTION_SEND_SOS" -> {
                    Log.d(TAG, "Executing SOS command")
                    lifecycleScope.launch {
                        sosViewModel.sendSOS(SOSStatus.NEED_HELP)
                        accessibilityManager.speak("S O S sent successfully")
                    }
                }
                "com.example.myapplication.ACTION_SET_SOS_STATUS" -> {
                    val statusName = intent.getStringExtra("status")
                    Log.d(TAG, "Setting SOS status: $statusName")
                    statusName?.let {
                        try {
                            val status = SOSStatus.valueOf(it)
                            lifecycleScope.launch {
                                sosViewModel.sendSOS(status)
                                accessibilityManager.speak("S O S status updated")
                            }
                        } catch (e: Exception) {
                            Log.e(TAG, "Invalid SOS status: $statusName", e)
                        }
                    }
                }
                "com.example.myapplication.ACTION_NAVIGATE" -> {
                    val destination = intent.getStringExtra("destination")
                    Log.d(TAG, "Navigating to: $destination")
                    destination?.let {
                        lifecycleScope.launch {
                            navigateToDestination(it)
                        }
                    }
                }
                "com.example.myapplication.ACTION_REPORT_INCIDENT" -> {
                    val description = intent.getStringExtra("description")
                    val category = intent.getStringExtra("category")
                    Log.d(TAG, "Reporting incident: $description, category: $category")
                    lifecycleScope.launch {
                        // Navigate first to ensure backStackEntry exists
                        navController?.navigate("reportIncident")
                        
                        // Then pass voice description via savedStateHandle
                        kotlinx.coroutines.delay(100) // Small delay to ensure navigation completes
                        if (!description.isNullOrBlank()) {
                            navController?.currentBackStackEntry?.savedStateHandle?.set("voiceIncidentDescription", description)
                            Log.d(TAG, "Set voice description: $description")
                        }
                        if (!category.isNullOrBlank()) {
                            navController?.currentBackStackEntry?.savedStateHandle?.set("voiceCategory", category)
                            Log.d(TAG, "Set voice category: $category")
                        }
                        
                        // Provide audio feedback
                        if (!description.isNullOrBlank()) {
                            accessibilityManager.speak("Opening incident report for: $description")
                        } else {
                            accessibilityManager.speak("Opening incident report")
                        }
                    }
                }
                "com.example.myapplication.ACTION_SELECT_CATEGORY" -> {
                    val category = intent.getStringExtra("category")
                    Log.d(TAG, "Category selected: $category")
                    lifecycleScope.launch {
                        navController?.currentBackStackEntry?.savedStateHandle?.set("voiceCategory", category)
                        accessibilityManager.speak("Category set to $category")
                    }
                }
                "com.example.myapplication.ACTION_DESCRIPTION_INPUT" -> {
                    val description = intent.getStringExtra("description")
                    Log.d(TAG, "Description input: $description")
                    lifecycleScope.launch {
                        navController?.currentBackStackEntry?.savedStateHandle?.set("voiceIncidentDescription", description)
                        accessibilityManager.speak("Description recorded")
                    }
                }
                "com.example.myapplication.ACTION_SUBMIT_FORM" -> {
                    Log.d(TAG, "Submit form command received")
                    lifecycleScope.launch {
                        // Trigger form submission via savedStateHandle
                        navController?.currentBackStackEntry?.savedStateHandle?.set("voiceSubmitForm", true)
                        accessibilityManager.speak("Submitting incident report")
                    }
                }
            }
        }
    }
    
    private fun hasRequiredPermissions(): Boolean {
        val recordAudio = ContextCompat.checkSelfPermission(
            this,
            Manifest.permission.RECORD_AUDIO
        ) == PackageManager.PERMISSION_GRANTED
        
        Log.d(TAG, "RECORD_AUDIO permission: $recordAudio")
        return recordAudio
    }
    
    private fun navigateToDestination(destination: String) {
        Log.d(TAG, "Navigating to destination: $destination")
        navController?.let { nav ->
            when (destination.lowercase()) {
                "camera", "scan" -> {
                    nav.navigate("camera")
                    accessibilityManager.speak("Opening camera for scanning")
                }
                "home", "main" -> {
                    nav.navigate("main") {
                        popUpTo("main") { inclusive = true }
                    }
                    accessibilityManager.speak("Going to home screen")
                }
                "timeline", "history" -> {
                    nav.navigate("timeline")
                    accessibilityManager.speak("Opening timeline")
                }
                "location" -> {
                    nav.navigate("trackLocation")
                    accessibilityManager.speak("Opening location tracker")
                }
                else -> {
                    Log.w(TAG, "Unknown destination: $destination")
                    accessibilityManager.speak("Unknown destination")
                }
            }
        } ?: run {
            Log.e(TAG, "NavController is null, cannot navigate")
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Initialize accessibility manager for vibration and TTS
        accessibilityManager = AccessibilityManager(this)
        
        // Register BroadcastReceiver for voice commands
        registerVoiceCommandReceiver()
        
        // Observe user ability and start blind voice service if BLIND
        val userPreferencesRepository = UserPreferencesRepository(applicationContext)
        lifecycleScope.launch {
            userPreferencesRepository.abilityType.collect { abilityType ->
                val factory = BlindVoiceViewModelFactory(application, accessibilityManager)
                blindVoiceViewModel = factory.create(BlindVoiceViewModel::class.java)
                if (abilityType == AbilityProfile.BLIND) {
                    // Check permissions before starting service
                    if (hasRequiredPermissions()) {
                        Log.d(TAG, "Permissions granted, starting voice service")
                        blindVoiceViewModel.startVoiceService()
                    } else {
                        Log.w(TAG, "Permissions not granted, cannot start voice service")
                        accessibilityManager.speak("Please grant microphone permission in settings to use voice commands")
                    }
                } else {
                    // Stop service if ability is not BLIND
                    blindVoiceViewModel.stopVoiceService()
                }
            }
        }
        
        // Speak welcome message
        accessibilityManager.speak(getString(R.string.welcome_message))

        // Restore auth token to RetrofitClient
        lifecycleScope.launch {
            userPreferencesRepository.authToken.collect { token ->
                if (token != null) {
                    com.example.myapplication.network.RetrofitClient.setAuthToken(token)
                }
            }
        }

        setContent {
            MyApplicationTheme {
                val userAbilityType by userPreferencesRepository.abilityType.collectAsState(initial = null)
                val alert by alertViewModel.alertState.collectAsState()
                
                // Store navController reference for voice commands
                navController = rememberNavController()

                if (alert != null && userAbilityType != null) {
                    AlertScreen(alert = alert!!, userAbilityType = userAbilityType!!)
                } else {
                    MainAppNavGraph(
                        sosViewModel = sosViewModel,
                        alertViewModel = alertViewModel,
                        incidentViewModel = incidentViewModel,
                        scanViewModel = scanViewModel,
                        accessibilityManager = accessibilityManager,
                        blindVoiceViewModel = blindVoiceViewModel,
                        navController = navController!!
                    )
                }
            }
        }
    }
    
    private fun registerVoiceCommandReceiver() {
        val filter = IntentFilter().apply {
            addAction("com.example.myapplication.ACTION_SEND_SOS")
            addAction("com.example.myapplication.ACTION_SET_SOS_STATUS")
            addAction("com.example.myapplication.ACTION_NAVIGATE")
            addAction("com.example.myapplication.ACTION_REPORT_INCIDENT")
            addAction("com.example.myapplication.ACTION_SELECT_CATEGORY")
            addAction("com.example.myapplication.ACTION_DESCRIPTION_INPUT")
            addAction("com.example.myapplication.ACTION_SUBMIT_FORM")
        }
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(voiceCommandReceiver, filter, Context.RECEIVER_NOT_EXPORTED)
        } else {
            registerReceiver(voiceCommandReceiver, filter)
        }
        
        Log.d(TAG, "Voice command receiver registered")
    }

    override fun onDestroy() {
        super.onDestroy()
        
        // Stop voice service when app is closed
        try {
            if (::blindVoiceViewModel.isInitialized) {
                Log.d(TAG, "Stopping voice service - app is closing")
                blindVoiceViewModel.stopVoiceService()
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error stopping voice service", e)
        }
        
        // Unregister broadcast receiver
        try {
            unregisterReceiver(voiceCommandReceiver)
            Log.d(TAG, "Voice command receiver unregistered")
        } catch (e: Exception) {
            Log.e(TAG, "Error unregistering receiver", e)
        }
        
        // Shutdown accessibility manager
        accessibilityManager.shutdown()
    }
}

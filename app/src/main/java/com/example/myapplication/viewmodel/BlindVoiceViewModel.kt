package com.example.myapplication.viewmodel

import android.content.Context
import android.content.Intent
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.example.myapplication.accessibility.AccessibilityManager
import com.example.myapplication.model.SOSStatus
import com.example.myapplication.services.BlindVoiceService
import com.example.myapplication.voice.model.VoiceCommandEvent
import com.example.myapplication.voice.model.VoiceCommandResult
import com.example.myapplication.utils.CommandProcessor
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch

class BlindVoiceViewModel(
    private val context: Context,
    private val accessibilityManager: AccessibilityManager? = null
) : ViewModel() {

    private val commandProcessor = CommandProcessor()

    private val _commands = MutableStateFlow<List<String>>(emptyList())
    val commands: StateFlow<List<String>> = _commands.asStateFlow()

    private val _isListening = MutableStateFlow(false)
    val isListening: StateFlow<Boolean> = _isListening.asStateFlow()

    private var sosViewModel: SOSViewModel? = null
    private var navControllerCallback: ((String) -> Unit)? = null
    private var reportIncidentCallback: ((String) -> Unit)? = null

    fun bindSOSViewModel(viewModel: SOSViewModel) {
        sosViewModel = viewModel
    }

    fun setNavCallback(callback: (String) -> Unit) {
        navControllerCallback = callback
    }

    fun setReportIncidentCallback(callback: (String) -> Unit) {
        reportIncidentCallback = callback
    }

    fun observeServiceCommands(): Flow<VoiceCommandEvent> = callbackFlow {
        // Service connection logic would go here
        // For now, simulate commands
        send(VoiceCommandEvent.Navigate("camera"))
        awaitClose()
    }

    fun toggleListening() {
        _isListening.value = !_isListening.value
        if (_isListening.value) {
            accessibilityManager?.speak("Listening for voice commands")
        }
    }

    fun processCommand(text: String, currentScreen: String = "GLOBAL") {
        viewModelScope.launch {
            val result = commandProcessor.process(text, currentScreen)
            handleCommandResult(result)
        }
    }

    private fun handleCommandResult(result: VoiceCommandResult) {
        when (result) {
            is VoiceCommandResult.Navigate -> {
                navControllerCallback?.invoke(result.destination)
                accessibilityManager?.speak("Navigating to ${result.destination}")
            }
            is VoiceCommandResult.SOS -> {
                sosViewModel?.sendSOS(SOSStatus.NEED_HELP)
                accessibilityManager?.speak("SOS sent")
            }
            is VoiceCommandResult.SOSWithStatus -> {
                sosViewModel?.sendSOS(result.status)
                accessibilityManager?.speak("SOS status set to ${result.status}")
            }
            is VoiceCommandResult.ReportIncident -> {
                reportIncidentCallback?.invoke(result.description)
                accessibilityManager?.speak("Reporting incident: ${result.description}")
            }
            is VoiceCommandResult.SelectCategory -> {
                accessibilityManager?.speak("Category: ${result.category}")
            }
            is VoiceCommandResult.DescriptionInput -> {
                accessibilityManager?.speak("Description recorded")
            }
            is VoiceCommandResult.SubmitForm -> {
                accessibilityManager?.speak("Submitting form")
            }
            is VoiceCommandResult.Unknown -> {
                accessibilityManager?.speak("Unknown command")
            }
        }
    }

    fun startVoiceService() {
        val intent = Intent(context, BlindVoiceService::class.java).apply {
            action = BlindVoiceService.ACTION_START
        }
        context.startForegroundService(intent)
    }

    fun stopVoiceService() {
        val intent = Intent(context, BlindVoiceService::class.java).apply {
            action = BlindVoiceService.ACTION_STOP
        }
        context.stopService(intent)
    }

    class Factory(
        private val context: Context,
        private val accessibilityManager: AccessibilityManager?
    ) : ViewModelProvider.Factory {
        @Suppress("UNCHECKED_CAST")
        override fun <T : ViewModel> create(modelClass: Class<T>): T {
            if (modelClass.isAssignableFrom(BlindVoiceViewModel::class.java)) {
                return BlindVoiceViewModel(context, accessibilityManager) as T
            }
            throw IllegalArgumentException("Unknown ViewModel class")
        }
    }
}

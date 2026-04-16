package com.example.myapplication.voice.model

import com.example.myapplication.model.SOSStatus

/**
 * Single source of truth for voice command types
 */
sealed class VoiceCommandResult {
    data object SOS : VoiceCommandResult()
    data class SOSWithStatus(val status: SOSStatus) : VoiceCommandResult()
    data class Navigate(val destination: String) : VoiceCommandResult()
    data class ReportIncident(val description: String, val category: String? = null) : VoiceCommandResult()
    data class SelectCategory(val category: String) : VoiceCommandResult()
    data class DescriptionInput(val description: String) : VoiceCommandResult()
    data object SubmitForm : VoiceCommandResult()
    data object Unknown : VoiceCommandResult()
}

sealed class VoiceCommandEvent {
    data class CommandProcessed(val result: VoiceCommandResult) : VoiceCommandEvent()
    data class Navigate(val destination: String) : VoiceCommandEvent()
    data object SendSOS : VoiceCommandEvent()
    data class ReportIncident(val description: String) : VoiceCommandEvent()
    data class Unknown(val text: String) : VoiceCommandEvent()
}

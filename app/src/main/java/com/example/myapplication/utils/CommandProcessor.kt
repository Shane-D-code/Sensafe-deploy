package com.example.myapplication.utils

import android.util.Log
import com.example.myapplication.model.SOSStatus as ModelSOSStatus
import com.example.myapplication.voice.model.VoiceCommandResult

class CommandProcessor {

    private val globalCommands = mapOf(
        // SOS commands (including SMS/message fuzzy matching)
        "send sos" to "SEND_SOS",
        "sos" to "SEND_SOS",
        "emergency" to "SEND_SOS",
        "help" to "SEND_SOS",
        "help me" to "SEND_SOS",
        "send message" to "SEND_SOS",  // Fuzzy: maps to SOS
        "send sms" to "SEND_SOS",      // Fuzzy: maps to SOS
        "send alert" to "SEND_SOS",    // Fuzzy: maps to SOS
        "alert" to "SEND_SOS",         // Fuzzy: maps to SOS
        
        // Camera/Scan commands
        "scan" to "NAV_CAMERA",
        "scan area" to "NAV_CAMERA",
        "camera" to "NAV_CAMERA",
        "look around" to "NAV_CAMERA",
        "check surroundings" to "NAV_CAMERA",
        "open camera" to "NAV_CAMERA",
        
        // Home/Main commands
        "go home" to "NAV_HOME",
        "home" to "NAV_HOME",
        "main screen" to "NAV_HOME",
        "main" to "NAV_HOME",
        "back" to "NAV_HOME",
        "cancel" to "NAV_HOME",
        "go back" to "NAV_HOME",
        
        // Timeline/History commands
        "timeline" to "NAV_TIMELINE",
        "history" to "NAV_TIMELINE",
        "show timeline" to "NAV_TIMELINE",
        
        // Location commands
        "location" to "NAV_LOCATION",
        "my location" to "NAV_LOCATION",
        "where am i" to "NAV_LOCATION",
        "show location" to "NAV_LOCATION",
        
        // Incident commands
        "report incident" to "REPORT_INCIDENT",
        "report" to "REPORT_INCIDENT",
        "incident" to "REPORT_INCIDENT",
        
        // Form submission commands
        "submit report" to "SUBMIT_FORM",
        "send report" to "SUBMIT_FORM",
        "submit" to "SUBMIT_FORM",
        "send" to "SUBMIT_FORM",
        "confirm" to "SUBMIT_FORM"
    )
    
    private val categoryCommands = mapOf(
        "fire" to "Fire",
        "flood" to "Flood",
        "earthquake" to "Earthquake",
        "medical" to "Medical",
        "accident" to "Accident",
        "other" to "Other"
    )

    private val sosContextCommands = mapOf(
        "trapped" to ModelSOSStatus.TRAPPED,
        "need help" to ModelSOSStatus.NEED_HELP,
        "safe" to ModelSOSStatus.SAFE
    )

    private val incidentContextCommands = mapOf(
        "fire" to "fire",
        "accident" to "accident",
        "flood" to "flood",
        "medical" to "medical"
    )

    fun process(text: String, currentScreen: String = "GLOBAL"): VoiceCommandResult {
        val lowerText = text.lowercase().trim()
        Log.d("CommandProcessor", "Processing: '$lowerText' on screen: $currentScreen")

        return when (currentScreen) {
            "SOS" -> processSOSCommand(lowerText)
            "INCIDENT" -> processIncidentCommand(lowerText)
            else -> processGlobalCommand(lowerText)
        }
    }

    private fun processGlobalCommand(text: String): VoiceCommandResult {
        // Check for category selection first (for voice-guided mode)
        categoryCommands.forEach { (keyword, category) ->
            if (text == keyword || text.contains(keyword)) {
                Log.d("CommandProcessor", "Matched category: '$keyword' -> $category")
                return VoiceCommandResult.SelectCategory(category)
            }
        }
        
        // Sort commands by length (longest first) to match more specific commands first
        val sortedCommands = globalCommands.entries.sortedByDescending { it.key.length }
        
        sortedCommands.forEach { (command, action) ->
            if (text.contains(command)) {
                Log.d("CommandProcessor", "Matched command: '$command' -> $action")
                return when (action) {
                    "SEND_SOS" -> VoiceCommandResult.SOS
                    "NAV_CAMERA" -> VoiceCommandResult.Navigate("camera")
                    "NAV_HOME" -> VoiceCommandResult.Navigate("home")
                    "NAV_TIMELINE" -> VoiceCommandResult.Navigate("timeline")
                    "NAV_LOCATION" -> VoiceCommandResult.Navigate("location")
                    "REPORT_INCIDENT" -> VoiceCommandResult.ReportIncident("")
                    "SUBMIT_FORM" -> VoiceCommandResult.SubmitForm
                    else -> VoiceCommandResult.Unknown
                }
            }
        }
        
        // If no command matched, treat as description input
        Log.d("CommandProcessor", "No command matched, treating as description: '$text'")
        return VoiceCommandResult.DescriptionInput(text)
    }

    private fun processSOSCommand(text: String): VoiceCommandResult {
        sosContextCommands.forEach { (cmd, status) ->
            if (text.contains(cmd)) {
                return VoiceCommandResult.SOSWithStatus(status)
            }
        }
        return VoiceCommandResult.Unknown
    }

    private fun processIncidentCommand(text: String): VoiceCommandResult {
        val description = extractDescription(text)
        val category = incidentContextCommands.entries.find { (cmd, _) -> text.contains(cmd) }?.value ?: "general"
        return VoiceCommandResult.ReportIncident(description, category)
    }

    private fun extractDescription(text: String): String {
        // Remove the command trigger words first
        var cleanText = text
            .replace("report incident", "", ignoreCase = true)
            .replace("report", "", ignoreCase = true)
            .replace("incident", "", ignoreCase = true)
            .trim()
        
        // Extract description after keywords
        val keywords = listOf("about", "for", "say", "with", "of")
        keywords.forEach { keyword ->
            if (cleanText.contains(keyword, ignoreCase = true)) {
                cleanText = cleanText.substringAfter(keyword, "").trim()
            }
        }
        
        // If we have a description, return it; otherwise return the original text
        return if (cleanText.isNotBlank()) cleanText else text
    }
}

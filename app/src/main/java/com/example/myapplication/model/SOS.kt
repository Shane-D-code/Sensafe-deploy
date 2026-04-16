package com.example.myapplication.model

import java.util.Date

// Main SOS data class used by ViewModels
data class SOS(
    val userId: String?,
    val latitude: Double,
    val longitude: Double,
    val timestamp: Date,
    val status: SOSStatus,
    val batteryPercentage: Int,
    val abilityType: AbilityType
)

// Request sent to API (backend format)
data class SOSRequest(
    val ability: String,
    val lat: Double,
    val lng: Double,
    val battery: Int,
    val status: String
)

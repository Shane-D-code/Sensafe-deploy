package com.example.myapplication.model

import java.util.Date

data class SOSResponse(
    val id: String,
    val user_id: String?,
    val ability: String,
    val lat: Double,
    val lng: Double,
    val battery: Int,
    val status: String,
    val created_at: String
) {
    // Alias for sosId to maintain compatibility with ViewModels
    val sosId: String get() = id
}

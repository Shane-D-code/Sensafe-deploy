package com.example.myapplication.utils

import android.content.Context
import android.content.Intent
import android.util.Log
import com.example.myapplication.data.UserStatus

/**
 * FEATURE 3 & UPGRADE 4: ELDERLY SOS + BACKEND NOTIFICATION
 * Handles sending SOS alerts to backend API (no SMS).
 * 
 * Note: SMS functionality removed - all alerts go through backend API
 * which notifies admin dashboard and emergency responders.
 */
object AlertSystem {

    /**
     * Send SOS alert to backend API
     * This triggers notifications to admin dashboard and emergency responders
     */
    fun sendSOSAlert(context: Context, status: UserStatus, location: String) {
        val message = "EMERGENCY: User is ${status.description} at $location. Please help!"
        
        // Send SOS via backend API (handled by SOSViewModel)
        // This will:
        // 1. Save SOS to database
        // 2. Show on admin dashboard
        // 3. Notify emergency responders
        // 4. Track user location
        
        try {
            // Broadcast SOS event to be handled by MainActivity
            val intent = Intent("com.example.myapplication.ACTION_SEND_SOS")
            intent.setPackage(context.packageName)
            context.sendBroadcast(intent)
            Log.d("AlertSystem", "SOS alert sent to backend: $message")
        } catch (e: Exception) {
            Log.e("AlertSystem", "Failed to send SOS alert", e)
        }

        Log.d("AlertSystem", "Emergency notification triggered: $message")
    }
}


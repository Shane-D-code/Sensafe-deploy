package com.example.myapplication.utils

import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.BatteryManager
import android.util.Log

object DeviceUtils {

    // Get current battery level (0-100)
    fun getBatteryLevel(context: Context): Int {
        val batteryStatus: Intent? = IntentFilter(Intent.ACTION_BATTERY_CHANGED).let { ifilter ->
            context.registerReceiver(null, ifilter)
        }
        val level: Int = batteryStatus?.getIntExtra(BatteryManager.EXTRA_LEVEL, -1) ?: -1
        val scale: Int = batteryStatus?.getIntExtra(BatteryManager.EXTRA_SCALE, -1) ?: -1
        return if (level != -1 && scale != -1) {
            (level * 100 / scale.toFloat()).toInt()
        } else {
            50 // Default fallback
        }
    }

    /**
     * Send SOS alert (replaces SMS functionality)
     * All emergency alerts now go through backend API
     */
    fun sendSOSAlert(context: Context, message: String) {
        try {
            // Send SOS via backend API instead of SMS
            val intent = Intent("com.example.myapplication.ACTION_SEND_SOS")
            intent.setPackage(context.packageName)
            context.sendBroadcast(intent)
            Log.d("DeviceUtils", "SOS alert sent: $message")
        } catch (e: Exception) {
            Log.e("DeviceUtils", "Failed to send SOS alert", e)
        }
    }
}


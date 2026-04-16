package com.example.myapplication.workers

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.example.myapplication.data.DisasterPayload
import com.example.myapplication.model.SOSRequest
import com.example.myapplication.network.RetrofitClient
import com.google.gson.Gson

/**
 * 1️⃣ & 5️⃣ WorkManager for retries
 * Ensures rescue signals are sent even if the network fails initially.
 */
class RescueWorker(
    context: Context,
    workerParams: WorkerParameters
) : CoroutineWorker(context, workerParams) {

    override suspend fun doWork(): Result {
        val payloadJson = inputData.getString(KEY_PAYLOAD) ?: return Result.failure()

        return try {
            val payload = Gson().fromJson(payloadJson, DisasterPayload::class.java)
            // Convert SOS to SOSRequest for API call
            val sosRequest = SOSRequest(
                ability = payload.sos.abilityType.name,
                lat = payload.sos.latitude,
                lng = payload.sos.longitude,
                battery = payload.sos.batteryPercentage,
                status = payload.sos.status.name
            )
            RetrofitClient.instance.sendSOS(sosRequest)
            Result.success()
        } catch (e: Exception) {
            // Network error, retry
            Result.retry()
        }
    }

    companion object {
        const val KEY_PAYLOAD = "payload"
    }
}

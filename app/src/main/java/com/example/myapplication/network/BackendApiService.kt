package com.example.myapplication.network

import com.example.myapplication.model.BackendDetectionResponse
import okhttp3.MultipartBody
import retrofit2.http.Multipart
import retrofit2.http.POST
import retrofit2.http.Part

/**
 * Retrofit interface for Backend ML API
 * 
 * This service calls the centralized backend ML endpoint instead of
 * calling Roboflow APIs directly. This enables:
 * - Centralized API key management
 * - Scan history in database
 * - Admin dashboard visibility
 * - Analytics and monitoring
 * 
 * Backend Configuration:
 * - Base URL: http://100.31.117.111:8000 (configured in RetrofitClient)
 * - Endpoint: POST /api/roboflow/detect
 * - Format: multipart/form-data (image file upload)
 */
interface BackendApiService {
    /**
     * Detect exits by uploading image to backend ML endpoint.
     * 
     * The backend will:
     * 1. Receive the image
     * 2. Call all 4 Roboflow models
     * 3. Aggregate results
     * 4. Save scan to database
     * 5. Return combined detections
     * 
     * @param image Multipart image file (JPEG/PNG)
     * @return BackendDetectionResponse with all detections
     */
    @Multipart
    @POST("/api/roboflow/detect")
    suspend fun detectExits(
        @Part image: MultipartBody.Part
    ): BackendDetectionResponse
}

package com.example.myapplication.model

/**
 * Data models for Roboflow API communication
 */
data class RoboflowRequest(
    val api_key: String,
    val inputs: RoboflowInput
)

data class RoboflowInput(
    val image: RoboflowImage
)

data class RoboflowImage(
    val type: String = "base64",
    val value: String
)

data class RoboflowResponse(
    val predictions: List<RoboflowPrediction>? = null
)

data class RoboflowPrediction(
    val x: Float,
    val y: Float,
    val width: Float,
    val height: Float,
    val class_name: String? = null,
    val confidence: Float
)

/**
 * Response from backend ML API
 * 
 * This matches the response format from POST /api/roboflow/detect
 */
data class BackendDetectionResponse(
    val success: Boolean = true,
    val scan_id: String? = null,
    val detections: List<BackendDetection>,
    val total: Int,
    val severity: String? = null,
    val duration_ms: Int,
    val models_used: List<String>,
    val image_hash: String? = null,
    val warning: String? = null,
    val error: String? = null
)

/**
 * Single detection from backend (matches Roboflow prediction format)
 */
data class BackendDetection(
    val x: Float,
    val y: Float,
    val width: Float,
    val height: Float,
    val class_name: String? = null,
    val confidence: Float,
    val model: String  // Which model detected this (windows/doors/hallways/stairs)
)

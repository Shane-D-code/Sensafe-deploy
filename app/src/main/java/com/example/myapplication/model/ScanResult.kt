package com.example.myapplication.model

/**
 * Represents the result of an Azure Computer Vision scan analysis.
 * 
 * This data class contains detected objects, tags, and other visual features
 * identified from the captured image.
 * 
 * @property tags List of detected tags/labels from the image
 * @property objects List of detected objects in the image
 * @property description Human-readable description of the image content
 * @property confidence Overall confidence score of the analysis (0.0 - 1.0)
 * @property errorMessage Error message if the scan failed, null if successful
 */
data class ScanResult(
    val tags: List<String> = emptyList(),
    val objects: List<DetectedObject> = emptyList(),
    val description: String = "",
    val confidence: Float = 0f,
    val errorMessage: String? = null
) {
    /**
     * Check if the scan was successful
     */
    val isSuccess: Boolean
        get() = errorMessage == null && tags.isNotEmpty()

    /**
     * Get all detected items as a single list (tags + object names)
     */
    val allDetectedItems: List<String>
        get() = tags + objects.map { it.name }
}

/**
 * Represents a detected object in the image
 * 
 * @property name Name/category of the detected object
 * @property confidence Confidence score for the detection (0.0 - 1.0)
 * @property boundingBox Bounding box coordinates if available
 */
data class DetectedObject(
    val name: String,
    val confidence: Float,
    val boundingBox: BoundingBox? = null
)

/**
 * Represents bounding box coordinates for a detected object
 * 
 * @property x X coordinate of the top-left corner
 * @property y Y coordinate of the top-left corner
 * @property width Width of the bounding box
 * @property height Height of the bounding box
 */
data class BoundingBox(
    val x: Float,
    val y: Float,
    val width: Float,
    val height: Float
)

/**
 * UI State for the Scan feature
 * 
 * Sealed class representing all possible states of the scan operation:
 * - Idle: Ready to scan, camera preview active
 * - Loading: Image is being processed
 * - Success: Scan completed with results
 * - Error: Scan failed with an error message
 */
sealed class ScanUiState {
    data object Idle : ScanUiState()
    data object Loading : ScanUiState()
    data class Success(val result: ScanResult) : ScanUiState()
    data class Error(val message: String) : ScanUiState()
    data object NotConfigured : ScanUiState()
}


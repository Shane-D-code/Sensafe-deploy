package com.example.myapplication.viewmodel

import android.app.Application
import android.graphics.Bitmap
import android.util.Log
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.example.myapplication.model.ScanResult
import com.example.myapplication.model.ScanUiState
import com.example.myapplication.services.AzureVisionService
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

/**
 * ScanViewModel - Manages the Scan Area feature state and business logic
 * 
 * This ViewModel handles:
 * - UI state management (Idle, Loading, Success, Error, NotConfigured)
 * - Image capture and analysis via Azure Vision Service
 * - Error handling with user-friendly messages
 * - Configuration status checking
 * 
 * Architecture: Follows MVVM pattern consistent with existing project
 * 
 * State Flow:
 * - Idle: Camera preview active, ready to scan
 * - Loading: Image being processed by Azure
 * - Success: Results available for display
 * - Error: Something went wrong (user-friendly message)
 * - NotConfigured: Azure credentials missing
 * 
 * @property application Application context for initializing services
 */
class ScanViewModel(application: Application) : AndroidViewModel(application) {

    // ============================================================
    // SERVICES
    // ============================================================

    /**
     * Azure Vision Service for image analysis
     * Initialized lazily to ensure context is available
     */
    private val azureVisionService: AzureVisionService by lazy {
        AzureVisionService(application)
    }

    // ============================================================
    // UI STATE
    // ============================================================

    private val _uiState = MutableStateFlow<ScanUiState>(ScanUiState.Idle)
    val uiState: StateFlow<ScanUiState> = _uiState.asStateFlow()

    private val _scanResult = MutableStateFlow<ScanResult?>(null)
    val scanResult: StateFlow<ScanResult?> = _scanResult.asStateFlow()

    private val _errorMessage = MutableStateFlow<String?>(null)
    val errorMessage: StateFlow<String?> = _errorMessage.asStateFlow()

    private val _isConfigured = MutableStateFlow(false)
    val isConfigured: StateFlow<Boolean> = _isConfigured.asStateFlow()

    // ============================================================
    // INITIALIZATION
    // ============================================================

    init {
        checkConfiguration()
    }

    /**
     * Check if Azure Vision is properly configured
     * This is called on initialization to show appropriate UI state
     */
    private fun checkConfiguration() {
        _isConfigured.value = azureVisionService.isConfigured()
        if (!_isConfigured.value) {
            _uiState.value = ScanUiState.NotConfigured
            _errorMessage.value = "Azure Vision is not configured yet."
        }
    }

    /**
     * Get the configuration status message
     * 
     * @return Human-readable configuration status
     */
    fun getConfigurationStatus(): String {
        return azureVisionService.getConfigurationStatus()
    }

    // ============================================================
    // SCAN OPERATIONS
    // ============================================================

    /**
     * Perform a scan analysis on the given image
     * 
     * This method:
     * 1. Validates that Azure is configured
     * 2. Sets UI state to Loading
     * 3. Calls Azure Vision Service to analyze the image
     * 4. Updates UI state based on result (Success or Error)
     * 
     * @param bitmap The image to analyze
     */
    fun scanImage(bitmap: Bitmap) {
        // Check configuration first
        if (!azureVisionService.isConfigured()) {
            _uiState.value = ScanUiState.NotConfigured
            _errorMessage.value = "Azure Vision is not configured yet."
            return
        }

        // Start scanning
        _uiState.value = ScanUiState.Loading
        _errorMessage.value = null

        viewModelScope.launch {
            try {
                val result = azureVisionService.analyzeImage(bitmap)
                _scanResult.value = result

                if (result.errorMessage != null) {
                    // Handle error state
                    _uiState.value = ScanUiState.Error(result.errorMessage)
                    _errorMessage.value = result.errorMessage
                    Log.d(TAG, "Scan failed: ${result.errorMessage}")
                } else {
                    // Handle success state
                    _uiState.value = ScanUiState.Success(result)
                    Log.d(TAG, "Scan successful: ${result.tags.size} tags, ${result.objects.size} objects")
                }
            } catch (e: Exception) {
                // Handle unexpected errors
                val errorMsg = "An unexpected error occurred. Please try again."
                _uiState.value = ScanUiState.Error(errorMsg)
                _errorMessage.value = errorMsg
                Log.e(TAG, "Unexpected error during scan", e)
            }
        }
    }

    /**
     * Reset the scan state to initial idle state
     * 
     * Use this when the user wants to scan another image
     */
    fun resetState() {
        _uiState.value = ScanUiState.Idle
        _scanResult.value = null
        _errorMessage.value = null
        Log.d(TAG, "Scan state reset to Idle")
    }

    /**
     * Retry the last scan operation
     * 
     * Requires that a bitmap was previously captured.
     * This is useful when a scan fails due to network issues.
     * 
     * @param bitmap The image to retry scanning
     */
    fun retryScan(bitmap: Bitmap) {
        Log.d(TAG, "Retrying scan with new image")
        resetState()
        scanImage(bitmap)
    }

    /**
     * Clear the error message
     * 
     * Call this when the user dismisses the error message
     */
    fun clearError() {
        _errorMessage.value = null
        if (_uiState.value is ScanUiState.Error) {
            _uiState.value = ScanUiState.Idle
        }
    }

    // ============================================================
    // UTILITY METHODS
    // ============================================================

    /**
     * Check if currently in loading state
     * 
     * @return true if scanning is in progress
     */
    fun isLoading(): Boolean {
        return _uiState.value == ScanUiState.Loading
    }

    /**
     * Check if a successful result is available
     * 
     * @return true if scan was successful and results are ready
     */
    fun hasResults(): Boolean {
        return _scanResult.value != null && _scanResult.value!!.isSuccess
    }

    /**
     * Get the current scan result or null
     * 
     * @return Current ScanResult or null if no successful scan
     */
    fun getCurrentResult(): ScanResult? {
        return _scanResult.value
    }

    /**
     * Get list of detected tags from the last scan
     * 
     * @return List of tag strings, empty list if no results
     */
    fun getDetectedTags(): List<String> {
        return _scanResult.value?.tags ?: emptyList()
    }

    /**
     * Get list of detected objects from the last scan
     * 
     * @return List of DetectedObject, empty list if no results
     */
    fun getDetectedObjects(): List<com.example.myapplication.model.DetectedObject> {
        return _scanResult.value?.objects ?: emptyList()
    }

    companion object {
        private const val TAG = "ScanViewModel"
    }
}

/**
 * Factory for creating ScanViewModel with Application context
 * 
 * This factory follows the existing ViewModelFactory pattern in the project
 * to ensure proper dependency injection.
 */
class ScanViewModelFactory(
    private val application: Application
) : androidx.lifecycle.ViewModelProvider.Factory {

    @Suppress("UNCHECKED_CAST")
    override fun <T : androidx.lifecycle.ViewModel> create(modelClass: Class<T>): T {
        if (modelClass.isAssignableFrom(ScanViewModel::class.java)) {
            return ScanViewModel(application) as T
        }
        throw IllegalArgumentException("Unknown ViewModel class: ${modelClass.name}")
    }
}


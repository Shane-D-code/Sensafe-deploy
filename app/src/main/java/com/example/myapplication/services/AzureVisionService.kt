package com.example.myapplication.services

import android.content.Context
import android.graphics.Bitmap
import android.util.Log
import com.example.myapplication.model.DetectedObject
import com.example.myapplication.model.ScanResult
import com.google.gson.Gson
import com.google.gson.JsonArray
import com.google.gson.JsonObject
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.ByteArrayOutputStream
import java.io.FileInputStream
import java.util.Properties

/**
 * Azure Vision Service for analyzing images using Azure Computer Vision API.
 * 
 * This service is responsible for:
 * - Loading Azure credentials from secure configuration
 * - Sending images to Azure Computer Vision Analyze API
 * - Parsing the response to extract tags, objects, and descriptions
 * - Handling errors gracefully without crashing
 * 
 * 
 * CREDENTIALS CONFIGURATION:
 * =========================
 * 
 * For LOCAL DEVELOPMENT:
 * Create a 'local.properties' file in the app directory with:
 *   AZURE_ENDPOINT=https://your-resource.cognitiveservices.azure.com/
 *   AZURE_KEY=your-azure-key-here
 * 
 * For PRODUCTION:
 * Add to your build.gradle (app level):
 *   buildConfigField("String", "AZURE_ENDPOINT", "\"https://your-resource.cognitiveservices.azure.com/\"")
 *   buildConfigField("String", "AZURE_KEY", "\"your-azure-key-here\"")
 * 
 * The service will check BuildConfig first, then fall back to local.properties.
 * If neither is available, the service will return a graceful "not configured" result.
 * 
 * 
 * AZURE COMPUTER VISION API DETAILS:
 * ===================================
 * - Endpoint: {AZURE_ENDPOINT}/vision/v3.2/analyze
 * - Required headers: Ocp-Apim-Subscription-Key: {AZURE_KEY}
 * - Visual features: Categories, Tags, Description, Faces, ImageType, Color, Adult
 * - Response format: JSON with analysis results
 * 
 * @property context Application context for accessing configuration
 */
class AzureVisionService(private val context: Context) {

    companion object {
        private const val TAG = "AzureVisionService"
        private const val VISUAL_FEATURES = "Categories,Tags,Description,Faces,ImageType,Color,Adult"
        private const val LOCAL_PROPERTIES_FILE = "local.properties"
        private const val KEY_ENDPOINT = "AZURE_ENDPOINT"
        private const val KEY_API_KEY = "AZURE_KEY"
        
        // HTTP client for API calls
        private val httpClient = OkHttpClient.Builder()
            .connectTimeout(30, java.util.concurrent.TimeUnit.SECONDS)
            .readTimeout(30, java.util.concurrent.TimeUnit.SECONDS)
            .writeTimeout(30, java.util.concurrent.TimeUnit.SECONDS)
            .build()
            
        private val gson = Gson()
    }

    /**
     * Azure Credentials holder
     * Loaded from BuildConfig (production) or local.properties (development)
     */
    data class AzureCredentials(
        val endpoint: String,
        val apiKey: String
    ) {
        fun isValid(): Boolean = endpoint.isNotBlank() && apiKey.isNotBlank()
    }

    /**
     * Check if Azure Vision is properly configured
     * 
     * @return true if credentials are available, false otherwise
     */
    fun isConfigured(): Boolean {
        return getCredentials().isValid()
    }

    /**
     * Get Azure credentials from configuration sources
     * 
     * Priority:
     * 1. local.properties file (development)
     * 
     * @return AzureCredentials object with endpoint and API key
     */
    private fun getCredentials(): AzureCredentials {
        // Try local.properties
        val credentials = loadFromLocalProperties()
        if (credentials.isValid()) {
            return credentials
        }
        
        Log.w(TAG, "Azure credentials not found in local.properties")
        return AzureCredentials("", "")
    }

    /**
     * Load credentials from local.properties file
     * 
     * This allows developers to configure Azure credentials locally
     * without committing them to version control.
     * 
     * @return AzureCredentials from local.properties or invalid credentials if not found
     */
    private fun loadFromLocalProperties(): AzureCredentials {
        return try {
            val properties = Properties()
            val filePath = "${context.filesDir.parentFile?.parentFile?.parentFile}/$LOCAL_PROPERTIES_FILE"
            
            // Also check in the app directory
            val altPath = "${context.applicationInfo.dataDir}/$LOCAL_PROPERTIES_FILE"
            
            val paths = listOf(filePath, altPath)
            var loaded = false
            
            for (path in paths) {
                try {
                    val file = java.io.File(path)
                    if (file.exists()) {
                        FileInputStream(file).use { input ->
                            properties.load(input)
                            loaded = true
                        }
                        break
                    }
                } catch (e: Exception) {
                    Log.d(TAG, "Could not load local.properties from: $path")
                }
            }
            
            if (!loaded) {
                Log.w(TAG, "local.properties file not found. Azure Vision will not be configured.")
                return AzureCredentials("", "")
            }
            
            val endpoint = properties.getProperty(KEY_ENDPOINT, "").trim()
            val apiKey = properties.getProperty(KEY_API_KEY, "").trim()
            
            if (endpoint.isNotBlank() && apiKey.isNotBlank()) {
                Log.i(TAG, "Azure credentials loaded from local.properties")
                AzureCredentials(endpoint, apiKey)
            } else {
                Log.w(TAG, "Azure credentials incomplete in local.properties")
                AzureCredentials("", "")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error loading Azure credentials: ${e.message}")
            AzureCredentials("", "")
        }
    }

    /**
     * Analyze an image using Azure Computer Vision
     * 
     * This method:
     * 1. Validates credentials before making API call
     * 2. Converts Bitmap to JPEG bytes
     * 3. Sends POST request to Azure Analyze API
     * 4. Parses JSON response into ScanResult
     * 5. Handles all errors gracefully
     * 
     * @param bitmap The image to analyze (will be compressed to JPEG)
     * @param quality The compression quality for JPEG (0-100), default 85
     * @return ScanResult containing detected tags, objects, and description
     */
    suspend fun analyzeImage(bitmap: Bitmap, quality: Int = 85): ScanResult {
        return withContext(Dispatchers.IO) {
            try {
                // Step 1: Check credentials
                val credentials = getCredentials()
                if (!credentials.isValid()) {
                    Log.w(TAG, "Azure Vision not configured - missing credentials")
                    return@withContext ScanResult(
                        tags = emptyList(),
                        objects = emptyList(),
                        description = "",
                        confidence = 0f,
                        errorMessage = "Azure Vision is not configured yet."
                    )
                }

                // Step 2: Convert bitmap to JPEG bytes
                val imageBytes = bitmapToJpegBytes(bitmap, quality)
                if (imageBytes.isEmpty()) {
                    Log.e(TAG, "Failed to convert bitmap to JPEG")
                    return@withContext ScanResult(
                        tags = emptyList(),
                        objects = emptyList(),
                        description = "Failed to process image",
                        confidence = 0f,
                        errorMessage = "Failed to process image. Please try again."
                    )
                }

                // Step 3: Build the API request
                val analyzeUrl = "${credentials.endpoint.removeSuffix("/")}/vision/v3.2/analyze?visualFeatures=$VISUAL_FEATURES"
                
                val requestBody = imageBytes.toRequestBody("image/jpeg".toMediaTypeOrNull())
                
                val request = Request.Builder()
                    .url(analyzeUrl)
                    .addHeader("Ocp-Apim-Subscription-Key", credentials.apiKey)
                    .addHeader("Content-Type", "image/jpeg")
                    .post(requestBody)
                    .build()

                // Step 4: Execute the API call
                Log.d(TAG, "Sending image to Azure Computer Vision API...")
                val response = httpClient.newCall(request).execute()

                // Step 5: Parse the response
                if (response.isSuccessful) {
                    val responseBody = response.body?.string()
                    if (responseBody != null) {
                        Log.d(TAG, "Azure API response received successfully")
                        parseAzureResponse(responseBody)
                    } else {
                        Log.e(TAG, "Empty response from Azure API")
                        ScanResult(
                            tags = emptyList(),
                            objects = emptyList(),
                            description = "",
                            confidence = 0f,
                            errorMessage = "No response from Azure. Please check your internet connection."
                        )
                    }
                } else {
                    val errorMessage = when (response.code) {
                        401 -> "Azure authentication failed. Please check your API key."
                        403 -> "Access denied. Please check your Azure subscription."
                        404 -> "Azure endpoint not found. Please check your endpoint URL."
                        429 -> "Too many requests. Please wait and try again."
                        in 500..599 -> "Azure service error. Please try again later."
                        else -> "Azure API error (code ${response.code}). Please try again."
                    }
                    Log.e(TAG, "Azure API error: ${response.code} - ${response.message}")
                    ScanResult(
                        tags = emptyList(),
                        objects = emptyList(),
                        description = "",
                        confidence = 0f,
                        errorMessage = errorMessage
                    )
                }
            } catch (e: java.net.UnknownHostException) {
                Log.e(TAG, "Network error - no internet connection", e)
                ScanResult(
                    tags = emptyList(),
                    objects = emptyList(),
                    description = "",
                    confidence = 0f,
                    errorMessage = "No internet connection. Please check your network and try again."
                )
            } catch (e: java.net.SocketTimeoutException) {
                Log.e(TAG, "Network timeout", e)
                ScanResult(
                    tags = emptyList(),
                    objects = emptyList(),
                    description = "",
                    confidence = 0f,
                    errorMessage = "Connection timed out. Please try again."
                )
            } catch (e: Exception) {
                Log.e(TAG, "Unexpected error during Azure Vision analysis", e)
                ScanResult(
                    tags = emptyList(),
                    objects = emptyList(),
                    description = "",
                    confidence = 0f,
                    errorMessage = "An unexpected error occurred. Please try again."
                )
            }
        }
    }

    /**
     * Convert Bitmap to JPEG byte array
     * 
     * @param bitmap The source bitmap
     * @param quality JPEG compression quality (0-100)
     * @return Byte array of JPEG data, empty if compression failed
     */
    private fun bitmapToJpegBytes(bitmap: Bitmap, quality: Int): ByteArray {
        return try {
            val outputStream = ByteArrayOutputStream()
            bitmap.compress(Bitmap.CompressFormat.JPEG, quality, outputStream)
            outputStream.toByteArray()
        } catch (e: Exception) {
            Log.e(TAG, "Error converting bitmap to JPEG: ${e.message}")
            byteArrayOf()
        }
    }

    /**
     * Parse Azure Computer Vision API response into ScanResult
     * 
     * The Azure API returns a JSON object with:
     * - categories: List of image categories
     * - tags: List of detected tags with confidence scores
     * - description: Object containing captions
     * - faces: List of detected faces
     * - color: Color analysis information
     * - adult: Adult content detection results
     * 
     * @param jsonResponse The raw JSON response from Azure
     * @return Parsed ScanResult object
     */
    private fun parseAzureResponse(jsonResponse: String): ScanResult {
        return try {
            val jsonObject = gson.fromJson(jsonResponse, JsonObject::class.java)
            
            // Extract tags
            val tags = mutableListOf<String>()
            jsonObject.getAsJsonArray("tags")?.let { tagsArray ->
                for (i in 0 until tagsArray.size()) {
                    val tagObject = tagsArray.get(i).asJsonObject
                    tagObject.get("name")?.asString?.let { tagName ->
                        tags.add(tagName)
                    }
                }
            }
            
            // Extract objects
            val objects = mutableListOf<DetectedObject>()
            jsonObject.getAsJsonArray("objects")?.let { objectsArray ->
                for (i in 0 until objectsArray.size()) {
                    val obj = objectsArray.get(i).asJsonObject
                    val name = obj.get("object")?.asString ?: continue
                    val confidence = obj.get("confidence")?.asFloat ?: 0f
                    objects.add(DetectedObject(name, confidence))
                }
            }
            
            // Extract description/captions
            val description = jsonObject.getAsJsonObject("description")
                ?.getAsJsonArray("captions")
                ?.get(0)?.asJsonObject
                ?.get("text")
                ?.asString ?: ""
            
            // Calculate overall confidence
            val avgConfidence = if (objects.isNotEmpty()) {
                objects.map { it.confidence }.average().toFloat()
            } else if (tags.isNotEmpty()) {
                0.75f // Default confidence if only tags
            } else {
                0f
            }
            
            Log.d(TAG, "Parsed Azure response: ${tags.size} tags, ${objects.size} objects")
            
            ScanResult(
                tags = tags,
                objects = objects,
                description = description,
                confidence = avgConfidence,
                errorMessage = null
            )
        } catch (e: Exception) {
            Log.e(TAG, "Error parsing Azure response: ${e.message}")
            ScanResult(
                tags = emptyList(),
                objects = emptyList(),
                description = "",
                confidence = 0f,
                errorMessage = "Failed to analyze image. Please try again."
            )
        }
    }

    /**
     * Get a user-friendly message for the current configuration status
     * 
     * @return Message describing the Azure configuration status
     */
    fun getConfigurationStatus(): String {
        return if (isConfigured()) {
            "Azure Vision is configured and ready to use."
        } else {
            "Azure Vision is not configured yet. " +
            "Add AZURE_ENDPOINT and AZURE_KEY to local.properties or BuildConfig."
        }
    }
}


package com.example.myapplication.network

import com.google.gson.GsonBuilder
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

object RetrofitClient {
    // TODO: Move base URL to Azure once deployed
    // Use 10.0.2.2 for Android Emulator to access localhost
    private const val BASE_URL = "http://100.31.117.111:8000"
    
    // Demo/test credentials for development
    const val DEMO_EMAIL = "demo@sensesafe.app"
    const val DEMO_PASSWORD = "demo123"
    const val DEMO_TOKEN = "demo_token_for_testing_only"

    // Store the auth token (in memory)
    private var authToken: String? = null

    fun setAuthToken(token: String?) {
        authToken = token
    }

    private val okHttpClient: OkHttpClient by lazy {
        val loggingInterceptor = HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BODY
        }

        OkHttpClient.Builder()
            .addInterceptor(loggingInterceptor)
            .addInterceptor { chain ->
                val original = chain.request()
                val requestBuilder = original.newBuilder()
                
                authToken?.let {
                    requestBuilder.header("Authorization", "Bearer $it")
                }
                
                val request = requestBuilder.build()
                chain.proceed(request)
            }
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
            .build()
    }

    private val gson by lazy {
        GsonBuilder()
            .setDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSSSSS")
            .setLenient()
            .create()
    }

    private val retrofit: Retrofit by lazy {
        Retrofit.Builder()
            .baseUrl(BASE_URL)
            .client(okHttpClient)
            .addConverterFactory(GsonConverterFactory.create(gson))
            .build()
    }

    val instance: ApiService by lazy {
        retrofit.create(ApiService::class.java)
    }

    /**
     * Backend ML API service for centralized ML detection
     * 
     * Use this instead of calling Roboflow directly to:
     * - Save scans to database
     * - Enable admin dashboard visibility
     * - Centralize API key management
     */
    val mlService: BackendApiService by lazy {
        retrofit.create(BackendApiService::class.java)
    }
}

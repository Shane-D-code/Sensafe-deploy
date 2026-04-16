package com.example.myapplication.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import android.content.Context
import com.example.myapplication.accessibility.AccessibilityManager

class BlindVoiceViewModelFactory(
    private val context: Context,
    private val accessibilityManager: AccessibilityManager
) : ViewModelProvider.Factory {
    @Suppress("UNCHECKED_CAST")
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        if (modelClass.isAssignableFrom(BlindVoiceViewModel::class.java)) {
            return BlindVoiceViewModel(context, accessibilityManager) as T
        }
        throw IllegalArgumentException("Unknown ViewModel class")
    }
}

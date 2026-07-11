package com.gstbilling.app.util

sealed class AppResult<out T> {
    data class Success<T>(val data: T) : AppResult<T>()
    data class Error(val message: String) : AppResult<Nothing>()
    data object Loading : AppResult<Nothing>()
}

suspend fun <T> safeApiCall(call: suspend () -> T?): AppResult<T> {
    return try {
        val response = call()
        if (response != null) AppResult.Success(response)
        else AppResult.Error("Empty response")
    } catch (e: Exception) {
        AppResult.Error(e.message ?: "Unknown error occurred")
    }
}

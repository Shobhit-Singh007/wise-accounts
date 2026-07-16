package com.gstbilling.app.data.repository

import com.gstbilling.app.data.remote.api.*
import com.gstbilling.app.util.AppResult
import com.gstbilling.app.util.SessionManager
import com.gstbilling.app.util.safeApiCall
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AuthRepository @Inject constructor(
    private val apiService: ApiService,
    private val sessionManager: SessionManager
) {

    suspend fun login(phone: String, password: String): AppResult<TokenResponse> {
        return safeApiCall {
            val response = apiService.login(LoginRequest(phone = phone, password = password))
            if (response.isSuccessful) {
                val apiResponse = response.body()
                val tokenData = apiResponse?.data
                if (tokenData != null) {
                    val user = tokenData.user
                    if (user == null || user.id.isBlank()) {
                        throw Exception("Login failed: user data not found in response")
                    }
                    var businessId = ""
                    var businessName = ""
                    try {
                        val bizResponse = apiService.getBusinesses()
                        if (bizResponse.isSuccessful) {
                            val businesses = bizResponse.body()?.data
                            if (!businesses.isNullOrEmpty()) {
                                businessId = businesses.first().id
                                businessName = businesses.first().name
                            }
                        }
                    } catch (_: Exception) {}

                    sessionManager.saveAuthData(
                        accessToken = tokenData.accessToken,
                        refreshToken = tokenData.refreshToken,
                        userId = user.id,
                        businessId = businessId,
                        businessName = businessName,
                        userName = user.name,
                        phone = user.phone
                    )
                    tokenData
                } else {
                    throw Exception(apiResponse?.message ?: "Login failed: empty response")
                }
            } else {
                val errorBody = response.errorBody()?.string() ?: "Login failed"
                throw Exception(errorBody)
            }
        }
    }

    suspend fun register(
        phone: String,
        name: String,
        email: String?,
        password: String
    ): AppResult<TokenResponse> {
        return safeApiCall {
            val response = apiService.register(
                RegisterRequest(phone = phone, name = name, email = email, password = password)
            )
            if (response.isSuccessful) {
                val apiResponse = response.body()
                val tokenData = apiResponse?.data
                if (tokenData != null) {
                    val user = tokenData.user
                    if (user == null || user.id.isBlank()) {
                        throw Exception("Registration failed: user data not found in response")
                    }
                    var businessId = ""
                    var businessName = ""
                    try {
                        val bizResponse = apiService.getBusinesses()
                        if (bizResponse.isSuccessful) {
                            val businesses = bizResponse.body()?.data
                            if (!businesses.isNullOrEmpty()) {
                                businessId = businesses.first().id
                                businessName = businesses.first().name
                            }
                        }
                    } catch (_: Exception) {}

                    sessionManager.saveAuthData(
                        accessToken = tokenData.accessToken,
                        refreshToken = tokenData.refreshToken,
                        userId = user.id,
                        businessId = businessId,
                        businessName = businessName,
                        userName = user.name,
                        phone = user.phone
                    )
                    tokenData
                } else {
                    throw Exception(apiResponse?.message ?: "Registration failed: empty response")
                }
            } else {
                val errorBody = response.errorBody()?.string() ?: "Registration failed"
                throw Exception(errorBody)
            }
        }
    }

    suspend fun sendOtp(phone: String, email: String? = null): AppResult<Boolean> {
        return when (val result = safeApiCall { apiService.sendOtp(SendOtpRequest(phone = phone, email = email)) }) {
            is AppResult.Success -> AppResult.Success(true)
            is AppResult.Error -> AppResult.Error(result.message ?: "Failed to send OTP")
            is AppResult.Loading -> AppResult.Loading
        }
    }

    suspend fun verifyOtp(phone: String, otp: String): AppResult<TokenResponse> {
        return safeApiCall {
            val response = apiService.verifyOtp(VerifyOtpRequest(phone = phone, otp = otp))
            if (response.isSuccessful) {
                val apiResponse = response.body()
                val tokenData = apiResponse?.data
                if (tokenData != null) {
                    val user = tokenData.user
                    if (user == null || user.id.isBlank()) {
                        throw Exception("OTP verification failed: user data not found in response")
                    }
                    var businessId = ""
                    var businessName = ""
                    try {
                        val bizResponse = apiService.getBusinesses()
                        if (bizResponse.isSuccessful) {
                            val businesses = bizResponse.body()?.data
                            if (!businesses.isNullOrEmpty()) {
                                businessId = businesses.first().id
                                businessName = businesses.first().name
                            }
                        }
                    } catch (_: Exception) {}

                    sessionManager.saveAuthData(
                        accessToken = tokenData.accessToken,
                        refreshToken = tokenData.refreshToken,
                        userId = user.id,
                        businessId = businessId,
                        businessName = businessName,
                        userName = user.name,
                        phone = user.phone
                    )
                    tokenData
                } else {
                    throw Exception(apiResponse?.message ?: "OTP verification failed: empty response")
                }
            } else {
                val errorBody = response.errorBody()?.string() ?: "OTP verification failed"
                throw Exception(errorBody)
            }
        }
    }

    suspend fun refreshToken(): AppResult<TokenResponse> {
        return safeApiCall {
            val currentRefreshToken = sessionManager.getRefreshToken() ?: throw Exception("No refresh token")
            val response = apiService.refreshToken(RefreshTokenRequest(refreshToken = currentRefreshToken))
            if (response.isSuccessful) {
                val apiResponse = response.body()
                val tokenData = apiResponse?.data
                if (tokenData != null) {
                    val user = tokenData.user
                    if (user == null || user.id.isBlank()) {
                        throw Exception("Session refresh failed: user data not found in response")
                    }
                    var businessId = ""
                    var businessName = ""
                    try {
                        val bizResponse = apiService.getBusinesses()
                        if (bizResponse.isSuccessful) {
                            val businesses = bizResponse.body()?.data
                            if (!businesses.isNullOrEmpty()) {
                                businessId = businesses.first().id
                                businessName = businesses.first().name
                            }
                        }
                    } catch (_: Exception) {}

                    sessionManager.saveAuthData(
                        accessToken = tokenData.accessToken,
                        refreshToken = tokenData.refreshToken,
                        userId = user.id,
                        businessId = businessId,
                        businessName = businessName,
                        userName = user.name,
                        phone = user.phone
                    )
                    tokenData
                } else {
                    throw Exception(apiResponse?.message ?: "Session refresh failed: empty response")
                }
            } else {
                sessionManager.clearSession()
                throw Exception("Session expired")
            }
        }
    }

    suspend fun logout() {
        sessionManager.clearSession()
    }

    suspend fun isLoggedIn(): Boolean {
        return sessionManager.getAccessToken() != null
    }
}

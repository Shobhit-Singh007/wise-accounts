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
                val body = response.body()
                if (body != null) {
                    sessionManager.saveAuthData(
                        accessToken = body.access_token,
                        refreshToken = body.refresh_token,
                        userId = body.user.id,
                        businessId = body.user.business_id,
                        businessName = body.user.business_name,
                        userName = body.user.name,
                        phone = body.user.phone
                    )
                    body
                } else null
            } else {
                val errorBody = response.errorBody()?.string() ?: "Login failed"
                throw Exception(errorBody)
            }
        }
    }

    suspend fun register(
        businessName: String,
        ownerName: String,
        phone: String,
        email: String,
        password: String,
        gstin: String?
    ): AppResult<TokenResponse> {
        return safeApiCall {
            val response = apiService.register(
                RegisterRequest(
                    business_name = businessName,
                    owner_name = ownerName,
                    phone = phone,
                    email = email,
                    password = password,
                    gstin = gstin
                )
            )
            if (response.isSuccessful) {
                val body = response.body()
                if (body != null) {
                    sessionManager.saveAuthData(
                        accessToken = body.access_token,
                        refreshToken = body.refresh_token,
                        userId = body.user.id,
                        businessId = body.user.business_id,
                        businessName = body.user.business_name,
                        userName = body.user.name,
                        phone = body.user.phone
                    )
                    body
                } else null
            } else {
                val errorBody = response.errorBody()?.string() ?: "Registration failed"
                throw Exception(errorBody)
            }
        }
    }

    suspend fun refreshToken(): AppResult<TokenResponse> {
        return safeApiCall {
            val currentRefreshToken = sessionManager.getRefreshToken() ?: throw Exception("No refresh token")
            val response = apiService.refreshToken(RefreshTokenRequest(currentRefreshToken))
            if (response.isSuccessful) {
                val body = response.body()
                if (body != null) {
                    sessionManager.saveAuthData(
                        accessToken = body.access_token,
                        refreshToken = body.refresh_token,
                        userId = body.user.id,
                        businessId = body.user.business_id,
                        businessName = body.user.business_name,
                        userName = body.user.name,
                        phone = body.user.phone
                    )
                    body
                } else null
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

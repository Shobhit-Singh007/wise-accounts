package com.gstbilling.app.data.remote.api

import com.gstbilling.app.util.SessionManager
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import okhttp3.Interceptor
import okhttp3.Response
import javax.inject.Inject
import javax.inject.Provider
import javax.inject.Singleton

@Singleton
class AuthInterceptor @Inject constructor(
    private val sessionManager: SessionManager,
    private val apiServiceProvider: Provider<ApiService>
) : Interceptor {

    private val mutex = Mutex()
    @Volatile private var cachedToken: String? = null

    override fun intercept(chain: Interceptor.Chain): Response {
        val originalRequest = chain.request()

        val token = cachedToken ?: runBlocking {
            sessionManager.getAccessToken().also { cachedToken = it }
        }

        val request = if (token != null) {
            originalRequest.newBuilder()
                .header("Authorization", "Bearer $token")
                .header("Content-Type", "application/json")
                .header("Accept", "application/json")
                .build()
        } else {
            originalRequest.newBuilder()
                .header("Content-Type", "application/json")
                .header("Accept", "application/json")
                .build()
        }

        val response = chain.proceed(request)

        if (response.code == 401) {
            response.close()
            val newToken: String? = runBlocking {
                mutex.lock()
                try {

                    if (cachedToken != token) {
                        cachedToken
                    } else {
                        val rt = sessionManager.getRefreshToken()
                        if (rt == null) {
                            null
                        } else {
                            try {
                                val refreshResponse = apiServiceProvider.get().refreshToken(RefreshTokenRequest(rt))
                                val tokenResponse = refreshResponse.body()
                                if (refreshResponse.isSuccessful && tokenResponse != null) {
                                    val existingBusinessId = sessionManager.getBusinessId() ?: ""
                                    val existingBusinessName = sessionManager.getBusinessName() ?: ""
                                    sessionManager.saveAuthData(
                                        accessToken = tokenResponse.accessToken,
                                        refreshToken = tokenResponse.refreshToken,
                                        userId = tokenResponse.user.id,
                                        businessId = existingBusinessId,
                                        businessName = existingBusinessName,
                                        userName = tokenResponse.user.name,
                                        phone = tokenResponse.user.phone
                                    )
                                    tokenResponse.accessToken.also { cachedToken = it }
                                } else {
                                    cachedToken = null
                                    sessionManager.clearSession()
                                    null
                                }
                            } catch (_: Exception) {
                                null
                            }
                        }
                    }
                } finally {
                    mutex.unlock()
                }
            }

            if (newToken != null) {
                val retryRequest = originalRequest.newBuilder()
                    .header("Authorization", "Bearer $newToken")
                    .header("Content-Type", "application/json")
                    .header("Accept", "application/json")
                    .build()
                return chain.proceed(retryRequest)
            }
        }

        return response
    }
}

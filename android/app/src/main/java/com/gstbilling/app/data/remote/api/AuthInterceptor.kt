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
            val newToken = runBlocking {
                mutex.withLock {
                    if (cachedToken != token) {
                        return@withLock cachedToken
                    }
                    val refreshToken = sessionManager.getRefreshToken() ?: return@withLock null
                    try {
                        val refreshResponse = apiServiceProvider.get().refreshToken(RefreshTokenRequest(refreshToken))
                        if (refreshResponse.isSuccessful) {
                            val body = refreshResponse.body()?.data
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
                                body.access_token.also { cachedToken = it }
                            } else null
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

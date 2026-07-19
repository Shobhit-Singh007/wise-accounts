package com.gstbilling.app.util

import android.content.Context
import android.content.SharedPreferences
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.longPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "session_prefs")

@Singleton
class SessionManager @Inject constructor(
    @ApplicationContext private val context: Context
) {
    private val masterKey = MasterKey.Builder(context)
        .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
        .build()

    private val securePrefs: SharedPreferences = EncryptedSharedPreferences.create(
        context,
        "secure_session_prefs",
        masterKey,
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
    )

    private data class Key(
        val USER_ID: Preferences.Key<String> = stringPreferencesKey("user_id"),
        val BUSINESS_ID: Preferences.Key<String> = stringPreferencesKey("business_id"),
        val BUSINESS_NAME: Preferences.Key<String> = stringPreferencesKey("business_name"),
        val USER_NAME: Preferences.Key<String> = stringPreferencesKey("user_name"),
        val USER_PHONE: Preferences.Key<String> = stringPreferencesKey("user_phone"),
        val IS_LOGGED_IN: Preferences.Key<Boolean> = booleanPreferencesKey("is_logged_in"),
    )

    private val Key = Key()

    val isLoggedIn: Flow<Boolean> = context.dataStore.data.map { prefs ->
        prefs[Key.IS_LOGGED_IN] ?: false
    }

    val businessId: Flow<String?> = context.dataStore.data.map { prefs ->
        prefs[Key.BUSINESS_ID]
    }

    val businessName: Flow<String?> = context.dataStore.data.map { prefs ->
        prefs[Key.BUSINESS_NAME]
    }

    suspend fun saveAuthData(
        accessToken: String,
        refreshToken: String,
        userId: String,
        businessId: String,
        businessName: String,
        userName: String,
        phone: String
    ) {
        securePrefs.edit()
            .putString("access_token", accessToken)
            .putString("refresh_token", refreshToken)
            .apply()
        context.dataStore.edit { prefs ->
            prefs[Key.USER_ID] = userId
            prefs[Key.BUSINESS_ID] = businessId
            prefs[Key.BUSINESS_NAME] = businessName
            prefs[Key.USER_NAME] = userName
            prefs[Key.USER_PHONE] = phone
            prefs[Key.IS_LOGGED_IN] = true
        }
    }

    suspend fun getAccessToken(): String? {
        return securePrefs.getString("access_token", null)
    }

    suspend fun getRefreshToken(): String? {
        return securePrefs.getString("refresh_token", null)
    }

    suspend fun getBusinessId(): String? {
        return context.dataStore.data.first()[Key.BUSINESS_ID]
    }

    suspend fun getBusinessName(): String? {
        return context.dataStore.data.first()[Key.BUSINESS_NAME]
    }

    suspend fun saveBusinessId(id: String) {
        context.dataStore.edit { prefs ->
            prefs[Key.BUSINESS_ID] = id
        }
    }

    suspend fun saveBusinessName(name: String) {
        context.dataStore.edit { prefs ->
            prefs[Key.BUSINESS_NAME] = name
        }
    }

    suspend fun switchBusiness(id: String, name: String) {
        context.dataStore.edit { prefs ->
            prefs[Key.BUSINESS_ID] = id
            prefs[Key.BUSINESS_NAME] = name
        }
    }

    suspend fun clearSession() {
        securePrefs.edit().clear().apply()
        context.dataStore.edit { prefs ->
            prefs.clear()
        }
    }
}

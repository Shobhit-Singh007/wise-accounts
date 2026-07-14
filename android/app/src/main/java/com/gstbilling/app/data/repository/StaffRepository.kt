package com.gstbilling.app.data.repository

import com.gstbilling.app.data.remote.api.*
import com.gstbilling.app.util.AppResult
import com.gstbilling.app.util.SessionManager
import com.gstbilling.app.util.safeApiCall
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class StaffRepository @Inject constructor(
    private val apiService: ApiService,
    private val sessionManager: SessionManager
) {

    private suspend fun requireBusinessId(): String {
        return sessionManager.getBusinessId() ?: throw Exception("Business not found")
    }

    suspend fun getStaff(): AppResult<List<StaffMember>> {
        return safeApiCall {
            val bid = requireBusinessId()
            val response = apiService.getStaff(bid)
            if (response.isSuccessful) response.body()?.data
            else throw Exception(response.errorBody()?.string() ?: "Failed to load staff")
        }
    }

    suspend fun inviteStaff(request: InviteStaffRequest): AppResult<Map<String, Any>> {
        return safeApiCall {
            val bid = requireBusinessId()
            val response = apiService.inviteStaff(bid, request)
            if (response.isSuccessful) response.body()?.data
            else throw Exception(response.errorBody()?.string() ?: "Failed to send invite")
        }
    }

    suspend fun updatePermissions(userId: String, request: UpdatePermissionsRequest): AppResult<Map<String, Any>> {
        return safeApiCall {
            val bid = requireBusinessId()
            val response = apiService.updateStaffPermissions(bid, userId, request)
            if (response.isSuccessful) response.body()?.data
            else throw Exception(response.errorBody()?.string() ?: "Failed to update permissions")
        }
    }

    suspend fun removeStaff(userId: String): AppResult<Map<String, Any>> {
        return safeApiCall {
            val bid = requireBusinessId()
            val response = apiService.removeStaff(bid, userId)
            if (response.isSuccessful) response.body()?.data
            else throw Exception(response.errorBody()?.string() ?: "Failed to remove staff")
        }
    }

    suspend fun getStaffInvites(): AppResult<List<StaffInvite>> {
        return safeApiCall {
            val bid = requireBusinessId()
            val response = apiService.getStaffInvites(bid)
            if (response.isSuccessful) response.body()?.data
            else throw Exception(response.errorBody()?.string() ?: "Failed to load invites")
        }
    }

    suspend fun cancelInvite(inviteId: String): AppResult<Map<String, Any>> {
        return safeApiCall {
            val bid = requireBusinessId()
            val response = apiService.cancelStaffInvite(bid, inviteId)
            if (response.isSuccessful) response.body()?.data
            else throw Exception(response.errorBody()?.string() ?: "Failed to cancel invite")
        }
    }
}

package com.gstbilling.app.data.repository

import com.gstbilling.app.data.remote.api.*
import com.gstbilling.app.util.AppResult
import com.gstbilling.app.util.SessionManager
import com.gstbilling.app.util.safeApiCall
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class BusinessRepository @Inject constructor(
    private val apiService: ApiService,
    private val sessionManager: SessionManager
) {

    suspend fun getDashboard(): AppResult<DashboardData> {
        val businessId = sessionManager.getBusinessId() ?: return AppResult.Error("Business not found")
        return safeApiCall {
            val response = apiService.getDashboard(businessId)
            if (response.isSuccessful) response.body()?.data
            else throw Exception(response.errorBody()?.string() ?: "Failed to load dashboard")
        }
    }

    suspend fun getBusiness(): AppResult<Business> {
        val businessId = sessionManager.getBusinessId() ?: return AppResult.Error("Business not found")
        return safeApiCall {
            val response = apiService.getBusiness(businessId)
            if (response.isSuccessful) response.body()?.data
            else throw Exception(response.errorBody()?.string() ?: "Failed to load business")
        }
    }

    suspend fun updateBusiness(business: Business): AppResult<Business> {
        return safeApiCall {
            val response = apiService.updateBusiness(business.id, business)
            if (response.isSuccessful) response.body()?.data
            else throw Exception(response.errorBody()?.string() ?: "Failed to update business")
        }
    }

    suspend fun getWarehouses(): AppResult<List<Warehouse>> {
        val businessId = sessionManager.getBusinessId() ?: return AppResult.Error("Business not found")
        return safeApiCall {
            val response = apiService.getWarehouses(businessId)
            if (response.isSuccessful) response.body()?.data
            else throw Exception(response.errorBody()?.string() ?: "Failed to load warehouses")
        }
    }
}

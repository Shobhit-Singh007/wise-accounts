package com.gstbilling.app.data.repository

import com.gstbilling.app.data.local.dao.CustomerDao
import com.gstbilling.app.data.local.entity.CustomerEntity
import com.gstbilling.app.data.remote.api.*
import com.gstbilling.app.util.AppResult
import com.gstbilling.app.util.NetworkMonitor
import com.gstbilling.app.util.SessionManager
import com.gstbilling.app.util.safeApiCall
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.asRequestBody
import kotlinx.coroutines.flow.Flow
import java.util.*
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class CustomerRepository @Inject constructor(
    private val apiService: ApiService,
    private val customerDao: CustomerDao,
    private val sessionManager: SessionManager,
    private val networkMonitor: NetworkMonitor
) {

    fun getCustomers(businessId: String): Flow<List<CustomerEntity>> {
        return customerDao.getCustomersByBusiness(businessId.hashCode().toLong())
    }

    fun searchCustomers(businessId: String, query: String): Flow<List<CustomerEntity>> {
        return customerDao.searchCustomers(businessId.hashCode().toLong(), query)
    }

    suspend fun getCustomerById(id: Long): CustomerEntity? {
        return customerDao.getCustomerById(id)
    }

    suspend fun refreshCustomers(businessId: String): AppResult<List<Customer>> {
        if (!networkMonitor.isOnline()) {
            return AppResult.Error("No internet connection")
        }
        return safeApiCall {
            val response = apiService.getCustomers(businessId, limit = 9999)
            if (response.isSuccessful) {
                val paginated = response.body()?.data
                val customers = paginated?.data ?: emptyList()
                val entities = customers.map { it.toEntity() }
                customerDao.deleteSyncedByBusinessId(businessId.hashCode().toLong())
                customerDao.insertAll(entities)
                customers
            } else {
                throw Exception(response.errorBody()?.string() ?: "Failed to load customers")
            }
        }
    }

    suspend fun createCustomer(businessId: String, customer: Customer): AppResult<Customer> {
        if (!networkMonitor.isOnline()) {
            val offlineEntity = customer.copy(id = UUID.randomUUID().toString())
                .toEntity().copy(syncStatus = "pending", syncOperation = "CREATE")
            customerDao.insert(offlineEntity)
            return AppResult.Success(customer)
        }
        return safeApiCall {
            val response = apiService.createCustomer(businessId, customer)
            if (response.isSuccessful) {
                val created = response.body()?.data ?: throw Exception("Failed to create customer")
                customerDao.insert(created.toEntity())
                created
            } else {
                val offlineEntity = customer.copy(id = UUID.randomUUID().toString())
                    .toEntity().copy(syncStatus = "pending", syncOperation = "CREATE")
                customerDao.insert(offlineEntity)
                customer
            }
        }
    }

    suspend fun updateCustomer(businessId: String, id: String, customer: Customer): AppResult<Customer> {
        if (!networkMonitor.isOnline()) {
            customerDao.insert(customer.copy(id = id).toEntity().copy(syncStatus = "pending", syncOperation = "UPDATE"))
            return AppResult.Success(customer)
        }
        return safeApiCall {
            val response = apiService.updateCustomer(businessId, id, customer)
            if (response.isSuccessful) {
                val updated = response.body()?.data ?: throw Exception("Failed to update customer")
                customerDao.insert(updated.toEntity())
                updated
            } else {
                customerDao.insert(customer.copy(id = id).toEntity().copy(syncStatus = "pending", syncOperation = "UPDATE"))
                customer
            }
        }
    }

    suspend fun deleteCustomer(businessId: String, id: String): AppResult<Unit> {
        return safeApiCall {
            val response = apiService.deleteCustomer(businessId, id)
            if (response.isSuccessful) {
                customerDao.deleteById(id.hashCode().toLong())
            } else {
                throw Exception(response.errorBody()?.string() ?: "Failed to delete customer")
            }
        }
    }

    suspend fun getCustomerLedger(businessId: String, customerId: String): AppResult<LedgerResponse> {
        return safeApiCall {
            val response = apiService.getCustomerLedger(businessId, customerId)
            if (response.isSuccessful) response.body()?.data
            else throw Exception(response.errorBody()?.string() ?: "Failed to load ledger")
        }
    }

    suspend fun createLedgerEntry(businessId: String, customerId: String, request: CreateLedgerEntryRequest): AppResult<LedgerEntryResponse> {
        return safeApiCall {
            val response = apiService.createLedgerEntry(businessId, customerId, request)
            if (response.isSuccessful) response.body()?.data
            else throw Exception(response.errorBody()?.string() ?: "Failed to add entry")
        }
    }

    suspend fun deleteLedgerEntry(businessId: String, customerId: String, transactionId: String): AppResult<Unit> {
        return safeApiCall {
            val response = apiService.deleteLedgerEntry(businessId, customerId, transactionId)
            if (!response.isSuccessful) throw Exception(response.errorBody()?.string() ?: "Failed to delete entry")
        }
    }

    suspend fun sendLedgerSms(businessId: String, customerId: String, request: SendLedgerSmsRequest): AppResult<LedgerSmsResponse> {
        return safeApiCall {
            val response = apiService.sendLedgerSms(businessId, customerId, request)
            if (response.isSuccessful) response.body()?.data
            else throw Exception(response.errorBody()?.string() ?: "Failed to send SMS")
        }
    }

    suspend fun uploadLedgerImage(businessId: String, customerId: String, file: java.io.File): AppResult<LedgerImageUploadResponse> {
        return safeApiCall {
            val requestFile = file.asRequestBody("image/*".toMediaTypeOrNull())
            val body = MultipartBody.Part.createFormData("file", file.name, requestFile)
            val response = apiService.uploadLedgerImage(businessId, customerId, body)
            if (response.isSuccessful) response.body()?.data
            else throw Exception(response.errorBody()?.string() ?: "Failed to upload image")
        }
    }

    suspend fun getLedgerPdf(businessId: String, customerId: String): AppResult<okhttp3.ResponseBody> {
        return safeApiCall {
            val response = apiService.getLedgerPdf(businessId, customerId)
            if (response.isSuccessful) response.body()
            else throw Exception(response.errorBody()?.string() ?: "Failed to download PDF")
        }
    }

    suspend fun syncPending() {
        val pending = customerDao.getPendingSync()
        val businessId = sessionManager.getBusinessId() ?: return
        for (customer in pending) {
            try {
                val response = when (customer.syncOperation) {
                    "UPDATE" -> apiService.updateCustomer(businessId, customer.id.toString(), customer.toApiModel())
                    else -> apiService.createCustomer(businessId, customer.toApiModel())
                }
                if (response.isSuccessful) {
                    customerDao.deleteById(customer.id)
                    response.body()?.data?.let { customerDao.insert(it.toEntity()) }
                }
            } catch (_: Exception) { }
        }
    }

    private fun Customer.toEntity() = CustomerEntity(
        id = id.hashCode().toLong(),
        remoteId = id,
        name = name,
        phone = phone,
        email = email,
        gstin = gstin,
        address = address,
        city = city,
        state = state,
        pincode = pincode,
        openingBalance = openingBalance,
        creditLimit = creditLimit,
        businessId = businessId.hashCode().toLong(),
        isActive = isActive,
        createdAt = createdAt,
        updatedAt = updatedAt,
        syncStatus = "synced"
    )

    private fun CustomerEntity.toApiModel() = Customer(
        id = id.toString(),
        name = name,
        phone = phone,
        email = email,
        gstin = gstin,
        address = address,
        city = city,
        state = state,
        pincode = pincode,
        openingBalance = openingBalance,
        creditLimit = creditLimit,
        businessId = businessId.toString(),
        isActive = isActive,
        createdAt = createdAt,
        updatedAt = updatedAt
    )
}

package com.gstbilling.app.data.repository

import com.gstbilling.app.data.local.dao.CustomerDao
import com.gstbilling.app.data.local.entity.CustomerEntity
import com.gstbilling.app.data.remote.api.*
import com.gstbilling.app.util.AppResult
import com.gstbilling.app.util.NetworkMonitor
import com.gstbilling.app.util.SessionManager
import com.gstbilling.app.util.safeApiCall
import okhttp3.MediaType.Companion.toMediaTypeOrNull
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

    fun getCustomers(businessId: Long): Flow<List<CustomerEntity>> {
        return customerDao.getCustomersByBusiness(businessId)
    }

    fun searchCustomers(businessId: Long, query: String): Flow<List<CustomerEntity>> {
        return customerDao.searchCustomers(businessId, query)
    }

    suspend fun getCustomerById(id: Long): CustomerEntity? {
        return customerDao.getCustomerById(id)
    }

    suspend fun refreshCustomers(businessId: Long): AppResult<List<Customer>> {
        if (!networkMonitor.isOnline()) {
            return AppResult.Error("No internet connection")
        }
        return safeApiCall {
            val response = apiService.getCustomers(businessId)
            if (response.isSuccessful) {
                val customers = response.body()?.data ?: emptyList()
                val entities = customers.map { it.toEntity() }
                customerDao.insertAll(entities)
                customers
            } else {
                throw Exception(response.errorBody()?.string() ?: "Failed to load customers")
            }
        }
    }

    suspend fun createCustomer(customer: Customer): AppResult<Customer> {
        if (!networkMonitor.isOnline()) {
            val offlineEntity = customer.copy(id = UUID.randomUUID().mostSignificantBits and Long.MAX_VALUE)
                .toEntity().copy(syncStatus = "pending", syncOperation = "CREATE")
            customerDao.insert(offlineEntity)
            return AppResult.Success(customer)
        }
        return safeApiCall {
            val response = apiService.createCustomer(customer)
            if (response.isSuccessful) {
                val created = response.body()?.data ?: throw Exception("Failed to create customer")
                customerDao.insert(created.toEntity())
                created
            } else {
                val offlineEntity = customer.copy(id = UUID.randomUUID().mostSignificantBits and Long.MAX_VALUE)
                    .toEntity().copy(syncStatus = "pending", syncOperation = "CREATE")
                customerDao.insert(offlineEntity)
                customer
            }
        }
    }

    suspend fun updateCustomer(id: Long, customer: Customer): AppResult<Customer> {
        if (!networkMonitor.isOnline()) {
            customerDao.insert(customer.copy(id = id).toEntity().copy(syncStatus = "pending", syncOperation = "UPDATE"))
            return AppResult.Success(customer)
        }
        return safeApiCall {
            val response = apiService.updateCustomer(id, customer)
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

    suspend fun deleteCustomer(id: Long): AppResult<Unit> {
        return safeApiCall {
            val response = apiService.deleteCustomer(id)
            if (response.isSuccessful) {
                customerDao.deleteById(id)
            } else {
                throw Exception(response.errorBody()?.string() ?: "Failed to delete customer")
            }
        }
    }

    suspend fun getCustomerLedger(customerId: Long): AppResult<LedgerResponse> {
        return safeApiCall {
            val response = apiService.getCustomerLedger(customerId)
            if (response.isSuccessful) response.body()?.data
            else throw Exception(response.errorBody()?.string() ?: "Failed to load ledger")
        }
    }

    suspend fun createLedgerEntry(customerId: Long, request: CreateLedgerEntryRequest): AppResult<LedgerEntryResponse> {
        return safeApiCall {
            val response = apiService.createLedgerEntry(customerId, request)
            if (response.isSuccessful) response.body()?.data
            else throw Exception(response.errorBody()?.string() ?: "Failed to add entry")
        }
    }

    suspend fun deleteLedgerEntry(customerId: Long, transactionId: String): AppResult<Unit> {
        return safeApiCall {
            val response = apiService.deleteLedgerEntry(customerId, transactionId)
            if (!response.isSuccessful) throw Exception(response.errorBody()?.string() ?: "Failed to delete entry")
        }
    }

    suspend fun sendLedgerSms(customerId: Long, request: SendLedgerSmsRequest): AppResult<LedgerSmsResponse> {
        return safeApiCall {
            val response = apiService.sendLedgerSms(customerId, request)
            if (response.isSuccessful) response.body()?.data
            else throw Exception(response.errorBody()?.string() ?: "Failed to send SMS")
        }
    }

    suspend fun uploadLedgerImage(customerId: Long, file: java.io.File): AppResult<LedgerImageUploadResponse> {
        return safeApiCall {
            val requestFile = file.asRequestBody("image/*".toMediaTypeOrNull())
            val body = MultipartBody.Part.createFormData("file", file.name, requestFile)
            val response = apiService.uploadLedgerImage(customerId, body)
            if (response.isSuccessful) response.body()?.data
            else throw Exception(response.errorBody()?.string() ?: "Failed to upload image")
        }
    }

    suspend fun getLedgerPdf(customerId: Long): AppResult<okhttp3.ResponseBody> {
        return safeApiCall {
            val response = apiService.getLedgerPdf(customerId)
            if (response.isSuccessful) response.body()
            else throw Exception(response.errorBody()?.string() ?: "Failed to download PDF")
        }
    }

    suspend fun syncPending() {
        val pending = customerDao.getPendingSync()
        for (customer in pending) {
            try {
                val response = when (customer.syncOperation) {
                    "UPDATE" -> apiService.updateCustomer(customer.id, customer.toApiModel())
                    else -> apiService.createCustomer(customer.toApiModel())
                }
                if (response.isSuccessful) {
                    customerDao.deleteById(customer.id)
                    response.body()?.data?.let { customerDao.insert(it.toEntity()) }
                }
            } catch (_: Exception) { }
        }
    }

    private fun Customer.toEntity() = CustomerEntity(
        id = id,
        name = name,
        phone = phone,
        email = email,
        gstin = gstin,
        address = address,
        city = city,
        state = state,
        pincode = pincode,
        openingBalance = opening_balance,
        creditLimit = credit_limit,
        businessId = business_id,
        createdAt = created_at,
        updatedAt = updated_at,
        syncStatus = "synced"
    )

    private fun CustomerEntity.toApiModel() = Customer(
        id = id,
        name = name,
        phone = phone,
        email = email,
        gstin = gstin,
        address = address,
        city = city,
        state = state,
        pincode = pincode,
        opening_balance = openingBalance,
        credit_limit = creditLimit,
        business_id = businessId,
        created_at = createdAt,
        updated_at = updatedAt
    )
}

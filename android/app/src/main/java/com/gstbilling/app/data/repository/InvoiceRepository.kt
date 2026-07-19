package com.gstbilling.app.data.repository

import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import com.gstbilling.app.data.local.dao.InvoiceDao
import com.gstbilling.app.data.local.entity.InvoiceEntity
import com.gstbilling.app.data.remote.api.*
import com.gstbilling.app.util.AppResult
import com.gstbilling.app.util.NetworkMonitor
import com.gstbilling.app.util.SessionManager
import com.gstbilling.app.util.safeApiCall
import kotlinx.coroutines.flow.Flow
import java.util.*
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class InvoiceRepository @Inject constructor(
    private val apiService: ApiService,
    private val invoiceDao: InvoiceDao,
    private val sessionManager: SessionManager,
    private val networkMonitor: NetworkMonitor
) {

    fun getInvoices(businessId: String): Flow<List<InvoiceEntity>> {
        return invoiceDao.getInvoicesByBusiness(businessId.hashCode().toLong())
    }

    fun getInvoicesByStatus(businessId: String, status: String): Flow<List<InvoiceEntity>> {
        return invoiceDao.getInvoicesByStatus(businessId.hashCode().toLong(), status)
    }

    fun getInvoicesByCustomer(customerId: String): Flow<List<InvoiceEntity>> {
        return invoiceDao.getInvoicesByCustomer(customerId.hashCode().toLong())
    }

    suspend fun getInvoiceById(id: String): InvoiceEntity? {
        return invoiceDao.getInvoiceById(id.hashCode().toLong())
    }

    suspend fun refreshInvoices(businessId: String, direction: String? = null): AppResult<List<Invoice>> {
        if (!networkMonitor.isOnline()) {
            return AppResult.Error("No internet connection")
        }
        return safeApiCall {
            val response = apiService.getInvoices(businessId, direction = direction)
            if (response.isSuccessful) {
                val invoices = response.body()?.data ?: emptyList()
                val entities = invoices.map { it.toEntity() }
                invoiceDao.insertAll(entities)
                invoices
            } else {
                throw Exception(response.errorBody()?.string() ?: "Failed to load invoices")
            }
        }
    }

    suspend fun createInvoice(request: CreateInvoiceRequest): AppResult<Invoice> {
        if (!networkMonitor.isOnline()) {
            val gson = Gson()
            val itemsJson = gson.toJson(request.items)
            val tempEntity = InvoiceEntity(
                id = UUID.randomUUID().mostSignificantBits and Long.MAX_VALUE,
                customerId = request.customerId.hashCode().toLong(),
                invoiceDate = request.invoiceDate,
                dueDate = request.dueDate,
                discount = request.discount,
                notes = request.notes,
                itemsJson = itemsJson,
                syncStatus = "pending"
            )
            invoiceDao.insert(tempEntity)
            return AppResult.Success(
                Invoice(
                    id = tempEntity.id.toString(),
                    customerId = request.customerId,
                    invoiceDate = request.invoiceDate,
                    dueDate = request.dueDate,
                    discount = request.discount,
                    notes = request.notes,
                    businessId = ""
                )
            )
        }
        return safeApiCall {
            val response = apiService.createInvoice(request)
            if (response.isSuccessful) {
                val created = response.body()?.data ?: throw Exception("Failed to create invoice")
                invoiceDao.insert(created.toEntity())
                created
            } else {
                throw Exception(response.errorBody()?.string() ?: "Failed to create invoice")
            }
        }
    }

    suspend fun cancelInvoice(invoiceId: String): AppResult<Invoice> {
        return safeApiCall {
            val response = apiService.cancelInvoice(invoiceId)
            if (response.isSuccessful) {
                val cancelled = response.body()?.data ?: throw Exception("Failed to cancel invoice")
                invoiceDao.insert(cancelled.toEntity())
                cancelled
            } else {
                throw Exception(response.errorBody()?.string() ?: "Failed to cancel invoice")
            }
        }
    }

    suspend fun createCreditNote(invoiceId: String, reason: String, items: List<Long>?): AppResult<Invoice> {
        return safeApiCall {
            val response = apiService.createCreditNote(invoiceId, CreditNoteRequest(reason, items))
            if (response.isSuccessful) {
                val note = response.body()?.data ?: throw Exception("Failed to create credit note")
                invoiceDao.insert(note.toEntity())
                note
            } else {
                throw Exception(response.errorBody()?.string() ?: "Failed to create credit note")
            }
        }
    }

    suspend fun recordPayment(request: RecordPaymentRequest): AppResult<Payment> {
        return safeApiCall {
            val response = apiService.recordPayment(request)
            if (response.isSuccessful) {
                response.body()?.data ?: throw Exception("Failed to record payment")
            } else {
                throw Exception(response.errorBody()?.string() ?: "Failed to record payment")
            }
        }
    }

    suspend fun searchCustomers(businessId: String, query: String): AppResult<List<Customer>> {
        return safeApiCall {
            val response = apiService.getCustomers(businessId, search = query, perPage = 20)
            if (response.isSuccessful) {
                response.body()?.data ?: emptyList()
            } else {
                throw Exception(response.errorBody()?.string() ?: "Failed to search customers")
            }
        }
    }

    suspend fun searchProducts(businessId: String, query: String): AppResult<List<Product>> {
        return safeApiCall {
            val response = apiService.getProducts(businessId, search = query, perPage = 20)
            if (response.isSuccessful) {
                response.body()?.data ?: emptyList()
            } else {
                throw Exception(response.errorBody()?.string() ?: "Failed to search products")
            }
        }
    }

    suspend fun syncPending() {
        val gson = Gson()
        val pending = invoiceDao.getPendingSync()
        for (invoice in pending) {
            try {
                val type = object : TypeToken<List<InvoiceItemRequest>>() {}.type
                val items: List<InvoiceItemRequest> = gson.fromJson(invoice.itemsJson, type) ?: emptyList()
                val request = CreateInvoiceRequest(
                    customerId = invoice.customerId.toString(),
                    invoiceDate = invoice.invoiceDate,
                    dueDate = invoice.dueDate,
                    items = items,
                    discount = invoice.discount,
                    notes = invoice.notes
                )
                val response = apiService.createInvoice(request)
                if (response.isSuccessful) {
                    invoiceDao.deleteById(invoice.id)
                    response.body()?.data?.let { invoiceDao.insert(it.toEntity()) }
                }
            } catch (_: Exception) { }
        }
    }

    private fun Invoice.toEntity() = InvoiceEntity(
        id = id.hashCode().toLong(),
        invoiceNumber = invoiceNumber,
        customerId = customerId.hashCode().toLong(),
        customerName = customerName,
        customerGstin = customerGstin,
        customerAddress = customerAddress,
        customerPhone = customerPhone,
        customerState = customerState,
        businessId = businessId.hashCode().toLong(),
        invoiceDate = invoiceDate,
        dueDate = dueDate,
        subtotal = subtotal,
        discount = discount,
        taxableAmount = taxableAmount,
        cgst = cgst,
        sgst = sgst,
        igst = igst,
        totalAmount = totalAmount,
        roundOff = roundOff,
        status = status,
        notes = notes,
        placeOfSupply = placeOfSupply,
        reverseCharge = reverseCharge,
        poNo = poNo,
        poDate = poDate,
        challanNo = challanNo,
        challanDate = challanDate,
        lrNo = lrNo,
        paymentType = paymentType,
        paymentNote = paymentNote,
        cessTotal = cessTotal,
        totalInWords = totalInWords,
        totalQuantity = totalQuantity,
        itemsJson = items?.let { Gson().toJson(it.map { item -> InvoiceItemRequest(item.productId, item.quantity, item.unitPrice, item.discount, item.gstRate) }) } ?: "[]",
        createdAt = createdAt,
        updatedAt = updatedAt,
        syncStatus = "synced"
    )

    private fun InvoiceEntity.toApiModel() = Invoice(
        id = id.toString(),
        invoiceNumber = invoiceNumber,
        customerId = customerId.toString(),
        customerName = customerName,
        customerGstin = customerGstin,
        customerAddress = customerAddress,
        customerPhone = customerPhone,
        customerState = customerState,
        businessId = businessId.toString(),
        invoiceDate = invoiceDate,
        dueDate = dueDate,
        subtotal = subtotal,
        discount = discount,
        taxableAmount = taxableAmount,
        cgst = cgst,
        sgst = sgst,
        igst = igst,
        totalAmount = totalAmount,
        roundOff = roundOff,
        status = status,
        notes = notes,
        placeOfSupply = placeOfSupply,
        reverseCharge = reverseCharge,
        poNo = poNo,
        poDate = poDate,
        challanNo = challanNo,
        challanDate = challanDate,
        lrNo = lrNo,
        paymentType = paymentType,
        paymentNote = paymentNote,
        cessTotal = cessTotal,
        totalInWords = totalInWords,
        totalQuantity = totalQuantity,
        createdAt = createdAt,
        updatedAt = updatedAt
    )
}

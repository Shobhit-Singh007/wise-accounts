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

    fun getInvoices(businessId: Long): Flow<List<InvoiceEntity>> {
        return invoiceDao.getInvoicesByBusiness(businessId)
    }

    fun getInvoicesByStatus(businessId: Long, status: String): Flow<List<InvoiceEntity>> {
        return invoiceDao.getInvoicesByStatus(businessId, status)
    }

    fun getInvoicesByCustomer(customerId: Long): Flow<List<InvoiceEntity>> {
        return invoiceDao.getInvoicesByCustomer(customerId)
    }

    suspend fun getInvoiceById(id: Long): InvoiceEntity? {
        return invoiceDao.getInvoiceById(id)
    }

    suspend fun refreshInvoices(businessId: Long, direction: String? = null): AppResult<List<Invoice>> {
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
                customerId = request.customer_id,
                invoiceDate = request.invoice_date,
                dueDate = request.due_date,
                discount = request.discount,
                notes = request.notes,
                itemsJson = itemsJson,
                syncStatus = "pending"
            )
            invoiceDao.insert(tempEntity)
            return AppResult.Success(
                Invoice(
                    id = tempEntity.id,
                    customer_id = request.customer_id,
                    invoice_date = request.invoice_date,
                    due_date = request.due_date,
                    discount = request.discount,
                    notes = request.notes,
                    business_id = 0
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

    suspend fun cancelInvoice(invoiceId: Long): AppResult<Invoice> {
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

    suspend fun createCreditNote(invoiceId: Long, reason: String, items: List<Long>?): AppResult<Invoice> {
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

    suspend fun searchCustomers(businessId: Long, query: String): AppResult<List<Customer>> {
        return safeApiCall {
            val response = apiService.getCustomers(businessId, search = query, perPage = 20)
            if (response.isSuccessful) {
                response.body()?.data ?: emptyList()
            } else {
                throw Exception(response.errorBody()?.string() ?: "Failed to search customers")
            }
        }
    }

    suspend fun searchProducts(businessId: Long, query: String): AppResult<List<Product>> {
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
                    customer_id = invoice.customerId,
                    invoice_date = invoice.invoiceDate,
                    due_date = invoice.dueDate,
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
        id = id,
        invoiceNumber = invoice_number,
        customerId = customer_id,
        customerName = customer_name,
        customerGstin = customer_gstin,
        businessId = business_id,
        invoiceDate = invoice_date,
        dueDate = due_date,
        subtotal = subtotal,
        discount = discount,
        taxableAmount = taxable_amount,
        cgst = cgst,
        sgst = sgst,
        igst = igst,
        totalAmount = total_amount,
        roundOff = round_off,
        status = status,
        notes = notes,
        itemsJson = items?.let { Gson().toJson(it.map { item -> InvoiceItemRequest(item.product_id, item.quantity, item.unit_price, item.discount, item.gst_rate) }) } ?: "[]",
        createdAt = created_at,
        updatedAt = updated_at,
        syncStatus = "synced"
    )

    private fun InvoiceEntity.toApiModel() = Invoice(
        id = id,
        invoice_number = invoiceNumber,
        customer_id = customerId,
        customer_name = customerName,
        customer_gstin = customerGstin,
        business_id = businessId,
        invoice_date = invoiceDate,
        due_date = dueDate,
        subtotal = subtotal,
        discount = discount,
        taxable_amount = taxableAmount,
        cgst = cgst,
        sgst = sgst,
        igst = igst,
        total_amount = totalAmount,
        round_off = roundOff,
        status = status,
        notes = notes,
        created_at = createdAt,
        updated_at = updatedAt
    )
}

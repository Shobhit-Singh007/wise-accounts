package com.gstbilling.app.data.local.dao

import androidx.room.*
import com.gstbilling.app.data.local.entity.InvoiceEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface InvoiceDao {

    @Query("SELECT * FROM invoices WHERE businessId = :businessId ORDER BY invoiceDate DESC")
    fun getInvoicesByBusiness(businessId: Long): Flow<List<InvoiceEntity>>

    @Query("SELECT * FROM invoices WHERE businessId = :businessId AND status = :status ORDER BY invoiceDate DESC")
    fun getInvoicesByStatus(businessId: Long, status: String): Flow<List<InvoiceEntity>>

    @Query("SELECT * FROM invoices WHERE id = :id")
    suspend fun getInvoiceById(id: Long): InvoiceEntity?

    @Query("SELECT * FROM invoices WHERE remoteId = :remoteId")
    suspend fun getInvoiceByRemoteId(remoteId: String): InvoiceEntity?

    @Query("SELECT * FROM invoices WHERE id = :id")
    fun getInvoiceByIdFlow(id: Long): Flow<InvoiceEntity?>

    @Query("SELECT * FROM invoices WHERE customerId = :customerId ORDER BY invoiceDate DESC")
    fun getInvoicesByCustomer(customerId: Long): Flow<List<InvoiceEntity>>

    @Query("SELECT * FROM invoices WHERE businessId = :businessId AND invoiceDate BETWEEN :from AND :to ORDER BY invoiceDate DESC")
    fun getInvoicesByDateRange(businessId: Long, from: String, to: String): Flow<List<InvoiceEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(invoice: InvoiceEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(invoices: List<InvoiceEntity>)

    @Update
    suspend fun update(invoice: InvoiceEntity)

    @Delete
    suspend fun delete(invoice: InvoiceEntity)

    @Query("DELETE FROM invoices WHERE id = :id")
    suspend fun deleteById(id: Long)

    @Query("SELECT * FROM invoices WHERE syncStatus = 'pending'")
    suspend fun getPendingSync(): List<InvoiceEntity>

    @Query("UPDATE invoices SET syncStatus = :status WHERE id = :id")
    suspend fun updateSyncStatus(id: Long, status: String)

    @Query("SELECT COUNT(*) FROM invoices WHERE businessId = :businessId")
    fun getInvoiceCount(businessId: Long): Flow<Int>

    @Query("SELECT SUM(totalAmount) FROM invoices WHERE businessId = :businessId AND status = 'paid'")
    fun getTotalPaid(businessId: Long): Flow<Double?>

    @Query("SELECT SUM(totalAmount) FROM invoices WHERE businessId = :businessId AND status = 'unpaid'")
    fun getTotalUnpaid(businessId: Long): Flow<Double?>
}

package com.gstbilling.app.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "invoices")
data class InvoiceEntity(
    @PrimaryKey
    val id: Long,
    val invoiceNumber: String = "",
    val customerId: Long,
    val customerName: String? = null,
    val customerGstin: String? = null,
    val businessId: Long = 0,
    val invoiceDate: String,
    val dueDate: String? = null,
    val subtotal: Double = 0.0,
    val discount: Double = 0.0,
    val taxableAmount: Double = 0.0,
    val cgst: Double = 0.0,
    val sgst: Double = 0.0,
    val igst: Double = 0.0,
    val totalAmount: Double = 0.0,
    val roundOff: Double = 0.0,
    val status: String = "draft",
    val notes: String? = null,
    val itemsJson: String = "[]",
    val createdAt: String? = null,
    val updatedAt: String? = null,
    val syncStatus: String = "synced"
)

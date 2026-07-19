package com.gstbilling.app.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "invoices")
data class InvoiceEntity(
    @PrimaryKey
    val id: Long,
    val remoteId: String = "",
    val invoiceNumber: String = "",
    val customerId: Long,
    val customerName: String? = null,
    val customerGstin: String? = null,
    val customerAddress: String? = null,
    val customerPhone: String? = null,
    val customerState: String? = null,
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
    val placeOfSupply: String? = null,
    val reverseCharge: Boolean = false,
    val poNo: String? = null,
    val poDate: String? = null,
    val challanNo: String? = null,
    val challanDate: String? = null,
    val lrNo: String? = null,
    val paymentType: String? = null,
    val paymentNote: String? = null,
    val cessTotal: Double = 0.0,
    val totalInWords: String? = null,
    val totalQuantity: Int = 0,
    val createdAt: String? = null,
    val updatedAt: String? = null,
    val syncStatus: String = "synced"
)

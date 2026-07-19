package com.gstbilling.app.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "products")
data class ProductEntity(
    @PrimaryKey
    val id: Long,
    val remoteId: String = "",
    val name: String,
    val sku: String? = null,
    val hsnCode: String? = null,
    val unit: String? = null,
    val sellingPrice: Double = 0.0,
    val purchasePrice: Double = 0.0,
    val gstRate: Double = 0.0,
    val stock: Int = 0,
    val lowStockAlert: Int? = null,
    val categoryId: Long? = null,
    val categoryName: String? = null,
    val businessId: Long = 0,
    val createdAt: String? = null,
    val updatedAt: String? = null,
    val syncStatus: String = "synced"
)

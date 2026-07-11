package com.gstbilling.app.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "customers")
data class CustomerEntity(
    @PrimaryKey
    val id: Long,
    val name: String,
    val phone: String? = null,
    val email: String? = null,
    val gstin: String? = null,
    val address: String? = null,
    val city: String? = null,
    val state: String? = null,
    val pincode: String? = null,
    val openingBalance: Double = 0.0,
    val creditLimit: Double = 0.0,
    val businessId: Long = 0,
    val createdAt: String? = null,
    val updatedAt: String? = null,
    val syncStatus: String = "synced",
    val syncOperation: String? = null
)

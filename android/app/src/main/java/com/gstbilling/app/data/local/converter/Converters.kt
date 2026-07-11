package com.gstbilling.app.data.local.converter

import androidx.room.TypeConverter
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import com.gstbilling.app.data.remote.api.InvoiceItemRequest

class Converters {
    private val gson = Gson()

    @TypeConverter
    fun fromInvoiceItemList(value: List<InvoiceItemRequest>): String {
        return gson.toJson(value)
    }

    @TypeConverter
    fun toInvoiceItemList(value: String): List<InvoiceItemRequest> {
        val type = object : TypeToken<List<InvoiceItemRequest>>() {}.type
        return gson.fromJson(value, type) ?: emptyList()
    }
}

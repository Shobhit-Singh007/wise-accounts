package com.gstbilling.app.data.local

import androidx.room.Database
import androidx.room.RoomDatabase
import androidx.room.TypeConverters
import com.gstbilling.app.data.local.converter.Converters
import com.gstbilling.app.data.local.dao.CustomerDao
import com.gstbilling.app.data.local.dao.InvoiceDao
import com.gstbilling.app.data.local.dao.ProductDao
import com.gstbilling.app.data.local.entity.CustomerEntity
import com.gstbilling.app.data.local.entity.InvoiceEntity
import com.gstbilling.app.data.local.entity.ProductEntity

@Database(
    entities = [
        ProductEntity::class,
        CustomerEntity::class,
        InvoiceEntity::class
    ],
    version = 3,
    exportSchema = false
)
@TypeConverters(Converters::class)
abstract class AppDatabase : RoomDatabase() {
    abstract fun productDao(): ProductDao
    abstract fun customerDao(): CustomerDao
    abstract fun invoiceDao(): InvoiceDao
}

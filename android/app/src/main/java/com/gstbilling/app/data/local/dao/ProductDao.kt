package com.gstbilling.app.data.local.dao

import androidx.room.*
import com.gstbilling.app.data.local.entity.ProductEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface ProductDao {

    @Query("SELECT * FROM products WHERE businessId = :businessId ORDER BY name ASC")
    fun getProductsByBusiness(businessId: Long): Flow<List<ProductEntity>>

    @Query("SELECT * FROM products WHERE businessId = :businessId AND (name LIKE '%' || :query || '%' OR sku LIKE '%' || :query || '%') ORDER BY name ASC")
    fun searchProducts(businessId: Long, query: String): Flow<List<ProductEntity>>

    @Query("SELECT * FROM products WHERE id = :id")
    suspend fun getProductById(id: Long): ProductEntity?

    @Query("SELECT * FROM products WHERE id = :id")
    fun getProductByIdFlow(id: Long): Flow<ProductEntity?>

    @Query("SELECT * FROM products WHERE businessId = :businessId AND stock <= lowStockAlert AND lowStockAlert IS NOT NULL")
    fun getLowStockProducts(businessId: Long): Flow<List<ProductEntity>>

    @Query("DELETE FROM products WHERE businessId = :businessId AND syncStatus != 'pending'")
    suspend fun deleteSyncedByBusinessId(businessId: Long)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(product: ProductEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(products: List<ProductEntity>)

    @Update
    suspend fun update(product: ProductEntity)

    @Delete
    suspend fun delete(product: ProductEntity)

    @Query("DELETE FROM products WHERE id = :id")
    suspend fun deleteById(id: Long)

    @Query("SELECT * FROM products WHERE syncStatus = 'pending'")
    suspend fun getPendingSync(): List<ProductEntity>

    @Query("UPDATE products SET syncStatus = :status WHERE id = :id")
    suspend fun updateSyncStatus(id: Long, status: String)
}

package com.gstbilling.app.data.repository

import com.gstbilling.app.data.local.dao.ProductDao
import com.gstbilling.app.data.local.entity.ProductEntity
import com.gstbilling.app.data.remote.api.*
import com.gstbilling.app.util.AppResult
import com.gstbilling.app.util.NetworkMonitor
import com.gstbilling.app.util.SessionManager
import com.gstbilling.app.util.safeApiCall
import kotlinx.coroutines.flow.Flow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ProductRepository @Inject constructor(
    private val apiService: ApiService,
    private val productDao: ProductDao,
    private val sessionManager: SessionManager,
    private val networkMonitor: NetworkMonitor
) {

    fun getProducts(businessId: Long): Flow<List<ProductEntity>> {
        return productDao.getProductsByBusiness(businessId)
    }

    suspend fun getProductById(id: Long): ProductEntity? {
        return productDao.getProductById(id)
    }

    suspend fun refreshProducts(businessId: Long): AppResult<List<Product>> {
        return safeApiCall {
            val response = apiService.getProducts(businessId)
            if (response.isSuccessful) {
                val products = response.body()?.data ?: emptyList()
                val entities = products.map { it.toEntity() }
                productDao.insertAll(entities)
                products
            } else {
                throw Exception(response.errorBody()?.string() ?: "Failed to load products")
            }
        }
    }

    suspend fun createProduct(product: Product): AppResult<Product> {
        return safeApiCall {
            val response = apiService.createProduct(product)
            if (response.isSuccessful) {
                val created = response.body()?.data ?: throw Exception("Failed to create product")
                productDao.insert(created.toEntity())
                created
            } else {
                throw Exception(response.errorBody()?.string() ?: "Failed to create product")
            }
        }
    }

    suspend fun updateProduct(id: Long, product: Product): AppResult<Product> {
        return safeApiCall {
            val response = apiService.updateProduct(id, product)
            if (response.isSuccessful) {
                val updated = response.body()?.data ?: throw Exception("Failed to update product")
                productDao.insert(updated.toEntity())
                updated
            } else {
                throw Exception(response.errorBody()?.string() ?: "Failed to update product")
            }
        }
    }

    suspend fun deleteProduct(id: Long): AppResult<Unit> {
        return safeApiCall {
            val response = apiService.deleteProduct(id)
            if (response.isSuccessful) {
                productDao.deleteById(id)
            } else {
                throw Exception(response.errorBody()?.string() ?: "Failed to delete product")
            }
        }
    }

    suspend fun syncPending() {
        val pending = productDao.getPendingSync()
        for (product in pending) {
            try {
                val response = apiService.createProduct(product.toApiModel())
                if (response.isSuccessful) {
                    productDao.deleteById(product.id)
                    response.body()?.data?.let { productDao.insert(it.toEntity()) }
                }
            } catch (_: Exception) { }
        }
    }

    private fun Product.toEntity() = ProductEntity(
        id = id,
        name = name,
        sku = sku,
        hsnCode = hsn_code,
        unit = unit,
        sellingPrice = selling_price,
        purchasePrice = purchase_price,
        gstRate = gst_rate,
        stock = stock,
        lowStockAlert = low_stock_alert,
        categoryId = category_id,
        categoryName = category_name,
        businessId = business_id,
        createdAt = created_at,
        updatedAt = updated_at,
        syncStatus = "synced"
    )

    private fun ProductEntity.toApiModel() = Product(
        id = id,
        name = name,
        sku = sku,
        hsn_code = hsnCode,
        unit = unit,
        selling_price = sellingPrice,
        purchase_price = purchasePrice,
        gst_rate = gstRate,
        stock = stock,
        low_stock_alert = lowStockAlert,
        category_id = categoryId,
        category_name = categoryName,
        business_id = businessId,
        created_at = createdAt,
        updated_at = updatedAt
    )
}

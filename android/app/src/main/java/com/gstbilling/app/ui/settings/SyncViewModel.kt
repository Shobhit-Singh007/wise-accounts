package com.gstbilling.app.ui.settings

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.gstbilling.app.data.repository.CustomerRepository
import com.gstbilling.app.data.repository.InvoiceRepository
import com.gstbilling.app.data.repository.ProductRepository
import com.gstbilling.app.util.SessionManager
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class SyncViewModel @Inject constructor(
    private val invoiceRepository: InvoiceRepository,
    private val customerRepository: CustomerRepository,
    private val productRepository: ProductRepository,
    private val sessionManager: SessionManager
) : ViewModel() {

    var isSyncing by mutableStateOf(false)
        private set
    var lastSynced by mutableStateOf("Never")
        private set
    var errorMessage by mutableStateOf<String?>(null)
        private set

    fun syncAll() {
        if (isSyncing) return
        isSyncing = true
        errorMessage = null
        viewModelScope.launch {
            try {
                val bizId = sessionManager.getBusinessId() ?: ""
                invoiceRepository.syncPending()
                invoiceRepository.refreshInvoices(bizId)
                customerRepository.refreshCustomers(bizId)
                productRepository.refreshProducts(bizId)
                lastSynced = "Just now"
            } catch (e: Exception) {
                errorMessage = e.message ?: "Sync failed"
            } finally {
                isSyncing = false
            }
        }
    }
}

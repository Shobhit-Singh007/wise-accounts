package com.gstbilling.app.ui.inventory

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.gstbilling.app.data.local.entity.ProductEntity
import com.gstbilling.app.data.repository.ProductRepository
import com.gstbilling.app.util.AppResult
import com.gstbilling.app.util.SessionManager
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import javax.inject.Inject

enum class AlertLevel(val label: String, val color: @Composable () -> Unit) {
    CRITICAL("Critical", { MaterialTheme.colorScheme.error }),
    WARNING("Warning", { MaterialTheme.colorScheme.tertiary }),
    OK("OK", { MaterialTheme.colorScheme.primary })
}

@HiltViewModel
class LowStockAlertsViewModel @Inject constructor(
    private val productRepository: ProductRepository,
    private val sessionManager: SessionManager
) : ViewModel() {

    var products by mutableStateOf<List<ProductEntity>>(emptyList())
        private set
    var isLoading by mutableStateOf(false)
    var isRefreshing by mutableStateOf(false)
    var errorMessage by mutableStateOf<String?>(null)

    private var businessId = ""

    init {
        viewModelScope.launch {
            businessId = sessionManager.getBusinessId() ?: ""
            if (businessId.isNotEmpty()) {
                loadLowStockProducts()
            }
        }
    }

    fun loadLowStockProducts() {
        isLoading = true
        viewModelScope.launch {
            productRepository.getProducts(businessId).collect { allProducts ->
                products = allProducts.filter { p ->
                    p.lowStockAlert != null && p.stock <= p.lowStockAlert!!
                }
            }
            isLoading = false
        }
    }

    fun refresh() {
        isRefreshing = true
        viewModelScope.launch {
            productRepository.refreshProducts(businessId)
            isRefreshing = false
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LowStockAlertsScreen(
    onBack: () -> Unit,
    onProductClick: (String) -> Unit,
    viewModel: LowStockAlertsViewModel = hiltViewModel()
) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Low Stock Alerts") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    IconButton(onClick = { viewModel.refresh() }) {
                        Icon(Icons.Default.Refresh, contentDescription = "Refresh")
                    }
                }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            if (viewModel.isLoading) {
                LinearProgressIndicator(modifier = Modifier.fillMaxWidth())
            }

            val lowStockProducts = viewModel.products
            if (lowStockProducts.isEmpty() && !viewModel.isLoading) {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(
                            Icons.Default.CheckCircle,
                            contentDescription = null,
                            modifier = Modifier.size(64.dp),
                            tint = MaterialTheme.colorScheme.primary
                        )
                        Spacer(modifier = Modifier.height(16.dp))
                        Text(
                            "All stock levels are good!",
                            style = MaterialTheme.typography.bodyLarge,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            "No products below threshold",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            } else {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    item {
                        Card(
                            colors = CardDefaults.cardColors(
                                containerColor = MaterialTheme.colorScheme.errorContainer
                            ),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Row(
                                modifier = Modifier.padding(16.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(
                                    Icons.Default.Warning,
                                    contentDescription = null,
                                    tint = MaterialTheme.colorScheme.error
                                )
                                Spacer(modifier = Modifier.width(12.dp))
                                Text(
                                    "${lowStockProducts.size} product(s) need attention",
                                    style = MaterialTheme.typography.bodyMedium,
                                    fontWeight = FontWeight.Bold,
                                    color = MaterialTheme.colorScheme.onErrorContainer
                                )
                            }
                        }
                    }
                    items(lowStockProducts, key = { it.id }) { product ->
                        LowStockItem(
                            product = product,
                            onClick = { onProductClick(product.remoteId.ifEmpty { product.id.toString() }) }
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun LowStockItem(
    product: ProductEntity,
    onClick: () -> Unit
) {
    val threshold = product.lowStockAlert ?: 0
    val ratio = if (threshold > 0) product.stock.toFloat() / threshold else 0f
    val level = when {
        product.stock == 0 -> "OUT OF STOCK" to MaterialTheme.colorScheme.error
        ratio <= 0.5f -> "CRITICAL" to MaterialTheme.colorScheme.error
        ratio <= 0.8f -> "WARNING" to MaterialTheme.colorScheme.tertiary
        else -> "LOW" to MaterialTheme.colorScheme.primary
    }

    Card(
        onClick = onClick,
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                Icons.Default.Inventory2,
                contentDescription = null,
                tint = level.second,
                modifier = Modifier.size(40.dp)
            )
            Spacer(modifier = Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = product.name,
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold,
                    maxLines = 1
                )
                Text(
                    text = "Stock: ${product.stock} ${product.unit ?: ""}  |  Threshold: $threshold",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            Column(horizontalAlignment = Alignment.End) {
                AssistChip(
                    onClick = {},
                    label = {
                        Text(
                            level.first,
                            style = MaterialTheme.typography.labelSmall,
                            color = level.second
                        )
                    },
                    colors = AssistChipDefaults.assistChipColors(
                        containerColor = level.second.copy(alpha = 0.12f)
                    ),
                    border = null
                )
            }
        }
    }
}

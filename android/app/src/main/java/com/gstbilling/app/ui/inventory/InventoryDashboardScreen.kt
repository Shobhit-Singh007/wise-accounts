package com.gstbilling.app.ui.inventory

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.gstbilling.app.data.remote.api.*
import com.gstbilling.app.util.SessionManager
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class InventoryDashboardViewModel @Inject constructor(
    private val apiService: ApiService,
    private val sessionManager: SessionManager
) : ViewModel() {

    var dashboard by mutableStateOf<InventoryDashboard?>(null)
    var isLoading by mutableStateOf(false)
    var errorMessage by mutableStateOf<String?>(null)

    init {
        loadDashboard()
    }

    fun loadDashboard() {
        viewModelScope.launch {
            isLoading = true
            errorMessage = null
            val businessId = sessionManager.getBusinessId()
            if (businessId != null) {
                try {
                    val response = apiService.getInventoryDashboard(businessId)
                    if (response.isSuccessful) {
                        dashboard = response.body()?.data
                    } else {
                        errorMessage = response.errorBody()?.string() ?: "Failed to load dashboard"
                    }
                } catch (e: Exception) {
                    errorMessage = e.message ?: "Network error"
                }
            }
            isLoading = false
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun InventoryDashboardScreen(
    onBack: () -> Unit,
    onNavigateToStockMovements: () -> Unit = {},
    onNavigateToLowStock: () -> Unit = {},
    viewModel: InventoryDashboardViewModel = hiltViewModel()
) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Inventory Dashboard") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    IconButton(onClick = { viewModel.loadDashboard() }) {
                        Icon(Icons.Default.Refresh, contentDescription = "Refresh")
                    }
                }
            )
        }
    ) { padding ->
        if (viewModel.isLoading) {
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator()
            }
        } else {
            val data = viewModel.dashboard
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .padding(horizontal = 16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                item { Spacer(modifier = Modifier.height(4.dp)) }

                // Summary Cards Row 1
                item {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        DashboardStatCard(
                            title = "Total Products",
                            value = "${data?.totalProducts ?: 0}",
                            icon = Icons.Default.Inventory2,
                            color = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.weight(1f)
                        )
                        DashboardStatCard(
                            title = "Stock Value",
                            value = "₹${String.format("%.0f", data?.stockValue ?: 0.0)}",
                            icon = Icons.Default.AccountBalanceWallet,
                            color = MaterialTheme.colorScheme.tertiary,
                            modifier = Modifier.weight(1f)
                        )
                    }
                }

                // Summary Cards Row 2
                item {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        DashboardStatCard(
                            title = "Retail Value",
                            value = "₹${String.format("%.0f", data?.retailValue ?: 0.0)}",
                            icon = Icons.Default.Storefront,
                            color = Color(0xFF2E7D32),
                            modifier = Modifier.weight(1f)
                        )
                        DashboardStatCard(
                            title = "Potential Profit",
                            value = "₹${String.format("%.0f", data?.potentialProfit ?: 0.0)}",
                            icon = Icons.Default.TrendingUp,
                            color = Color(0xFF1565C0),
                            modifier = Modifier.weight(1f)
                        )
                    }
                }

                // Summary Cards Row 3
                item {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        DashboardStatCard(
                            title = "Low Stock",
                            value = "${data?.lowStockCount ?: 0}",
                            icon = Icons.Default.Warning,
                            color = Color(0xFFE65100),
                            modifier = Modifier.weight(1f),
                            onClick = onNavigateToLowStock
                        )
                        DashboardStatCard(
                            title = "Out of Stock",
                            value = "${data?.outOfStockCount ?: 0}",
                            icon = Icons.Default.ErrorOutline,
                            color = Color(0xFFC62828),
                            modifier = Modifier.weight(1f),
                            onClick = onNavigateToLowStock
                        )
                    }
                }

                // Stock by Warehouse
                item {
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = "Stock by Warehouse",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                }
                if (data?.stockByWarehouse.isNullOrEmpty()) {
                    item {
                        EmptyWarehousePlaceholder()
                    }
                } else {
                    items(data?.stockByWarehouse ?: emptyList()) { warehouse ->
                        WarehouseStockCard(warehouse, data?.stockValue ?: 1.0)
                    }
                }

                // Recent Stock Movements
                item {
                    Spacer(modifier = Modifier.height(4.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "Recent Stock Movements",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold
                        )
                        TextButton(onClick = onNavigateToStockMovements) {
                            Text("View All")
                        }
                    }
                }
                if (data?.recentMovements.isNullOrEmpty()) {
                    item {
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            colors = CardDefaults.cardColors(
                                containerColor = MaterialTheme.colorScheme.surfaceVariant
                            )
                        ) {
                            Text(
                                "No recent movements",
                                modifier = Modifier.padding(16.dp),
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                } else {
                    items(data?.recentMovements?.take(5) ?: emptyList()) { movement ->
                        StockMovementCard(movement)
                    }
                }

                // Low Stock Alerts
                if (!data?.lowStockAlerts.isNullOrEmpty()) {
                    item {
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = "Low Stock Alerts",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.error
                        )
                    }
                    items(data?.lowStockAlerts?.take(10) ?: emptyList()) { alert ->
                        LowStockAlertCard(alert)
                    }
                }

                item { Spacer(modifier = Modifier.height(16.dp)) }
            }
        }
    }
}

@Composable
fun DashboardStatCard(
    title: String,
    value: String,
    icon: ImageVector,
    color: Color,
    modifier: Modifier = Modifier,
    onClick: (() -> Unit)? = null
) {
    val cardModifier = if (onClick != null) {
        modifier.clickable(onClick = onClick)
    } else {
        modifier
    }
    Card(modifier = cardModifier) {
        Column(
            modifier = Modifier.padding(16.dp)
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = color,
                modifier = Modifier.size(28.dp)
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = value,
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.Bold,
                color = color
            )
            Text(
                text = title,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

@Composable
fun WarehouseStockCard(warehouse: WarehouseStock, totalStockValue: Double) {
    val percentage = if (totalStockValue > 0) (warehouse.value / totalStockValue * 100).coerceIn(0.0, 100.0) else 0.0

    Card(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(12.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    warehouse.warehouse,
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    "₹${String.format("%.2f", warehouse.value)}",
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.primary
                )
            }
            Spacer(modifier = Modifier.height(8.dp))
            LinearProgressIndicator(
                progress = { (percentage / 100f).toFloat() },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(8.dp),
                color = MaterialTheme.colorScheme.primary,
                trackColor = MaterialTheme.colorScheme.surfaceVariant,
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                "${String.format("%.1f", percentage)}% of total stock value",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

@Composable
fun StockMovementCard(movement: StockMovement) {
    val typeColor = when (movement.type.uppercase()) {
        "IN", "PURCHASE", "RECEIVED" -> Color(0xFF2E7D32)
        "OUT", "SALE", "ISSUED" -> MaterialTheme.colorScheme.error
        "TRANSFER" -> Color(0xFF1565C0)
        "ADJUSTMENT" -> Color(0xFFE65100)
        else -> MaterialTheme.colorScheme.onSurfaceVariant
    }
    val typeIcon = when (movement.type.uppercase()) {
        "IN", "PURCHASE", "RECEIVED" -> Icons.Default.ArrowDownward
        "OUT", "SALE", "ISSUED" -> Icons.Default.ArrowUpward
        "TRANSFER" -> Icons.Default.SwapHoriz
        "ADJUSTMENT" -> Icons.Default.Tune
        else -> Icons.Default.Circle
    }

    Card(modifier = Modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                typeIcon,
                contentDescription = null,
                tint = typeColor,
                modifier = Modifier.size(32.dp)
            )
            Spacer(modifier = Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    movement.productName,
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.Bold,
                    maxLines = 1
                )
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Text(
                        movement.warehouseName,
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Text(
                        "Batch: ${movement.batchNo ?: "N/A"}",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
            Column(horizontalAlignment = Alignment.End) {
                Text(
                    "${if (movement.type.uppercase() in listOf("OUT", "SALE", "ISSUED")) "-" else "+"}${movement.quantity}",
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold,
                    color = typeColor
                )
                Text(
                    movement.date,
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
    }
}

@Composable
fun LowStockAlertCard(alert: LowStockAlertItem) {
    val ratio = if (alert.threshold > 0) alert.currentStock.toFloat() / alert.threshold else 0f
    val level = when {
        alert.currentStock == 0 -> "OUT OF STOCK" to MaterialTheme.colorScheme.error
        ratio <= 0.5f -> "CRITICAL" to MaterialTheme.colorScheme.error
        ratio <= 0.8f -> "WARNING" to MaterialTheme.colorScheme.tertiary
        else -> "LOW" to MaterialTheme.colorScheme.primary
    }

    Card(modifier = Modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                Icons.Default.Warning,
                contentDescription = null,
                tint = level.second,
                modifier = Modifier.size(24.dp)
            )
            Spacer(modifier = Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    alert.productName,
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.Bold,
                    maxLines = 1
                )
                Text(
                    "Stock: ${alert.currentStock} ${alert.unit ?: ""} | Threshold: ${alert.threshold}",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
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

@Composable
fun EmptyWarehousePlaceholder() {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant
        )
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Icon(
                Icons.Default.Warehouse,
                contentDescription = null,
                modifier = Modifier.size(40.dp),
                tint = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                "No warehouses configured",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

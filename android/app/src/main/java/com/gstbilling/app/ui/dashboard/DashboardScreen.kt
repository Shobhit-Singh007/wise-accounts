package com.gstbilling.app.ui.dashboard

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
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
import com.gstbilling.app.data.local.entity.InvoiceEntity
import com.gstbilling.app.data.remote.api.DashboardData
import com.gstbilling.app.data.repository.BusinessRepository
import com.gstbilling.app.data.repository.InvoiceRepository
import com.gstbilling.app.util.AppResult
import com.gstbilling.app.util.SessionManager
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class DashboardViewModel @Inject constructor(
    private val businessRepository: BusinessRepository,
    private val invoiceRepository: InvoiceRepository,
    private val sessionManager: SessionManager
) : ViewModel() {

    var dashboardData by mutableStateOf<DashboardData?>(null)
    var isLoading by mutableStateOf(true)
    var errorMessage by mutableStateOf<String?>(null)
    var invoices by mutableStateOf<List<InvoiceEntity>>(emptyList())
        private set

    init {
        viewModelScope.launch {
            sessionManager.getBusinessId()?.let { id ->
                invoiceRepository.getInvoices(id).collect { invoices = it }
            }
        }
        loadDashboard()
    }

    fun loadDashboard() {
        viewModelScope.launch {
            isLoading = true
            when (val result = businessRepository.getDashboard()) {
                is AppResult.Success -> {
                    dashboardData = result.data
                    isLoading = false
                }
                is AppResult.Error -> {
                    errorMessage = result.message
                    isLoading = false
                }
                is AppResult.Loading -> { }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DashboardScreen(
    onNavigateToCustomers: () -> Unit,
    onNavigateToProducts: () -> Unit,
    onNavigateToCreateInvoice: () -> Unit,
    onNavigateToInvoices: () -> Unit,
    onNavigateToReports: () -> Unit,
    onNavigateToSettings: () -> Unit,
    onNavigateToStaff: () -> Unit = {},
    onNavigateToAddCustomer: () -> Unit = {},
    onNavigateToAddProduct: () -> Unit = {},
    onNavigateToNotifications: () -> Unit = {},
    onNavigateToBarcodeScanner: () -> Unit = {},
    onNavigateToStockTransfer: () -> Unit = {},
    onNavigateToBatchExpiry: () -> Unit = {},
    onNavigateToCustomerGroups: () -> Unit = {},
    onNavigateToInventoryDashboard: () -> Unit = {},
    onInvoiceClick: (String) -> Unit = {},
    viewModel: DashboardViewModel = hiltViewModel()
) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Dashboard") },
                actions = {
                    IconButton(onClick = onNavigateToNotifications) {
                        Icon(Icons.Default.Notifications, contentDescription = "Notifications")
                    }
                    IconButton(onClick = onNavigateToSettings) {
                        Icon(Icons.Default.Settings, contentDescription = "Settings")
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
        } else if (viewModel.errorMessage != null) {
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(
                        text = viewModel.errorMessage ?: "Failed to load dashboard",
                        style = MaterialTheme.typography.bodyLarge,
                        color = MaterialTheme.colorScheme.error
                    )
                    Spacer(modifier = Modifier.height(16.dp))
                    OutlinedButton(onClick = { viewModel.loadDashboard() }) {
                        Text("Retry")
                    }
                }
            }
        } else {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .padding(horizontal = 16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                item { Spacer(modifier = Modifier.height(4.dp)) }

                item {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        val totalSales = viewModel.dashboardData?.totalSales ?: 0.0
                        val totalCustomers = viewModel.dashboardData?.totalCustomers ?: 0
                        DashboardCard(
                            title = "Sales",
                            value = "₹${String.format("%.0f", totalSales)}",
                            icon = Icons.Default.TrendingUp,
                            color = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.weight(1f)
                        )
                        DashboardCard(
                            title = "Customers",
                            value = "$totalCustomers",
                            icon = Icons.Default.People,
                            color = MaterialTheme.colorScheme.tertiary,
                            modifier = Modifier.weight(1f)
                        )
                    }
                }

                item {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        val totalProducts = viewModel.dashboardData?.totalProducts ?: 0
                        val pendingAmount = viewModel.dashboardData?.pendingAmount ?: 0.0
                        DashboardCard(
                            title = "Products",
                            value = "$totalProducts",
                            icon = Icons.Default.Inventory2,
                            color = MaterialTheme.colorScheme.secondary,
                            modifier = Modifier.weight(1f)
                        )
                        DashboardCard(
                            title = "Pending",
                            value = "₹${String.format("%.0f", pendingAmount)}",
                            icon = Icons.Default.PendingActions,
                            color = MaterialTheme.colorScheme.error,
                            modifier = Modifier.weight(1f)
                        )
                    }
                }

                item {
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = "Quick Actions",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                }

                item {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        ActionButton(
                            title = "New Invoice",
                            icon = Icons.Default.AddShoppingCart,
                            onClick = onNavigateToCreateInvoice,
                            modifier = Modifier.weight(1f)
                        )
                        ActionButton(
                            title = "Add Customer",
                            icon = Icons.Default.PersonAdd,
                            onClick = onNavigateToAddCustomer,
                            modifier = Modifier.weight(1f)
                        )
                        ActionButton(
                            title = "Add Product",
                            icon = Icons.Default.AddBox,
                            onClick = onNavigateToAddProduct,
                            modifier = Modifier.weight(1f)
                        )
                    }
                }

                item {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        ActionButton(
                            title = "Staff",
                            icon = Icons.Default.Groups,
                            onClick = onNavigateToStaff,
                            modifier = Modifier.weight(1f)
                        )
                        ActionButton(
                            title = "Scan",
                            icon = Icons.Default.QrCodeScanner,
                            onClick = onNavigateToBarcodeScanner,
                            modifier = Modifier.weight(1f)
                        )
                        ActionButton(
                            title = "Transfer",
                            icon = Icons.Default.SwapHoriz,
                            onClick = onNavigateToStockTransfer,
                            modifier = Modifier.weight(1f)
                        )
                    }
                }

                item {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        ActionButton(
                            title = "Groups",
                            icon = Icons.Default.GroupWork,
                            onClick = onNavigateToCustomerGroups,
                            modifier = Modifier.weight(1f)
                        )
                        ActionButton(
                            title = "Expiry",
                            icon = Icons.Default.Timer,
                            onClick = onNavigateToBatchExpiry,
                            modifier = Modifier.weight(1f)
                        )
                        ActionButton(
                            title = "Inventory",
                            icon = Icons.Default.Inventory2,
                            onClick = onNavigateToInventoryDashboard,
                            modifier = Modifier.weight(1f)
                        )
                    }
                }

                item {
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = "Recent Invoices",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                }

                val recentInvoices = viewModel.dashboardData?.recentInvoices ?: emptyList()
                if (recentInvoices.isEmpty()) {
                    item {
                        Text(
                            text = "No invoices yet",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.padding(vertical = 16.dp)
                        )
                    }
                } else {
                    items(recentInvoices.size) { index ->
                        val invoice = recentInvoices[index]
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            onClick = { onInvoiceClick(invoice.id) }
                        ) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(16.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column {
                                    Text(
                                        text = invoice.invoiceNumber,
                                        style = MaterialTheme.typography.titleSmall,
                                        fontWeight = FontWeight.Bold
                                    )
                                    Text(
                                        text = invoice.customerName ?: "Walk-in Customer",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }
                                Column(horizontalAlignment = Alignment.End) {
                                    Text(
                                        text = "₹${String.format("%.0f", invoice.totalAmount)}",
                                        style = MaterialTheme.typography.titleSmall,
                                        fontWeight = FontWeight.Bold
                                    )
                                    Text(
                                        text = invoice.status.replaceFirstChar { it.uppercase() },
                                        style = MaterialTheme.typography.labelSmall,
                                        color = when (invoice.status) {
                                            "paid" -> Color(0xFF2E7D32)
                                            "unpaid" -> MaterialTheme.colorScheme.error
                                            else -> MaterialTheme.colorScheme.onSurfaceVariant
                                        }
                                    )
                                }
                            }
                        }
                    }
                }

                item {
                    Spacer(modifier = Modifier.height(16.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        OutlinedButton(
                            onClick = onNavigateToInvoices,
                            modifier = Modifier.weight(1f)
                        ) {
                            Text("View All Invoices")
                        }
                        OutlinedButton(
                            onClick = onNavigateToReports,
                            modifier = Modifier.weight(1f)
                        ) {
                            Text("Reports")
                        }
                    }
                    Spacer(modifier = Modifier.height(16.dp))
                }
            }
        }
    }
}

@Composable
fun DashboardCard(
    title: String,
    value: String,
    icon: ImageVector,
    color: Color,
    modifier: Modifier = Modifier
) {
    Card(modifier = modifier) {
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
fun ActionButton(
    title: String,
    icon: ImageVector,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier.clickable(onClick = onClick),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.primaryContainer
        )
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.onPrimaryContainer,
                modifier = Modifier.size(24.dp)
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = title,
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onPrimaryContainer
            )
        }
    }
}

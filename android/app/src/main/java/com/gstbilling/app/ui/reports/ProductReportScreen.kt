package com.gstbilling.app.ui.reports

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.gstbilling.app.data.remote.api.ApiService
import com.gstbilling.app.data.remote.api.ProductReportEntry
import com.gstbilling.app.data.remote.api.ProductReportResponse
import com.gstbilling.app.util.AppResult
import com.gstbilling.app.util.SessionManager
import com.gstbilling.app.util.safeApiCall
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.*
import javax.inject.Inject

@HiltViewModel
class ProductReportViewModel @Inject constructor(
    private val apiService: ApiService,
    private val sessionManager: SessionManager
) : ViewModel() {

    var productReport by mutableStateOf<ProductReportResponse?>(null)
    var isLoading by mutableStateOf(false)
    var errorMessage by mutableStateOf<String?>(null)
    var startDate by mutableStateOf<String?>(null)
    var endDate by mutableStateOf<String?>(null)
    var showStartPicker by mutableStateOf(false)
    var showEndPicker by mutableStateOf(false)

    init {
        loadProductReport()
    }

    fun loadProductReport() {
        viewModelScope.launch {
            isLoading = true
            errorMessage = null
            val businessId = sessionManager.getBusinessId()
            if (businessId != null) {
                when (val result = safeApiCall {
                    apiService.getProductReport(businessId, from = startDate, to = endDate).body()?.data
                }) {
                    is AppResult.Success -> {
                        productReport = result.data
                    }
                    is AppResult.Error -> {
                        errorMessage = result.message
                    }
                    is AppResult.Loading -> {}
                }
            }
            isLoading = false
        }
    }

    fun onStartDateSelected(year: Int, month: Int, day: Int) {
        startDate = String.format("%04d-%02d-%02d", year, month + 1, day)
        showStartPicker = false
        loadProductReport()
    }

    fun onEndDateSelected(year: Int, month: Int, day: Int) {
        endDate = String.format("%04d-%02d-%02d", year, month + 1, day)
        showEndPicker = false
        loadProductReport()
    }

    fun clearDateRange() {
        startDate = null
        endDate = null
        loadProductReport()
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProductReportScreen(
    onBack: () -> Unit,
    viewModel: ProductReportViewModel = hiltViewModel()
) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Product Report") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    IconButton(onClick = { viewModel.loadProductReport() }) {
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
                .padding(horizontal = 16.dp)
        ) {
            DateRangeHeader(
                startDate = viewModel.startDate,
                endDate = viewModel.endDate,
                onStartClick = { viewModel.showStartPicker = true },
                onEndClick = { viewModel.showEndPicker = true },
                onClear = { viewModel.clearDateRange() }
            )

            if (viewModel.showStartPicker) {
                val datePickerState = rememberDatePickerState()
                DatePickerDialog(
                    onDismissRequest = { viewModel.showStartPicker = false },
                    confirmButton = {
                        TextButton(onClick = {
                            datePickerState.selectedDateMillis?.let { millis ->
                                val cal = Calendar.getInstance().apply { timeInMillis = millis }
                                viewModel.onStartDateSelected(
                                    cal.get(Calendar.YEAR),
                                    cal.get(Calendar.MONTH),
                                    cal.get(Calendar.DAY_OF_MONTH)
                                )
                            }
                        }) {
                            Text("OK")
                        }
                    },
                    dismissButton = {
                        TextButton(onClick = { viewModel.showStartPicker = false }) {
                            Text("Cancel")
                        }
                    }
                ) {
                    DatePicker(state = datePickerState)
                }
            }

            if (viewModel.showEndPicker) {
                val datePickerState = rememberDatePickerState()
                DatePickerDialog(
                    onDismissRequest = { viewModel.showEndPicker = false },
                    confirmButton = {
                        TextButton(onClick = {
                            datePickerState.selectedDateMillis?.let { millis ->
                                val cal = Calendar.getInstance().apply { timeInMillis = millis }
                                viewModel.onEndDateSelected(
                                    cal.get(Calendar.YEAR),
                                    cal.get(Calendar.MONTH),
                                    cal.get(Calendar.DAY_OF_MONTH)
                                )
                            }
                        }) {
                            Text("OK")
                        }
                    },
                    dismissButton = {
                        TextButton(onClick = { viewModel.showEndPicker = false }) {
                            Text("Cancel")
                        }
                    }
                ) {
                    DatePicker(state = datePickerState)
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            when {
                viewModel.isLoading -> {
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center
                    ) {
                        CircularProgressIndicator()
                    }
                }
                viewModel.errorMessage != null -> {
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Icon(
                                Icons.Default.ErrorOutline,
                                contentDescription = null,
                                modifier = Modifier.size(64.dp),
                                tint = MaterialTheme.colorScheme.error
                            )
                            Spacer(modifier = Modifier.height(12.dp))
                            Text(
                                text = viewModel.errorMessage ?: "Error",
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.error
                            )
                            Spacer(modifier = Modifier.height(12.dp))
                            Button(onClick = { viewModel.loadProductReport() }) {
                                Text("Retry")
                            }
                        }
                    }
                }
                else -> {
                    val report = viewModel.productReport
                    if (report == null) {
                        Box(
                            modifier = Modifier.fillMaxSize(),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = "No product report data available",
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    } else {
                        LazyColumn(
                            verticalArrangement = Arrangement.spacedBy(8.dp),
                            contentPadding = PaddingValues(bottom = 16.dp)
                        ) {
                            if (report.top_products.isNotEmpty()) {
                                item {
                                    Text(
                                        text = "Top Products",
                                        style = MaterialTheme.typography.titleMedium,
                                        fontWeight = FontWeight.Bold
                                    )
                                }
                                items(report.top_products.take(5)) { product ->
                                    TopProductCard(product)
                                }
                                item { Spacer(modifier = Modifier.height(8.dp)) }
                            }

                            item {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Text(
                                        text = "All Products (${report.products.size})",
                                        style = MaterialTheme.typography.titleMedium,
                                        fontWeight = FontWeight.Bold
                                    )
                                    Text(
                                        text = "Revenue: ₹${String.format("%.2f", report.products.sumOf { it.revenue })}",
                                        style = MaterialTheme.typography.bodySmall,
                                        fontWeight = FontWeight.Bold,
                                        color = MaterialTheme.colorScheme.primary
                                    )
                                }
                            }

                            item {
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(vertical = 8.dp),
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Text(
                                        "Product",
                                        style = MaterialTheme.typography.labelMedium,
                                        fontWeight = FontWeight.Bold,
                                        modifier = Modifier.weight(1.5f)
                                    )
                                    Text(
                                        "Qty Sold",
                                        style = MaterialTheme.typography.labelMedium,
                                        fontWeight = FontWeight.Bold,
                                        modifier = Modifier.weight(0.8f)
                                    )
                                    Text(
                                        "Revenue",
                                        style = MaterialTheme.typography.labelMedium,
                                        fontWeight = FontWeight.Bold,
                                        modifier = Modifier.weight(1f)
                                    )
                                    Text(
                                        "Tax",
                                        style = MaterialTheme.typography.labelMedium,
                                        fontWeight = FontWeight.Bold,
                                        modifier = Modifier.weight(0.8f)
                                    )
                                    Text(
                                        "Invoices",
                                        style = MaterialTheme.typography.labelMedium,
                                        fontWeight = FontWeight.Bold,
                                        modifier = Modifier.weight(0.8f)
                                    )
                                }
                                HorizontalDivider(modifier = Modifier.padding(bottom = 4.dp))
                            }

                            items(report.products) { product ->
                                ProductReportRow(product)
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun DateRangeHeader(
    startDate: String?,
    endDate: String?,
    onStartClick: () -> Unit,
    onEndClick: () -> Unit,
    onClear: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 8.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        OutlinedButton(
            onClick = onStartClick,
            modifier = Modifier.weight(1f)
        ) {
            Icon(Icons.Default.CalendarToday, contentDescription = null, modifier = Modifier.size(16.dp))
            Spacer(modifier = Modifier.width(6.dp))
            Text(
                text = startDate ?: "From",
                style = MaterialTheme.typography.bodySmall
            )
        }
        OutlinedButton(
            onClick = onEndClick,
            modifier = Modifier.weight(1f)
        ) {
            Icon(Icons.Default.CalendarMonth, contentDescription = null, modifier = Modifier.size(16.dp))
            Spacer(modifier = Modifier.width(6.dp))
            Text(
                text = endDate ?: "To",
                style = MaterialTheme.typography.bodySmall
            )
        }
        if (startDate != null || endDate != null) {
            IconButton(onClick = onClear) {
                Icon(Icons.Default.Clear, contentDescription = "Clear dates")
            }
        }
    }
}

@Composable
private fun TopProductCard(product: ProductReportEntry) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.3f)
        )
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                Icons.Default.EmojiEvents,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.primary,
                modifier = Modifier.size(24.dp)
            )
            Spacer(modifier = Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = product.product_name,
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.Medium
                )
                Text(
                    text = "${product.quantity_sold} units · ${product.invoice_count} invoices",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            Text(
                text = "₹${String.format("%.2f", product.revenue)}",
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.primary
            )
        }
    }
}

@Composable
private fun ProductReportRow(product: ProductReportEntry) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1.5f)) {
                Text(
                    text = product.product_name,
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.Medium
                )
                if (product.sku != null) {
                    Text(
                        text = product.sku,
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
            Text(
                text = "${product.quantity_sold}",
                style = MaterialTheme.typography.bodyMedium,
                modifier = Modifier.weight(0.8f)
            )
            Text(
                text = "₹${String.format("%.2f", product.revenue)}",
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.weight(1f)
            )
            Text(
                text = "₹${String.format("%.2f", product.tax)}",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.weight(0.8f)
            )
            Text(
                text = "${product.invoice_count}",
                style = MaterialTheme.typography.bodyMedium,
                modifier = Modifier.weight(0.8f)
            )
        }
    }
}

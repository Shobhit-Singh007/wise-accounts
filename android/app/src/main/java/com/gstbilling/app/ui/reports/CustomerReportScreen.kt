package com.gstbilling.app.ui.reports

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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.gstbilling.app.data.remote.api.ApiService
import com.gstbilling.app.data.remote.api.CustomerReport
import com.gstbilling.app.util.AppResult
import com.gstbilling.app.util.SessionManager
import com.gstbilling.app.util.safeApiCall
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class CustomerReportViewModel @Inject constructor(
    private val apiService: ApiService,
    private val sessionManager: SessionManager
) : ViewModel() {

    var customerReport by mutableStateOf<List<CustomerReport>>(emptyList())
    var isLoading by mutableStateOf(false)
    var errorMessage by mutableStateOf<String?>(null)
    var searchQuery by mutableStateOf("")

    init {
        loadCustomerReport()
    }

    fun loadCustomerReport() {
        viewModelScope.launch {
            isLoading = true
            errorMessage = null
            val businessId = sessionManager.getBusinessId()
            if (businessId != null) {
                when (val result = safeApiCall { apiService.getCustomerReport(businessId).body()?.data }) {
                    is AppResult.Success -> {
                        customerReport = result.data ?: emptyList()
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

    val filteredCustomers: List<CustomerReport>
        get() {
            if (searchQuery.isBlank()) return customerReport
            return customerReport.filter {
                it.customer_name.contains(searchQuery, ignoreCase = true)
            }
        }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CustomerReportScreen(
    onBack: () -> Unit,
    viewModel: CustomerReportViewModel = hiltViewModel()
) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Customer Report") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    IconButton(onClick = { viewModel.loadCustomerReport() }) {
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
            OutlinedTextField(
                value = viewModel.searchQuery,
                onValueChange = { viewModel.searchQuery = it },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 12.dp),
                placeholder = { Text("Search customers...") },
                leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
                trailingIcon = {
                    if (viewModel.searchQuery.isNotEmpty()) {
                        IconButton(onClick = { viewModel.searchQuery = "" }) {
                            Icon(Icons.Default.Clear, contentDescription = "Clear")
                        }
                    }
                },
                singleLine = true
            )

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
                            Button(onClick = { viewModel.loadCustomerReport() }) {
                                Text("Retry")
                            }
                        }
                    }
                }
                else -> {
                    val customers = viewModel.filteredCustomers
                    if (customers.isEmpty()) {
                        Box(
                            modifier = Modifier.fillMaxSize(),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = if (viewModel.searchQuery.isNotBlank()) "No customers found" else "No customer data available",
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    } else {
                        LazyColumn(
                            verticalArrangement = Arrangement.spacedBy(8.dp),
                            contentPadding = PaddingValues(bottom = 16.dp)
                        ) {
                            item {
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(vertical = 8.dp),
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Text(
                                        text = "${customers.size} customers",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                    Text(
                                        text = "Total: ₹${String.format("%.2f", customers.sumOf { it.total_amount })}",
                                        style = MaterialTheme.typography.bodySmall,
                                        fontWeight = FontWeight.Bold,
                                        color = MaterialTheme.colorScheme.primary
                                    )
                                }
                            }

                            item {
                                Card(
                                    modifier = Modifier.fillMaxWidth(),
                                    colors = CardDefaults.cardColors(
                                        containerColor = MaterialTheme.colorScheme.errorContainer.copy(alpha = 0.3f)
                                    )
                                ) {
                                    Row(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .padding(12.dp),
                                        horizontalArrangement = Arrangement.SpaceBetween
                                    ) {
                                        Text(
                                            "Total Outstanding",
                                            style = MaterialTheme.typography.bodyMedium
                                        )
                                        Text(
                                            "₹${String.format("%.2f", customers.sumOf { it.outstanding })}",
                                            style = MaterialTheme.typography.bodyMedium,
                                            fontWeight = FontWeight.Bold,
                                            color = MaterialTheme.colorScheme.error
                                        )
                                    }
                                }
                            }

                            item {
                                Spacer(modifier = Modifier.height(4.dp))
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Text(
                                        "Customer",
                                        style = MaterialTheme.typography.labelMedium,
                                        fontWeight = FontWeight.Bold,
                                        modifier = Modifier.weight(1.5f)
                                    )
                                    Text(
                                        "Purchases",
                                        style = MaterialTheme.typography.labelMedium,
                                        fontWeight = FontWeight.Bold,
                                        modifier = Modifier.weight(1f),
                                    )
                                    Text(
                                        "Outstanding",
                                        style = MaterialTheme.typography.labelMedium,
                                        fontWeight = FontWeight.Bold,
                                        modifier = Modifier.weight(1f)
                                    )
                                    Text(
                                        "Status",
                                        style = MaterialTheme.typography.labelMedium,
                                        fontWeight = FontWeight.Bold,
                                        modifier = Modifier.weight(0.8f)
                                    )
                                }
                                HorizontalDivider(modifier = Modifier.padding(vertical = 4.dp))
                            }

                            items(customers) { customer ->
                                CustomerReportRow(customer)
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun CustomerReportRow(customer: CustomerReport) {
    val hasOutstanding = customer.outstanding > 0

    Card(modifier = Modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1.5f)) {
                Text(
                    text = customer.customer_name,
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.Medium
                )
                if (customer.phone != null) {
                    Text(
                        text = customer.phone,
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
            Text(
                text = "${customer.total_purchases}",
                style = MaterialTheme.typography.bodyMedium,
                modifier = Modifier.weight(1f)
            )
            Text(
                text = "₹${String.format("%.2f", customer.outstanding)}",
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = if (hasOutstanding) FontWeight.Bold else FontWeight.Normal,
                color = if (hasOutstanding) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurface,
                modifier = Modifier.weight(1f)
            )
            Surface(
                color = if (hasOutstanding) MaterialTheme.colorScheme.errorContainer
                else MaterialTheme.colorScheme.secondaryContainer,
                shape = MaterialTheme.shapes.small
            ) {
                Text(
                    text = if (hasOutstanding) "Due" else "OK",
                    style = MaterialTheme.typography.labelSmall,
                    color = if (hasOutstanding) MaterialTheme.colorScheme.onErrorContainer
                    else MaterialTheme.colorScheme.onSecondaryContainer,
                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp)
                )
            }
        }
    }
}

package com.gstbilling.app.ui.payments

import android.content.Intent
import android.widget.Toast
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.gstbilling.app.data.remote.api.ApiService
import com.gstbilling.app.data.remote.api.Payment
import com.gstbilling.app.util.AppResult
import com.gstbilling.app.util.SessionManager
import com.gstbilling.app.util.safeApiCall
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class PaymentHistoryViewModel @Inject constructor(
    private val apiService: ApiService,
    private val sessionManager: SessionManager
) : ViewModel() {

    var payments by mutableStateOf<List<Payment>>(emptyList())
        private set
    var isLoading by mutableStateOf(false)
        private set
    var errorMessage by mutableStateOf<String?>(null)
        private set
    var filterFromDate by mutableStateOf("")
    var filterToDate by mutableStateOf("")
    var filterMethod by mutableStateOf("")
    var filterCustomerId by mutableStateOf<String?>(null)

    val methods = listOf("", "CASH", "UPI", "BANK_TRANSFER", "CARD", "RAZORPAY", "CHEQUE")

    init {
        loadPayments()
    }

    fun loadPayments() {
        viewModelScope.launch {
            isLoading = true
            errorMessage = null
            val businessId = sessionManager.getBusinessId() ?: return@launch
            when (val result = safeApiCall {
                apiService.getBusinessPayments(
                    businessId = businessId.toString(),
                    customerId = filterCustomerId,
                    fromDate = filterFromDate.ifBlank { null },
                    toDate = filterToDate.ifBlank { null }
                )
            }) {
                is AppResult.Success -> {
                    val allPayments = result.data?.body()?.data ?: emptyList()
                    payments = if (filterMethod.isNotBlank()) {
                        allPayments.filter { it.mode.equals(filterMethod, ignoreCase = true) }
                    } else {
                        allPayments
                    }
                }
                is AppResult.Error -> {
                    errorMessage = result.message
                }
                else -> {}
            }
            isLoading = false
        }
    }

    fun clearErrorMessage() {
        errorMessage = null
    }

    fun clearFilters() {
        filterFromDate = ""
        filterToDate = ""
        filterMethod = ""
        filterCustomerId = null
        loadPayments()
    }

    fun downloadReceipt(context: android.content.Context, paymentId: String) {
        viewModelScope.launch {
            val businessId = sessionManager.getBusinessId() ?: return@launch
            try {
                val response = apiService.getPaymentReceipt(businessId.toString(), paymentId)
                if (response.isSuccessful) {
                    val bytes = response.body()?.bytes()
                    if (bytes != null) {
                        val dir = context.getExternalFilesDir(null)
                        val file = java.io.File(dir, "receipt_$paymentId.pdf")
                        file.writeBytes(bytes)
                        Toast.makeText(context, "Receipt saved: ${file.absolutePath}", Toast.LENGTH_LONG).show()

                        val uri = androidx.core.content.FileProvider.getUriForFile(
                            context,
                            "${context.packageName}.provider",
                            file
                        )
                        val intent = Intent(Intent.ACTION_VIEW).apply {
                            setDataAndType(uri, "application/pdf")
                            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                        }
                        context.startActivity(Intent.createChooser(intent, "Open Receipt"))
                    }
                } else {
                    Toast.makeText(context, "Failed to download receipt", Toast.LENGTH_SHORT).show()
                }
            } catch (e: Exception) {
                Toast.makeText(context, "Error: ${e.message}", Toast.LENGTH_SHORT).show()
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PaymentHistoryScreen(
    onBack: () -> Unit,
    viewModel: PaymentHistoryViewModel = hiltViewModel()
) {
    val context = LocalContext.current
    var showFilters by remember { mutableStateOf(false) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Payment History") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    IconButton(onClick = { viewModel.loadPayments() }) {
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

            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 8.dp)
            ) {
                Column(modifier = Modifier.padding(12.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text("Filters", style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.Bold)
                        IconButton(onClick = { showFilters = !showFilters }, modifier = Modifier.size(24.dp)) {
                            Icon(
                                if (showFilters) Icons.Default.ExpandLess else Icons.Default.ExpandMore,
                                contentDescription = "Toggle filters"
                            )
                        }
                    }

                    if (showFilters) {
                        OutlinedTextField(
                            value = viewModel.filterFromDate,
                            onValueChange = { viewModel.filterFromDate = it },
                            label = { Text("From Date (YYYY-MM-DD)") },
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        OutlinedTextField(
                            value = viewModel.filterToDate,
                            onValueChange = { viewModel.filterToDate = it },
                            label = { Text("To Date (YYYY-MM-DD)") },
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true
                        )
                        Spacer(modifier = Modifier.height(8.dp))

                        Text("Method", style = MaterialTheme.typography.labelMedium)
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            viewModel.methods.forEach { method ->
                                FilterChip(
                                    selected = viewModel.filterMethod == method,
                                    onClick = { viewModel.filterMethod = method },
                                    label = {
                                        Text(
                                            if (method.isBlank()) "All" else method.replace("_", " "),
                                            style = MaterialTheme.typography.labelSmall
                                        )
                                    }
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(8.dp))

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            OutlinedButton(
                                onClick = { viewModel.clearFilters() },
                                modifier = Modifier.weight(1f)
                            ) { Text("Clear") }
                            Button(
                                onClick = { viewModel.loadPayments() },
                                modifier = Modifier.weight(1f)
                            ) { Text("Apply") }
                        }
                    }
                }
            }

            val paymentList = viewModel.payments
            if (paymentList.isEmpty() && !viewModel.isLoading) {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(
                            Icons.Default.History,
                            contentDescription = null,
                            modifier = Modifier.size(64.dp),
                            tint = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Spacer(modifier = Modifier.height(16.dp))
                        Text(
                            "No payment history",
                            style = MaterialTheme.typography.bodyLarge,
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
                    items(paymentList, key = { it.id }) { payment ->
                        PaymentHistoryCard(
                            payment = payment,
                            onDownloadReceipt = {
                                viewModel.downloadReceipt(context, payment.id)
                            }
                        )
                    }
                }
            }

            viewModel.errorMessage?.let { error ->
                Snackbar(
                    modifier = Modifier.padding(16.dp),
                    action = {
                        TextButton(onClick = { viewModel.clearErrorMessage() }) {
                            Text("Dismiss")
                        }
                    }
                ) {
                    Text(error)
                }
            }
        }
    }
}

@Composable
fun PaymentHistoryCard(
    payment: Payment,
    onDownloadReceipt: () -> Unit
) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                Icons.Default.Receipt,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.primary,
                modifier = Modifier.size(40.dp)
            )
            Spacer(modifier = Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    "₹${String.format("%.2f", payment.amount)}",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    payment.mode.replace("_", " ").replaceFirstChar { it.uppercase() },
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                if (payment.invoiceId.isNotBlank()) {
                    Text(
                        "Invoice #${payment.invoiceId}",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
                payment.notes?.let { notes ->
                    if (notes.isNotBlank()) {
                        Text(
                            notes,
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }
            Column(horizontalAlignment = Alignment.End) {
                Text(
                    payment.date,
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Spacer(modifier = Modifier.height(4.dp))
                IconButton(
                    onClick = onDownloadReceipt,
                    modifier = Modifier.size(32.dp)
                ) {
                    Icon(
                        Icons.Default.Download,
                        contentDescription = "Download Receipt",
                        modifier = Modifier.size(18.dp)
                    )
                }
            }
        }
    }
}

package com.gstbilling.app.ui.billing

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.gstbilling.app.data.remote.api.*
import com.gstbilling.app.util.AppResult
import com.gstbilling.app.util.SessionManager
import com.gstbilling.app.util.safeApiCall
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.*
import javax.inject.Inject

data class BulkInvoiceEntry(
    val customerId: Long = 0,
    val customerName: String = "",
    val invoiceDate: String = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date()),
    val items: List<InvoiceItemRequest> = listOf(InvoiceItemRequest(product_id = 0)),
    val discount: Double = 0.0,
    val notes: String = ""
)

@HiltViewModel
class BulkInvoiceViewModel @Inject constructor(
    private val apiService: ApiService,
    private val sessionManager: SessionManager
) : ViewModel() {

    var entries = mutableStateListOf(BulkInvoiceEntry())
        private set
    var isLoading by mutableStateOf(false)
        private set
    var errorMessage by mutableStateOf<String?>(null)
        private set
    var result by mutableStateOf<BulkInvoiceResponse?>(null)
        private set

    fun addEntry() {
        entries.add(BulkInvoiceEntry())
    }

    fun removeEntry(index: Int) {
        if (entries.size > 1) {
            entries.removeAt(index)
        }
    }

    fun updateEntry(index: Int, entry: BulkInvoiceEntry) {
        entries[index] = entry
    }

    fun createAll() {
        val validEntries = entries.filter { it.customerId > 0 && it.items.isNotEmpty() }
        if (validEntries.isEmpty()) {
            errorMessage = "Add at least one invoice with a valid customer"
            return
        }
        viewModelScope.launch {
            isLoading = true
            errorMessage = null
            val businessId = sessionManager.getBusinessId() ?: return@launch
            val requests = validEntries.map { entry ->
                CreateInvoiceRequest(
                    customer_id = entry.customerId,
                    invoice_date = entry.invoiceDate,
                    items = entry.items,
                    discount = entry.discount,
                    notes = entry.notes.ifBlank { null }
                )
            }
            val request = BulkInvoiceRequest(invoices = requests)
            when (val result2 = safeApiCall {
                apiService.createBulkInvoices(businessId.toString(), request)
            }) {
                is AppResult.Success -> {
                    result = result2.data?.data
                }
                is AppResult.Error -> {
                    errorMessage = result2.message
                }
                else -> {}
            }
            isLoading = false
        }
    }

    fun reset() {
        entries.clear()
        entries.add(BulkInvoiceEntry())
        result = null
        errorMessage = null
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BulkInvoiceScreen(
    onBack: () -> Unit,
    viewModel: BulkInvoiceViewModel = hiltViewModel()
) {
    val snackbarHostState = remember { SnackbarHostState() }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Bulk Invoice Creation") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        },
        snackbarHost = { SnackbarHost(snackbarHostState) }
    ) { padding ->
        val bulkResult = viewModel.result

        if (bulkResult != null) {
            BulkResultContent(
                result = bulkResult,
                onReset = { viewModel.reset() },
                onBack = onBack,
                modifier = Modifier.padding(padding)
            )
        } else {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
            ) {
                if (viewModel.isLoading) {
                    LinearProgressIndicator(modifier = Modifier.fillMaxWidth())
                }

                LazyColumn(
                    modifier = Modifier.weight(1f),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    itemsIndexed(viewModel.entries) { index, entry ->
                        BulkInvoiceEntryCard(
                            index = index,
                            entry = entry,
                            onUpdate = { viewModel.updateEntry(index, it) },
                            onRemove = { viewModel.removeEntry(index) }
                        )
                    }

                    item {
                        OutlinedButton(
                            onClick = { viewModel.addEntry() },
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Icon(Icons.Default.Add, contentDescription = null)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Add Another Invoice")
                        }
                    }
                }

                viewModel.errorMessage?.let { error ->
                    Text(
                        text = error,
                        color = MaterialTheme.colorScheme.error,
                        style = MaterialTheme.typography.bodySmall,
                        modifier = Modifier.padding(horizontal = 16.dp)
                    )
                }

                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    tonalElevation = 3.dp,
                    shadowElevation = 4.dp
                ) {
                    Button(
                        onClick = { viewModel.createAll() },
                        enabled = !viewModel.isLoading,
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp)
                            .height(50.dp)
                    ) {
                        if (viewModel.isLoading) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(24.dp),
                                color = MaterialTheme.colorScheme.onPrimary,
                                strokeWidth = 2.dp
                            )
                        } else {
                            Text("Create All (${viewModel.entries.size})", fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun BulkInvoiceEntryCard(
    index: Int,
    entry: BulkInvoiceEntry,
    onUpdate: (BulkInvoiceEntry) -> Unit,
    onRemove: () -> Unit
) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(12.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    "Invoice ${index + 1}",
                    style = MaterialTheme.typography.labelLarge,
                    fontWeight = FontWeight.Bold
                )
                if (index > 0) {
                    IconButton(onClick = onRemove, modifier = Modifier.size(24.dp)) {
                        Icon(
                            Icons.Default.RemoveCircle,
                            contentDescription = "Remove",
                            tint = MaterialTheme.colorScheme.error
                        )
                    }
                }
            }

            OutlinedTextField(
                value = entry.customerName,
                onValueChange = { onUpdate(entry.copy(customerName = it)) },
                label = { Text("Customer Name") },
                leadingIcon = { Icon(Icons.Default.Person, contentDescription = null) },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true
            )

            Spacer(modifier = Modifier.height(8.dp))

            OutlinedTextField(
                value = entry.invoiceDate,
                onValueChange = { onUpdate(entry.copy(invoiceDate = it)) },
                label = { Text("Invoice Date") },
                leadingIcon = { Icon(Icons.Default.CalendarToday, contentDescription = null) },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true
            )

            Spacer(modifier = Modifier.height(8.dp))

            OutlinedTextField(
                value = entry.discount.toString(),
                onValueChange = { onUpdate(entry.copy(discount = it.toDoubleOrNull() ?: 0.0)) },
                label = { Text("Discount") },
                leadingIcon = { Text("₹", style = MaterialTheme.typography.bodyLarge) },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                modifier = Modifier.fillMaxWidth(),
                singleLine = true
            )
        }
    }
}

@Composable
fun BulkResultContent(
    result: BulkInvoiceResponse,
    onReset: () -> Unit,
    onBack: () -> Unit,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Icon(
            if (result.fail_count == 0) Icons.Default.CheckCircle else Icons.Default.Info,
            contentDescription = null,
            modifier = Modifier.size(72.dp),
            tint = if (result.fail_count == 0) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.tertiary
        )
        Spacer(modifier = Modifier.height(16.dp))
        Text(
            "Bulk Creation Complete",
            style = MaterialTheme.typography.headlineSmall,
            fontWeight = FontWeight.Bold
        )
        Spacer(modifier = Modifier.height(8.dp))

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceEvenly
        ) {
            Card(modifier = Modifier.weight(1f)) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(
                        "${result.success_count}",
                        style = MaterialTheme.typography.headlineMedium,
                        color = MaterialTheme.colorScheme.primary,
                        fontWeight = FontWeight.Bold
                    )
                    Text("Successful", style = MaterialTheme.typography.bodySmall)
                }
            }
            Spacer(modifier = Modifier.width(12.dp))
            Card(modifier = Modifier.weight(1f)) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(
                        "${result.fail_count}",
                        style = MaterialTheme.typography.headlineMedium,
                        color = MaterialTheme.colorScheme.error,
                        fontWeight = FontWeight.Bold
                    )
                    Text("Failed", style = MaterialTheme.typography.bodySmall)
                }
            }
        }

        if (result.results.any { !it.success }) {
            Spacer(modifier = Modifier.height(16.dp))
            Card(modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(12.dp)) {
                    Text("Errors", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                    result.results.filter { !it.success }.forEach { r ->
                        Text(
                            r.error ?: "Unknown error",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.error,
                            modifier = Modifier.padding(vertical = 2.dp)
                        )
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(24.dp))

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            OutlinedButton(
                onClick = onReset,
                modifier = Modifier.weight(1f)
            ) {
                Text("Create More")
            }
            Button(
                onClick = onBack,
                modifier = Modifier.weight(1f)
            ) {
                Text("Done")
            }
        }
    }
}

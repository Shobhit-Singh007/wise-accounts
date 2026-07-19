package com.gstbilling.app.ui.dataimport

import android.content.Intent
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.FileDownload
import androidx.compose.material.icons.filled.People
import androidx.compose.material.icons.filled.Inventory2
import androidx.compose.material.icons.filled.Receipt
import androidx.compose.material.icons.filled.LocalShipping
import androidx.compose.material.icons.filled.Payments
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.gstbilling.app.data.remote.api.ApiService
import com.gstbilling.app.util.SessionManager
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import javax.inject.Inject

enum class ExportFormat(val label: String, val extension: String, val mimeType: String) {
    CSV("CSV", "csv", "text/csv"),
    JSON("JSON", "json", "application/json")
}

@HiltViewModel
class ExportDataViewModel @Inject constructor(
    private val apiService: ApiService,
    private val sessionManager: SessionManager
) : ViewModel() {

    var isExporting by mutableStateOf(false)
    var exportMessage by mutableStateOf<String?>(null)
    var selectedFormat by mutableStateOf(ExportFormat.CSV)

    private fun sanitizeCsvValue(cell: String): String = ExportUtils.sanitizeCsvValue(cell)

    private fun buildCsv(headers: List<String>, rows: List<List<String>>): String = ExportUtils.buildCsv(headers, rows)

    private fun escapeJsonValue(value: String): String = ExportUtils.escapeJsonValue(value)

    private fun escapeJsonKey(key: String): String = ExportUtils.escapeJsonKey(key)

    private fun buildJsonString(headers: List<String>, rows: List<List<String>>): String = ExportUtils.buildJsonString(headers, rows)

    fun exportCustomers(onShare: (String, String, String) -> Unit) {
        isExporting = true
        exportMessage = null
        viewModelScope.launch {
            val businessId = sessionManager.getBusinessId() ?: run {
                exportMessage = "No business ID found"
                isExporting = false
                return@launch
            }
            try {
                val response = withContext(Dispatchers.IO) {
                    apiService.getCustomers(businessId, perPage = 9999)
                }
                val customers = response.body()?.data?.data ?: emptyList()
                val headers = listOf("Name", "Phone", "Email", "GSTIN", "Address", "City", "State", "Pincode", "Opening Balance", "Credit Limit")
                val rows = customers.map { c ->
                    listOf(c.name, c.phone ?: "", c.email ?: "", c.gstin ?: "", c.address ?: "", c.city ?: "", c.state ?: "", c.pincode ?: "", "${c.openingBalance}", "${c.creditLimit}")
                }
                val content = when (selectedFormat) {
                    ExportFormat.CSV -> buildCsv(headers, rows)
                    ExportFormat.JSON -> buildJsonString(headers, rows)
                }
                withContext(Dispatchers.IO) {
                    onShare("customers.${selectedFormat.extension}", content, selectedFormat.mimeType)
                }
                exportMessage = "Exported ${customers.size} customers as ${selectedFormat.label}"
            } catch (e: Exception) {
                exportMessage = "Export failed: ${e.localizedMessage}"
            } finally {
                isExporting = false
            }
        }
    }

    fun exportProducts(onShare: (String, String, String) -> Unit) {
        isExporting = true
        exportMessage = null
        viewModelScope.launch {
            val businessId = sessionManager.getBusinessId() ?: run {
                exportMessage = "No business ID found"
                isExporting = false
                return@launch
            }
            try {
                val response = withContext(Dispatchers.IO) {
                    apiService.getProducts(businessId, perPage = 9999)
                }
                val products = response.body()?.data?.data ?: emptyList()
                val headers = listOf("Name", "SKU", "HSN", "Unit", "Selling Price", "Purchase Price", "GST Rate", "Stock")
                val rows = products.map { p ->
                    listOf(p.name, p.sku ?: "", p.hsnCode ?: "", p.unit ?: "", "${p.sellingPrice}", "${p.purchasePrice}", "${p.gstRate}%", "${p.stock}")
                }
                val content = when (selectedFormat) {
                    ExportFormat.CSV -> buildCsv(headers, rows)
                    ExportFormat.JSON -> buildJsonString(headers, rows)
                }
                withContext(Dispatchers.IO) {
                    onShare("products.${selectedFormat.extension}", content, selectedFormat.mimeType)
                }
                exportMessage = "Exported ${products.size} products as ${selectedFormat.label}"
            } catch (e: Exception) {
                exportMessage = "Export failed: ${e.localizedMessage}"
            } finally {
                isExporting = false
            }
        }
    }

    fun exportInvoices(onShare: (String, String, String) -> Unit) {
        isExporting = true
        exportMessage = null
        viewModelScope.launch {
            val businessId = sessionManager.getBusinessId() ?: run {
                exportMessage = "No business ID found"
                isExporting = false
                return@launch
            }
            try {
                val response = withContext(Dispatchers.IO) {
                    apiService.getInvoices(businessId, perPage = 9999)
                }
                val invoices = response.body()?.data?.data ?: emptyList()
                val headers = listOf("Invoice No", "Date", "Customer", "Direction", "Subtotal", "Taxable Amount", "Total Amount", "Status")
                val rows = invoices.map { inv ->
                    listOf(
                        inv.invoiceNumber, inv.invoiceDate.take(10),
                        inv.customerName ?: "", inv.direction,
                        "${inv.subtotal}", "${inv.taxableAmount}", "${inv.totalAmount}", inv.status
                    )
                }
                val content = when (selectedFormat) {
                    ExportFormat.CSV -> buildCsv(headers, rows)
                    ExportFormat.JSON -> buildJsonString(headers, rows)
                }
                withContext(Dispatchers.IO) {
                    onShare("invoices.${selectedFormat.extension}", content, selectedFormat.mimeType)
                }
                exportMessage = "Exported ${invoices.size} invoices as ${selectedFormat.label}"
            } catch (e: Exception) {
                exportMessage = "Export failed: ${e.localizedMessage}"
            } finally {
                isExporting = false
            }
        }
    }

    fun exportSuppliers(onShare: (String, String, String) -> Unit) {
        isExporting = true
        exportMessage = null
        viewModelScope.launch {
            val businessId = sessionManager.getBusinessId() ?: run {
                exportMessage = "No business ID found"
                isExporting = false
                return@launch
            }
            try {
                val response = withContext(Dispatchers.IO) {
                    apiService.getSuppliers(businessId)
                }
                val suppliers = response.body()?.data ?: emptyList()
                val headers = listOf("Name", "Phone", "Email", "GSTIN", "Address")
                val rows = suppliers.map { s ->
                    listOf(s.name, s.phone ?: "", s.email ?: "", s.gstin ?: "", s.address ?: "")
                }
                val content = when (selectedFormat) {
                    ExportFormat.CSV -> buildCsv(headers, rows)
                    ExportFormat.JSON -> buildJsonString(headers, rows)
                }
                withContext(Dispatchers.IO) {
                    onShare("suppliers.${selectedFormat.extension}", content, selectedFormat.mimeType)
                }
                exportMessage = "Exported ${suppliers.size} suppliers as ${selectedFormat.label}"
            } catch (e: Exception) {
                exportMessage = "Export failed: ${e.localizedMessage}"
            } finally {
                isExporting = false
            }
        }
    }

    fun exportPayments(onShare: (String, String, String) -> Unit) {
        isExporting = true
        exportMessage = null
        viewModelScope.launch {
            val businessId = sessionManager.getBusinessId() ?: run {
                exportMessage = "No business ID found"
                isExporting = false
                return@launch
            }
            try {
                val response = withContext(Dispatchers.IO) {
                    apiService.getBusinessPayments(businessId, perPage = 9999)
                }
                val payments = response.body()?.data ?: emptyList()
                val headers = listOf("Invoice ID", "Date", "Amount", "Mode", "Reference", "Notes")
                val rows = payments.map { p ->
                    listOf(p.invoiceId, p.date.take(10), "${p.amount}", p.mode, p.reference ?: "", p.notes ?: "")
                }
                val content = when (selectedFormat) {
                    ExportFormat.CSV -> buildCsv(headers, rows)
                    ExportFormat.JSON -> buildJsonString(headers, rows)
                }
                withContext(Dispatchers.IO) {
                    onShare("payments.${selectedFormat.extension}", content, selectedFormat.mimeType)
                }
                exportMessage = "Exported ${payments.size} payments as ${selectedFormat.label}"
            } catch (e: Exception) {
                exportMessage = "Export failed: ${e.localizedMessage}"
            } finally {
                isExporting = false
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ExportDataScreen(
    onBack: () -> Unit,
    viewModel: ExportDataViewModel = hiltViewModel()
) {
    val context = LocalContext.current
    var formatMenuExpanded by remember { mutableStateOf(false) }

    val shareFile: (String, String, String) -> Unit = { fileName, content, mimeType ->
        val file = java.io.File(context.cacheDir, "export_$fileName")
        file.writeText(content)
        val uri = androidx.core.content.FileProvider.getUriForFile(
            context, "${context.packageName}.fileprovider", file
        )
        val intent = Intent(Intent.ACTION_SEND).apply {
            type = mimeType
            putExtra(Intent.EXTRA_STREAM, uri)
            putExtra(Intent.EXTRA_SUBJECT, "Wise Accounts - $fileName")
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }
        context.startActivity(Intent.createChooser(intent, "Export via"))
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Export Data") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    "Export format:",
                    style = MaterialTheme.typography.bodyLarge,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Box {
                    OutlinedButton(onClick = { formatMenuExpanded = true }) {
                        Text(viewModel.selectedFormat.label)
                    }
                    DropdownMenu(
                        expanded = formatMenuExpanded,
                        onDismissRequest = { formatMenuExpanded = false }
                    ) {
                        ExportFormat.entries.forEach { format ->
                            DropdownMenuItem(
                                text = { Text(format.label) },
                                onClick = {
                                    viewModel.selectedFormat = format
                                    formatMenuExpanded = false
                                }
                            )
                        }
                    }
                }
            }

            ExportCard(
                title = "Customers",
                subtitle = "Export all customer contacts and details",
                icon = Icons.Default.People,
                enabled = !viewModel.isExporting,
                onClick = { viewModel.exportCustomers(shareFile) }
            )

            ExportCard(
                title = "Products",
                subtitle = "Export product catalog with prices",
                icon = Icons.Default.Inventory2,
                enabled = !viewModel.isExporting,
                onClick = { viewModel.exportProducts(shareFile) }
            )

            ExportCard(
                title = "Invoices",
                subtitle = "Export all invoices and billing history",
                icon = Icons.Default.Receipt,
                enabled = !viewModel.isExporting,
                onClick = { viewModel.exportInvoices(shareFile) }
            )

            ExportCard(
                title = "Suppliers",
                subtitle = "Export supplier contacts and details",
                icon = Icons.Default.LocalShipping,
                enabled = !viewModel.isExporting,
                onClick = { viewModel.exportSuppliers(shareFile) }
            )

            ExportCard(
                title = "Payments",
                subtitle = "Export payment history and receipts",
                icon = Icons.Default.Payments,
                enabled = !viewModel.isExporting,
                onClick = { viewModel.exportPayments(shareFile) }
            )

            if (viewModel.isExporting) {
                Box(modifier = Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator()
                }
            }

            viewModel.exportMessage?.let { msg ->
                Snackbar(
                    modifier = Modifier.padding(16.dp),
                    action = {
                        TextButton(onClick = { viewModel.exportMessage = null }) {
                            Text("OK")
                        }
                    }
                ) { Text(msg) }
            }
        }
    }
}

@Composable
private fun ExportCard(
    title: String,
    subtitle: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    enabled: Boolean = true,
    onClick: () -> Unit
) {
    Card(
        onClick = { if (enabled) onClick() },
        modifier = Modifier.fillMaxWidth(),
        enabled = enabled,
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant
        )
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Icon(
                icon,
                contentDescription = null,
                modifier = Modifier.size(32.dp),
                tint = if (enabled) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant
            )
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    title,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    subtitle,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            Icon(
                Icons.Default.FileDownload,
                contentDescription = "Export",
                tint = if (enabled) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

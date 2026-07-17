package com.gstbilling.app.ui.dataimport

import android.content.Intent
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.FileDownload
import androidx.compose.material.icons.filled.People
import androidx.compose.material.icons.filled.Inventory2
import androidx.compose.material.icons.filled.Receipt
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

@HiltViewModel
class ExportDataViewModel @Inject constructor(
    private val apiService: ApiService,
    private val sessionManager: SessionManager
) : ViewModel() {

    var isExporting by mutableStateOf(false)
    var exportMessage by mutableStateOf<String?>(null)

    private fun buildCsv(headers: List<String>, rows: List<List<String>>): String {
        val sb = StringBuilder()
        sb.appendLine(headers.joinToString(","))
        for (row in rows) {
            sb.appendLine(row.joinToString(",") { cell ->
                if (cell.contains(",") || cell.contains("\"") || cell.contains("\n")) {
                    "\"${cell.replace("\"", "\"\"")}\""
                } else cell
            })
        }
        return sb.toString()
    }

    fun exportCustomers(onShare: (String, String) -> Unit) {
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
                val customers = response.body()?.data ?: emptyList()
                val csv = buildCsv(
                    listOf("Name", "Phone", "Email", "GSTIN", "Address", "City", "State", "Pincode", "Opening Balance", "Credit Limit"),
                    customers.map { c ->
                        listOf(c.name, c.phone ?: "", c.email ?: "", c.gstin ?: "", c.address ?: "", c.city ?: "", c.state ?: "", c.pincode ?: "", "${c.openingBalance}", "${c.creditLimit}")
                    }
                )
                onShare("customers.csv", csv)
                exportMessage = "Exported ${customers.size} customers"
            } catch (e: Exception) {
                exportMessage = "Export failed: ${e.localizedMessage}"
            } finally {
                isExporting = false
            }
        }
    }

    fun exportProducts(onShare: (String, String) -> Unit) {
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
                val products = response.body()?.data ?: emptyList()
                val csv = buildCsv(
                    listOf("Name", "SKU", "HSN", "Unit", "Selling Price", "Purchase Price", "GST Rate", "Stock"),
                    products.map { p ->
                        listOf(p.name, p.sku ?: "", p.hsnCode ?: "", p.unit ?: "", "${p.sellingPrice}", "${p.purchasePrice}", "${p.gstRate}%", "${p.stock}")
                    }
                )
                onShare("products.csv", csv)
                exportMessage = "Exported ${products.size} products"
            } catch (e: Exception) {
                exportMessage = "Export failed: ${e.localizedMessage}"
            } finally {
                isExporting = false
            }
        }
    }

    fun exportInvoices(onShare: (String, String) -> Unit) {
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
                val invoices = response.body()?.data ?: emptyList()
                val csv = buildCsv(
                    listOf("Invoice No", "Date", "Customer", "Direction", "Subtotal", "Taxable Amount", "Total Amount", "Status"),
                    invoices.map { inv ->
                        listOf(
                            inv.invoiceNumber, inv.invoiceDate.take(10),
                            inv.customerName ?: "", inv.direction,
                            "${inv.subtotal}", "${inv.taxableAmount}", "${inv.totalAmount}", inv.status
                        )
                    }
                )
                onShare("invoices.csv", csv)
                exportMessage = "Exported ${invoices.size} invoices"
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

    val shareCsv: (String, String) -> Unit = { fileName, content ->
        val file = java.io.File(context.cacheDir, fileName)
        file.writeText(content)
        val uri = androidx.core.content.FileProvider.getUriForFile(
            context, "${context.packageName}.fileprovider", file
        )
        val intent = Intent(Intent.ACTION_SEND).apply {
            type = "text/csv"
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
            Text(
                "Export your data as CSV files",
                style = MaterialTheme.typography.bodyLarge,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )

            ExportCard(
                title = "Customers",
                subtitle = "Export all customer contacts and details",
                icon = Icons.Default.People,
                onClick = { viewModel.exportCustomers(shareCsv) }
            )

            ExportCard(
                title = "Products",
                subtitle = "Export product catalog with prices",
                icon = Icons.Default.Inventory2,
                onClick = { viewModel.exportProducts(shareCsv) }
            )

            ExportCard(
                title = "Invoices",
                subtitle = "Export all invoices and billing history",
                icon = Icons.Default.Receipt,
                onClick = { viewModel.exportInvoices(shareCsv) }
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
    onClick: () -> Unit
) {
    Card(
        onClick = onClick,
        modifier = Modifier.fillMaxWidth(),
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
                tint = MaterialTheme.colorScheme.primary
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
                tint = MaterialTheme.colorScheme.primary
            )
        }
    }
}

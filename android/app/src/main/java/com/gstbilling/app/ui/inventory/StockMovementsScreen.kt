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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.gstbilling.app.data.remote.api.*
import com.gstbilling.app.util.SessionManager
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import java.io.File
import java.io.FileWriter
import javax.inject.Inject

@HiltViewModel
class StockMovementsViewModel @Inject constructor(
    private val apiService: ApiService,
    private val sessionManager: SessionManager
) : ViewModel() {

    var movements by mutableStateOf<List<StockMovement>>(emptyList())
    var products by mutableStateOf<List<Product>>(emptyList())
    var isLoading by mutableStateOf(false)
    var errorMessage by mutableStateOf<String?>(null)

    var startDate by mutableStateOf("")
    var endDate by mutableStateOf("")
    var selectedProductId by mutableStateOf<String?>(null)

    init {
        loadProducts()
        loadMovements()
    }

    fun loadProducts() {
        viewModelScope.launch {
            val businessId = sessionManager.getBusinessId()
            if (businessId != null) {
                try {
                    val response = apiService.getProducts(businessId)
                    if (response.isSuccessful) {
                        products = response.body()?.data?.data ?: emptyList()
                    }
                } catch (e: Exception) {
                    // Silently fail - products are optional filter
                }
            }
        }
    }

    fun loadMovements() {
        viewModelScope.launch {
            isLoading = true
            errorMessage = null
            val businessId = sessionManager.getBusinessId()
            if (businessId != null) {
                try {
                    val response = apiService.getStockMovements(
                        businessId = businessId,
                        startDate = startDate.ifEmpty { null },
                        endDate = endDate.ifEmpty { null },
                        productId = selectedProductId
                    )
                    if (response.isSuccessful) {
                        movements = response.body()?.data ?: emptyList()
                    } else {
                        errorMessage = response.errorBody()?.string() ?: "Failed to load movements"
                    }
                } catch (e: Exception) {
                    errorMessage = e.message ?: "Network error"
                }
            }
            isLoading = false
        }
    }

    fun exportCsv(context: android.content.Context): String? {
        return try {
            val fileName = "stock_movements_${System.currentTimeMillis()}.csv"
            val file = File(context.cacheDir, fileName)
            FileWriter(file).use { writer ->
                writer.appendLine("Date,Product,Warehouse,Type,Quantity,Batch,Notes")
                movements.forEach { m ->
                    writer.appendLine(
                        "\"${m.date}\",\"${m.productName}\",\"${m.warehouseName}\"," +
                                "\"${m.type}\",\"${m.quantity}\",\"${m.batchNo ?: ""}\",\"${m.notes ?: ""}\""
                    )
                }
            }
            file.absolutePath
        } catch (e: Exception) {
            null
        }
    }

    fun getMonthlySummary(): Map<String, Int> {
        return movements.groupBy { it.date.substring(0, 7) }
            .mapValues { (_, list) -> list.size }
            .toSortedMap()
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun StockMovementsScreen(
    onBack: () -> Unit,
    viewModel: StockMovementsViewModel = hiltViewModel()
) {
    val context = LocalContext.current

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Stock Movements") },
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
        ) {
            if (viewModel.isLoading) {
                LinearProgressIndicator(modifier = Modifier.fillMaxWidth())
            }

            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                // Date Range Filter
                item {
                    DateRangeFilter(
                        startDate = viewModel.startDate,
                        endDate = viewModel.endDate,
                        onStartChanged = { viewModel.startDate = it },
                        onEndChanged = { viewModel.endDate = it }
                    )
                }

                // Product Filter
                item {
                    ProductFilterDropdown(
                        products = viewModel.products,
                        selectedProductId = viewModel.selectedProductId,
                        onProductSelected = { viewModel.selectedProductId = it }
                    )
                }

                // Apply Filters Button
                item {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Button(
                            onClick = { viewModel.loadMovements() },
                            modifier = Modifier.weight(1f)
                        ) {
                            Icon(Icons.Default.FilterList, contentDescription = null)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Apply Filters")
                        }
                        OutlinedButton(
                            onClick = {
                                viewModel.startDate = ""
                                viewModel.endDate = ""
                                viewModel.selectedProductId = null
                                viewModel.loadMovements()
                            },
                            modifier = Modifier.weight(1f)
                        ) {
                            Icon(Icons.Default.Clear, contentDescription = null)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Clear")
                        }
                    }
                }

                // Export CSV
                item {
                    OutlinedButton(
                        onClick = {
                            val filePath = viewModel.exportCsv(context)
                            // In real app, share the file via intent
                        },
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Icon(Icons.Default.FileDownload, contentDescription = null)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Export CSV")
                    }
                }

                // Movements Table Header
                item {
                    MovementsTableHeader()
                }

                // Movements List
                if (viewModel.movements.isEmpty() && !viewModel.isLoading) {
                    item {
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            colors = CardDefaults.cardColors(
                                containerColor = MaterialTheme.colorScheme.surfaceVariant
                            )
                        ) {
                            Column(
                                modifier = Modifier.padding(24.dp),
                                horizontalAlignment = Alignment.CenterHorizontally
                            ) {
                                Icon(
                                    Icons.Default.Inventory,
                                    contentDescription = null,
                                    modifier = Modifier.size(48.dp),
                                    tint = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                                Spacer(modifier = Modifier.height(12.dp))
                                Text(
                                    "No stock movements found",
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                                Text(
                                    "Try adjusting your filters",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }
                    }
                } else {
                    items(viewModel.movements, key = { it.id }) { movement ->
                        MovementRow(movement)
                    }
                }

                // Monthly Summary
                if (viewModel.movements.isNotEmpty()) {
                    item {
                        Spacer(modifier = Modifier.height(8.dp))
                        SectionHeader("Monthly Summary")
                    }
                    item {
                        val monthlySummary = viewModel.getMonthlySummary()
                        Card(modifier = Modifier.fillMaxWidth()) {
                            Column(modifier = Modifier.padding(12.dp)) {
                                monthlySummary.forEach { (month, count) ->
                                    Row(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .padding(vertical = 4.dp),
                                        horizontalArrangement = Arrangement.SpaceBetween
                                    ) {
                                        Text(
                                            month,
                                            style = MaterialTheme.typography.bodyMedium
                                        )
                                        Text(
                                            "$count movement(s)",
                                            style = MaterialTheme.typography.bodyMedium,
                                            fontWeight = FontWeight.Bold
                                        )
                                    }
                                }
                            }
                        }
                    }
                }

                item { Spacer(modifier = Modifier.height(16.dp)) }
            }
        }
    }
}

@Composable
fun DateRangeFilter(
    startDate: String,
    endDate: String,
    onStartChanged: (String) -> Unit,
    onEndChanged: (String) -> Unit
) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(12.dp)) {
            Text(
                "Date Range",
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.Bold
            )
            Spacer(modifier = Modifier.height(8.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                OutlinedTextField(
                    value = startDate,
                    onValueChange = onStartChanged,
                    label = { Text("Start Date") },
                    placeholder = { Text("YYYY-MM-DD") },
                    modifier = Modifier.weight(1f),
                    singleLine = true
                )
                OutlinedTextField(
                    value = endDate,
                    onValueChange = onEndChanged,
                    label = { Text("End Date") },
                    placeholder = { Text("YYYY-MM-DD") },
                    modifier = Modifier.weight(1f),
                    singleLine = true
                )
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProductFilterDropdown(
    products: List<Product>,
    selectedProductId: String?,
    onProductSelected: (String?) -> Unit
) {
    var expanded by remember { mutableStateOf(false) }
    val selectedProduct = products.find { it.id == selectedProductId }

    ExposedDropdownMenuBox(
        expanded = expanded,
        onExpandedChange = { expanded = it }
    ) {
        OutlinedTextField(
            value = selectedProduct?.name ?: "All Products",
            onValueChange = {},
            readOnly = true,
            label = { Text("Filter by Product") },
            trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expanded) },
            modifier = Modifier
                .fillMaxWidth()
                .menuAnchor(),
            leadingIcon = {
                Icon(Icons.Default.Search, contentDescription = null)
            }
        )
        ExposedDropdownMenu(
            expanded = expanded,
            onDismissRequest = { expanded = false }
        ) {
            DropdownMenuItem(
                text = { Text("All Products") },
                onClick = {
                    onProductSelected(null)
                    expanded = false
                }
            )
            products.forEach { product ->
                DropdownMenuItem(
                    text = { Text(product.name) },
                    onClick = {
                        onProductSelected(product.id)
                        expanded = false
                    }
                )
            }
        }
    }
}

@Composable
fun MovementsTableHeader() {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.primaryContainer
        )
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Text(
                "Date",
                style = MaterialTheme.typography.labelMedium,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.weight(1.2f)
            )
            Text(
                "Product",
                style = MaterialTheme.typography.labelMedium,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.weight(1.5f)
            )
            Text(
                "Type",
                style = MaterialTheme.typography.labelMedium,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.weight(0.8f)
            )
            Text(
                "Qty",
                style = MaterialTheme.typography.labelMedium,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.weight(0.5f)
            )
        }
    }
}

@Composable
fun MovementRow(movement: StockMovement) {
    val typeColor = when (movement.type.uppercase()) {
        "IN", "PURCHASE", "RECEIVED" -> Color(0xFF2E7D32)
        "OUT", "SALE", "ISSUED" -> MaterialTheme.colorScheme.error
        "TRANSFER" -> Color(0xFF1565C0)
        "ADJUSTMENT" -> Color(0xFFE65100)
        else -> MaterialTheme.colorScheme.onSurfaceVariant
    }

    Card(modifier = Modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                movement.date,
                style = MaterialTheme.typography.bodySmall,
                modifier = Modifier.weight(1.2f)
            )
            Column(modifier = Modifier.weight(1.5f)) {
                Text(
                    movement.productName,
                    style = MaterialTheme.typography.bodySmall,
                    fontWeight = FontWeight.Bold,
                    maxLines = 1
                )
                Text(
                    movement.warehouseName,
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 1
                )
                if (movement.batchNo != null) {
                    Text(
                        "Batch: ${movement.batchNo}",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
                if (movement.notes != null) {
                    Text(
                        movement.notes!!,
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        maxLines = 1
                    )
                }
            }
            Text(
                movement.type,
                style = MaterialTheme.typography.labelSmall,
                color = typeColor,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.weight(0.8f)
            )
            Text(
                "${if (movement.type.uppercase() in listOf("OUT", "SALE", "ISSUED")) "-" else "+"}${movement.quantity}",
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = FontWeight.Bold,
                color = typeColor,
                modifier = Modifier.weight(0.5f)
            )
        }
    }
}

@Composable
fun SectionHeader(title: String) {
    Text(
        text = title,
        style = MaterialTheme.typography.titleMedium,
        fontWeight = FontWeight.Bold,
        color = MaterialTheme.colorScheme.primary,
        modifier = Modifier.padding(vertical = 4.dp)
    )
}

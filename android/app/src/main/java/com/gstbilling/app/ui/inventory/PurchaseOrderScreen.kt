package com.gstbilling.app.ui.inventory

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.text.KeyboardOptions
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
import com.gstbilling.app.data.local.entity.ProductEntity
import com.gstbilling.app.data.remote.api.*
import com.gstbilling.app.data.repository.ProductRepository
import com.gstbilling.app.util.AppResult
import com.gstbilling.app.util.SessionManager
import com.gstbilling.app.util.safeApiCall
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.*
import javax.inject.Inject

@HiltViewModel
class PurchaseOrderViewModel @Inject constructor(
    private val apiService: ApiService,
    private val productRepository: ProductRepository,
    private val sessionManager: SessionManager
) : ViewModel() {

    var purchaseOrders by mutableStateOf<List<PurchaseOrder>>(emptyList())
        private set
    var suppliers by mutableStateOf<List<Supplier>>(emptyList())
        private set
    var products by mutableStateOf<List<ProductEntity>>(emptyList())
        private set
    var isLoading by mutableStateOf(false)
    var isSubmitting by mutableStateOf(false)
    var errorMessage by mutableStateOf<String?>(null)
    var successMessage by mutableStateOf<String?>(null)
    var showCreateDialog by mutableStateOf(false)

    // Create PO fields
    var selectedSupplier by mutableStateOf<Supplier?>(null)
    var showSupplierDropdown by mutableStateOf(false)
    var poItems by mutableStateOf<List<PoItemData>>(emptyList())
    var showProductDropdownForItem by mutableStateOf<Int?>(null)

    private var businessId = 0L

    data class PoItemData(
        val product: ProductEntity? = null,
        val quantity: String = "1",
        val unitPrice: String = "0.00"
    )

    init {
        viewModelScope.launch {
            businessId = sessionManager.getBusinessId() ?: 0L
            if (businessId != 0L) {
                loadData()
            }
        }
    }

    fun loadData() {
        isLoading = true
        viewModelScope.launch {
            // Load POs
            val poResult = safeApiCall {
                val response = apiService.getPurchaseOrders(businessId)
                if (response.isSuccessful) response.body()?.data ?: emptyList()
                else throw Exception(response.errorBody()?.string() ?: "Failed to load POs")
            }
            when (poResult) {
                is AppResult.Success -> purchaseOrders = poResult.data
                is AppResult.Error -> errorMessage = poResult.message
                is AppResult.Loading -> {}
            }

            // Load suppliers
            val supplierResult = safeApiCall {
                val response = apiService.getSuppliers(businessId)
                if (response.isSuccessful) response.body()?.data ?: emptyList()
                else throw Exception(response.errorBody()?.string() ?: "Failed to load suppliers")
            }
            when (supplierResult) {
                is AppResult.Success -> suppliers = supplierResult.data
                is AppResult.Error -> {}
                is AppResult.Loading -> {}
            }

            // Load products
            productRepository.getProducts(businessId).collect { products = it }
            isLoading = false
        }
    }

    fun addPoItem() {
        poItems = poItems + PoItemData()
    }

    fun updatePoItem(index: Int, item: PoItemData) {
        poItems = poItems.toMutableList().apply { set(index, item) }
    }

    fun removePoItem(index: Int) {
        poItems = poItems.toMutableList().apply { removeAt(index) }
    }

    fun createPurchaseOrder(onDone: () -> Unit) {
        val supplier = selectedSupplier
        if (supplier == null) {
            errorMessage = "Select a supplier"
            return
        }
        if (poItems.isEmpty() || poItems.all { it.product == null }) {
            errorMessage = "Add at least one item"
            return
        }
        isSubmitting = true
        errorMessage = null
        viewModelScope.launch {
            val dateFormat = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
            val today = dateFormat.format(Date())
            val items = poItems.filter { it.product != null }.map { poItem ->
                PurchaseOrderItem(
                    product_id = poItem.product!!.id,
                    quantity = poItem.quantity.toIntOrNull() ?: 1,
                    unit_price = poItem.unitPrice.toDoubleOrNull() ?: 0.0
                )
            }
            val total = items.sumOf { it.quantity * it.unit_price }
            val order = PurchaseOrder(
                supplier_id = supplier.id,
                order_date = today,
                status = "pending",
                total_amount = total,
                items = items,
                business_id = businessId
            )
            val result = safeApiCall {
                val response = apiService.createPurchaseOrder(order)
                if (response.isSuccessful) response.body()?.data
                else throw Exception(response.errorBody()?.string() ?: "Failed to create PO")
            }
            isSubmitting = false
            when (result) {
                is AppResult.Success -> {
                    successMessage = "Purchase order created"
                    showCreateDialog = false
                    poItems = emptyList()
                    selectedSupplier = null
                    loadData()
                    onDone()
                }
                is AppResult.Error -> errorMessage = result.message
                is AppResult.Loading -> {}
            }
        }
    }

    fun markAsReceived(poId: Long) {
        viewModelScope.launch {
            val existing = purchaseOrders.find { it.id == poId } ?: return@launch
            val updated = existing.copy(status = "received")
            val result = safeApiCall {
                val response = apiService.updatePurchaseOrder(poId, updated)
                if (response.isSuccessful) response.body()?.data
                else throw Exception(response.errorBody()?.string() ?: "Failed to update PO")
            }
            when (result) {
                is AppResult.Success -> loadData()
                is AppResult.Error -> errorMessage = result.message
                is AppResult.Loading -> {}
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PurchaseOrderScreen(
    onBack: () -> Unit,
    viewModel: PurchaseOrderViewModel = hiltViewModel()
) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Purchase Orders") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    IconButton(onClick = { viewModel.loadData() }) {
                        Icon(Icons.Default.Refresh, contentDescription = "Refresh")
                    }
                }
            )
        },
        floatingActionButton = {
            FloatingActionButton(onClick = { viewModel.showCreateDialog = true }) {
                Icon(Icons.Default.Add, contentDescription = "Create Purchase Order")
            }
        }
    ) { padding ->
        Column(
            modifier = Modifier.fillMaxSize().padding(padding)
        ) {
            if (viewModel.isLoading) {
                LinearProgressIndicator(modifier = Modifier.fillMaxWidth())
            }

            viewModel.errorMessage?.let { error ->
                Card(
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.errorContainer
                    ),
                    modifier = Modifier.fillMaxWidth().padding(16.dp)
                ) {
                    Text(text = error, color = MaterialTheme.colorScheme.onErrorContainer, modifier = Modifier.padding(16.dp))
                }
            }

            viewModel.successMessage?.let { msg ->
                Card(
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.primaryContainer
                    ),
                    modifier = Modifier.fillMaxWidth().padding(16.dp)
                ) {
                    Row(modifier = Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.CheckCircle, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(msg, color = MaterialTheme.colorScheme.onPrimaryContainer)
                    }
                }
            }

            if (viewModel.purchaseOrders.isEmpty() && !viewModel.isLoading) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(
                            Icons.Default.ShoppingCart,
                            contentDescription = null,
                            modifier = Modifier.size(64.dp),
                            tint = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Spacer(modifier = Modifier.height(16.dp))
                        Text("No purchase orders", style = MaterialTheme.typography.bodyLarge, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            } else {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    items(viewModel.purchaseOrders, key = { it.id }) { po ->
                        PurchaseOrderItem(po = po) {
                            viewModel.markAsReceived(po.id)
                        }
                    }
                }
            }
        }

        if (viewModel.showCreateDialog) {
            CreatePurchaseOrderDialog(viewModel = viewModel)
        }
    }
}

@Composable
private fun PurchaseOrderItem(
    po: PurchaseOrder,
    onMarkReceived: () -> Unit
) {
    val statusColor = when (po.status) {
        "received" -> MaterialTheme.colorScheme.primary
        "cancelled" -> MaterialTheme.colorScheme.error
        else -> MaterialTheme.colorScheme.tertiary
    }

    Card(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        "PO #${po.id}",
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        po.supplier_name ?: "Supplier #${po.supplier_id}",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
                AssistChip(
                    onClick = {},
                    label = { Text(po.status.uppercase(), style = MaterialTheme.typography.labelSmall) },
                    colors = AssistChipDefaults.assistChipColors(
                        containerColor = statusColor.copy(alpha = 0.12f),
                        labelColor = statusColor
                    ),
                    border = null
                )
            }
            Spacer(modifier = Modifier.height(8.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text("Date: ${po.order_date}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Text(
                    "\u20B9${String.format("%.2f", po.total_amount)}",
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.primary
                )
            }
            if (po.status != "received" && po.status != "cancelled") {
                Spacer(modifier = Modifier.height(8.dp))
                OutlinedButton(
                    onClick = onMarkReceived,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Icon(Icons.Default.CheckCircle, contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Mark as Received")
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun CreatePurchaseOrderDialog(viewModel: PurchaseOrderViewModel) {
    AlertDialog(
        onDismissRequest = {
            viewModel.showCreateDialog = false
            viewModel.errorMessage = null
        },
        title = { Text("Create Purchase Order") },
        text = {
            Column(
                modifier = Modifier.heightIn(max = 400.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                // Supplier picker
                ExposedDropdownMenuBox(
                    expanded = viewModel.showSupplierDropdown,
                    onExpandedChange = { viewModel.showSupplierDropdown = it }
                ) {
                    OutlinedTextField(
                        value = viewModel.selectedSupplier?.name ?: "",
                        onValueChange = {},
                        readOnly = true,
                        label = { Text("Supplier *") },
                        trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = viewModel.showSupplierDropdown) },
                        modifier = Modifier.fillMaxWidth().menuAnchor()
                    )
                    ExposedDropdownMenu(
                        expanded = viewModel.showSupplierDropdown,
                        onDismissRequest = { viewModel.showSupplierDropdown = false }
                    ) {
                        viewModel.suppliers.forEach { supplier ->
                            DropdownMenuItem(
                                text = { Text(supplier.name) },
                                onClick = {
                                    viewModel.selectedSupplier = supplier
                                    viewModel.showSupplierDropdown = false
                                }
                            )
                        }
                    }
                }

                HorizontalDivider()

                Text("Items", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)

                viewModel.poItems.forEachIndexed { index, item ->
                    Card(
                        colors = CardDefaults.cardColors(
                            containerColor = MaterialTheme.colorScheme.surfaceVariant
                        )
                    ) {
                        Column(modifier = Modifier.padding(8.dp)) {
                            // Product picker for this item
                            ExposedDropdownMenuBox(
                                expanded = viewModel.showProductDropdownForItem == index,
                                onExpandedChange = {
                                    viewModel.showProductDropdownForItem = if (it) index else null
                                }
                            ) {
                                OutlinedTextField(
                                    value = item.product?.name ?: "",
                                    onValueChange = {},
                                    readOnly = true,
                                    label = { Text("Product") },
                                    trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = viewModel.showProductDropdownForItem == index) },
                                    modifier = Modifier.fillMaxWidth().menuAnchor()
                                )
                                ExposedDropdownMenu(
                                    expanded = viewModel.showProductDropdownForItem == index,
                                    onDismissRequest = { viewModel.showProductDropdownForItem = null }
                                ) {
                                    viewModel.products.forEach { product ->
                                        DropdownMenuItem(
                                            text = { Text(product.name) },
                                            onClick = {
                                                viewModel.updatePoItem(index, item.copy(product = product))
                                                viewModel.showProductDropdownForItem = null
                                            }
                                        )
                                    }
                                }
                            }
                            Spacer(modifier = Modifier.height(4.dp))
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                OutlinedTextField(
                                    value = item.quantity,
                                    onValueChange = { viewModel.updatePoItem(index, item.copy(quantity = it)) },
                                    label = { Text("Qty") },
                                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                    modifier = Modifier.weight(1f),
                                    singleLine = true
                                )
                                OutlinedTextField(
                                    value = item.unitPrice,
                                    onValueChange = { viewModel.updatePoItem(index, item.copy(unitPrice = it)) },
                                    label = { Text("Price") },
                                    leadingIcon = { Text("\u20B9", style = MaterialTheme.typography.bodySmall) },
                                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                                    modifier = Modifier.weight(1f),
                                    singleLine = true
                                )
                            }
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.End
                            ) {
                                IconButton(onClick = { viewModel.removePoItem(index) }) {
                                    Icon(Icons.Default.Delete, contentDescription = "Remove", tint = MaterialTheme.colorScheme.error)
                                }
                            }
                        }
                    }
                }

                OutlinedButton(
                    onClick = { viewModel.addPoItem() },
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Icon(Icons.Default.Add, contentDescription = null)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Add Item")
                }

                viewModel.errorMessage?.let {
                    Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
                }
            }
        },
        confirmButton = {
            TextButton(
                onClick = { viewModel.createPurchaseOrder { } },
                enabled = !viewModel.isSubmitting
            ) {
                if (viewModel.isSubmitting) {
                    CircularProgressIndicator(modifier = Modifier.size(16.dp), strokeWidth = 2.dp)
                } else {
                    Text("Create")
                }
            }
        },
        dismissButton = {
            TextButton(onClick = {
                viewModel.showCreateDialog = false
                viewModel.errorMessage = null
            }) {
                Text("Cancel")
            }
        }
    )
}

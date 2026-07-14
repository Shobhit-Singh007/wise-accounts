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
import com.gstbilling.app.data.remote.api.ApiService
import com.gstbilling.app.data.remote.api.Product
import com.gstbilling.app.data.remote.api.StockTransferRequest
import com.gstbilling.app.data.remote.api.Warehouse
import com.gstbilling.app.data.repository.ProductRepository
import com.gstbilling.app.util.AppResult
import com.gstbilling.app.util.SessionManager
import com.gstbilling.app.util.safeApiCall
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class StockTransferViewModel @Inject constructor(
    private val productRepository: ProductRepository,
    private val apiService: ApiService,
    private val sessionManager: SessionManager
) : ViewModel() {

    var products by mutableStateOf<List<ProductEntity>>(emptyList())
        private set
    var warehouses by mutableStateOf<List<Warehouse>>(emptyList())
        private set
    var isLoading by mutableStateOf(false)
    var isSubmitting by mutableStateOf(false)
    var errorMessage by mutableStateOf<String?>(null)
    var successMessage by mutableStateOf<String?>(null)

    var selectedProduct by mutableStateOf<ProductEntity?>(null)
    var fromWarehouse by mutableStateOf<Warehouse?>(null)
    var toWarehouse by mutableStateOf<Warehouse?>(null)
    var quantity by mutableStateOf("")
    var showProductDropdown by mutableStateOf(false)
    var showFromWarehouseDropdown by mutableStateOf(false)
    var showToWarehouseDropdown by mutableStateOf(false)
    var productSearchQuery by mutableStateOf("")

    private var businessId = ""

    init {
        viewModelScope.launch {
            businessId = sessionManager.getBusinessId() ?: ""
            if (businessId.isNotEmpty()) {
                loadData()
            }
        }
    }

    private fun loadData() {
        isLoading = true
        viewModelScope.launch {
            productRepository.getProducts(businessId).collect { products = it }
            val result = safeApiCall {
                val response = apiService.getWarehouses(businessId)
                if (response.isSuccessful) {
                    response.body()?.data ?: emptyList()
                } else {
                    throw Exception(response.errorBody()?.string() ?: "Failed to load warehouses")
                }
            }
            when (result) {
                is AppResult.Success -> warehouses = result.data
                is AppResult.Error -> errorMessage = result.message
                is AppResult.Loading -> {}
            }
            isLoading = false
        }
    }

    fun submitTransfer(onDone: () -> Unit) {
        val prod = selectedProduct
        val from = fromWarehouse
        val to = toWarehouse
        val qty = quantity.toIntOrNull()

        if (prod == null) {
            errorMessage = "Select a product"
            return
        }
        if (from == null) {
            errorMessage = "Select source warehouse"
            return
        }
        if (to == null) {
            errorMessage = "Select destination warehouse"
            return
        }
        if (qty == null || qty <= 0) {
            errorMessage = "Enter a valid quantity"
            return
        }
        if (from.id == to.id) {
            errorMessage = "Source and destination warehouses must be different"
            return
        }

        isSubmitting = true
        errorMessage = null
        viewModelScope.launch {
            val request = StockTransferRequest(
                productId = prod.id,
                fromWarehouseId = from.id,
                toWarehouseId = to.id,
                quantity = qty
            )
            val result = safeApiCall {
                val response = apiService.transferStock(request)
                if (response.isSuccessful) {
                    Unit
                } else {
                    throw Exception(response.errorBody()?.string() ?: "Transfer failed")
                }
            }
            isSubmitting = false
            when (result) {
                is AppResult.Success -> {
                    successMessage = "Stock transferred successfully"
                    selectedProduct = null
                    fromWarehouse = null
                    toWarehouse = null
                    quantity = ""
                    onDone()
                }
                is AppResult.Error -> errorMessage = result.message
                is AppResult.Loading -> {}
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun StockTransferScreen(
    onBack: () -> Unit,
    viewModel: StockTransferViewModel = hiltViewModel()
) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Stock Transfer") },
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
                .padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Spacer(modifier = Modifier.height(4.dp))

            if (viewModel.isLoading) {
                LinearProgressIndicator(modifier = Modifier.fillMaxWidth())
            }

            // Product Picker
            ExposedDropdownMenuBox(
                expanded = viewModel.showProductDropdown,
                onExpandedChange = { viewModel.showProductDropdown = it }
            ) {
                OutlinedTextField(
                    value = viewModel.selectedProduct?.let { "${it.name} (Stock: ${it.stock})" } ?: "",
                    onValueChange = {},
                    readOnly = true,
                    label = { Text("Select Product *") },
                    leadingIcon = { Icon(Icons.Default.Inventory2, contentDescription = null) },
                    trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = viewModel.showProductDropdown) },
                    modifier = Modifier.fillMaxWidth().menuAnchor()
                )
                ExposedDropdownMenu(
                    expanded = viewModel.showProductDropdown,
                    onDismissRequest = { viewModel.showProductDropdown = false }
                ) {
                    viewModel.products.forEach { product ->
                        DropdownMenuItem(
                            text = {
                                Column {
                                    Text(product.name, fontWeight = FontWeight.Bold)
                                    Text(
                                        "Stock: ${product.stock} ${product.unit ?: ""} | \u20B9${String.format("%.2f", product.sellingPrice)}",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }
                            },
                            onClick = {
                                viewModel.selectedProduct = product
                                viewModel.showProductDropdown = false
                            }
                        )
                    }
                }
            }

            // From Warehouse
            ExposedDropdownMenuBox(
                expanded = viewModel.showFromWarehouseDropdown,
                onExpandedChange = { viewModel.showFromWarehouseDropdown = it }
            ) {
                OutlinedTextField(
                    value = viewModel.fromWarehouse?.name ?: "",
                    onValueChange = {},
                    readOnly = true,
                    label = { Text("From Warehouse *") },
                    leadingIcon = { Icon(Icons.Default.Logout, contentDescription = null) },
                    trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = viewModel.showFromWarehouseDropdown) },
                    modifier = Modifier.fillMaxWidth().menuAnchor()
                )
                ExposedDropdownMenu(
                    expanded = viewModel.showFromWarehouseDropdown,
                    onDismissRequest = { viewModel.showFromWarehouseDropdown = false }
                ) {
                    viewModel.warehouses.forEach { wh ->
                        DropdownMenuItem(
                            text = { Text(wh.name) },
                            onClick = {
                                viewModel.fromWarehouse = wh
                                viewModel.showFromWarehouseDropdown = false
                            }
                        )
                    }
                }
            }

            // To Warehouse
            ExposedDropdownMenuBox(
                expanded = viewModel.showToWarehouseDropdown,
                onExpandedChange = { viewModel.showToWarehouseDropdown = it }
            ) {
                OutlinedTextField(
                    value = viewModel.toWarehouse?.name ?: "",
                    onValueChange = {},
                    readOnly = true,
                    label = { Text("To Warehouse *") },
                    leadingIcon = { Icon(Icons.Default.Login, contentDescription = null) },
                    trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = viewModel.showToWarehouseDropdown) },
                    modifier = Modifier.fillMaxWidth().menuAnchor()
                )
                ExposedDropdownMenu(
                    expanded = viewModel.showToWarehouseDropdown,
                    onDismissRequest = { viewModel.showToWarehouseDropdown = false }
                ) {
                    viewModel.warehouses.filter { it.id != viewModel.fromWarehouse?.id }.forEach { wh ->
                        DropdownMenuItem(
                            text = { Text(wh.name) },
                            onClick = {
                                viewModel.toWarehouse = wh
                                viewModel.showToWarehouseDropdown = false
                            }
                        )
                    }
                }
            }

            OutlinedTextField(
                value = viewModel.quantity,
                onValueChange = { viewModel.quantity = it },
                label = { Text("Quantity *") },
                leadingIcon = { Icon(Icons.Default.Numbers, contentDescription = null) },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                singleLine = true,
                modifier = Modifier.fillMaxWidth()
            )

            viewModel.errorMessage?.let { error ->
                Text(text = error, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
            }

            viewModel.successMessage?.let { msg ->
                Card(
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.primaryContainer
                    )
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth().padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(Icons.Default.CheckCircle, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(msg, color = MaterialTheme.colorScheme.onPrimaryContainer)
                    }
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            Button(
                onClick = { viewModel.submitTransfer { } },
                enabled = !viewModel.isSubmitting && viewModel.successMessage == null,
                modifier = Modifier.fillMaxWidth().height(50.dp)
            ) {
                if (viewModel.isSubmitting) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(24.dp),
                        color = MaterialTheme.colorScheme.onPrimary,
                        strokeWidth = 2.dp
                    )
                } else {
                    Icon(Icons.Default.SwapHoriz, contentDescription = null)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Transfer Stock")
                }
            }

            Spacer(modifier = Modifier.height(32.dp))
        }
    }
}

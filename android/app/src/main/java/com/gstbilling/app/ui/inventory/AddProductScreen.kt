package com.gstbilling.app.ui.inventory

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.gstbilling.app.data.remote.api.Product
import com.gstbilling.app.data.repository.ProductRepository
import com.gstbilling.app.util.AppResult
import com.gstbilling.app.util.SessionManager
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import javax.inject.Inject

private val GST_OPTIONS = listOf("0", "3", "5", "12", "18", "28")
private val UNITS = listOf("Pcs", "Kg", "Ltr", "Mtr", "Box", "Pack", "Doz", "Gram", "ML", "Nos")

@HiltViewModel
class AddProductViewModel @Inject constructor(
    private val productRepository: ProductRepository,
    private val sessionManager: SessionManager
) : ViewModel() {

    var name by mutableStateOf("")
    var sku by mutableStateOf("")
    var hsnCode by mutableStateOf("")
    var unit by mutableStateOf("Pcs")
    var sellingPrice by mutableStateOf("")
    var purchasePrice by mutableStateOf("")
    var gstRate by mutableStateOf("18")
    var stock by mutableStateOf("0")
    var lowStockAlert by mutableStateOf("")
    var categoryName by mutableStateOf("")
    var isLoading by mutableStateOf(false)
    var errorMessage by mutableStateOf<String?>(null)
    var isEditMode by mutableStateOf(false)
    var showUnitDropdown by mutableStateOf(false)
    var showGstDropdown by mutableStateOf(false)
    private var productId: String = ""

    fun loadProduct(id: String) {
        viewModelScope.launch {
            isLoading = true
            errorMessage = null
            val businessId = sessionManager.getBusinessId() ?: ""
            val result = productRepository.getProductByRemoteId(businessId, id)
            isLoading = false
            when (result) {
                is AppResult.Success -> {
                    val product = result.data
                    name = product.name
                    sku = product.sku ?: ""
                    hsnCode = product.hsnCode ?: ""
                    unit = product.unit ?: "Pcs"
                    sellingPrice = if (product.sellingPrice > 0) product.sellingPrice.toString() else ""
                    purchasePrice = if (product.purchasePrice > 0) product.purchasePrice.toString() else ""
                    gstRate = product.gstRate.toInt().toString()
                    stock = product.stock.toString()
                    lowStockAlert = product.lowStockAlert?.toString() ?: ""
                    categoryName = product.categoryName ?: ""
                    isEditMode = true
                    productId = product.id
                }
                is AppResult.Error -> errorMessage = result.message
                is AppResult.Loading -> { }
            }
        }
    }

    fun save(onSuccess: () -> Unit) {
        if (name.isBlank()) {
            errorMessage = "Product name is required"
            return
        }
        if (sellingPrice.isBlank()) {
            errorMessage = "Selling price is required"
            return
        }
        isLoading = true
        errorMessage = null
        viewModelScope.launch {
            val businessId = sessionManager.getBusinessId() ?: ""
            val product = Product(
                id = if (isEditMode) productId else "",
                name = name,
                sku = sku.ifBlank { null },
                hsnCode = hsnCode.ifBlank { null },
                unit = unit,
                sellingPrice = sellingPrice.toDoubleOrNull() ?: 0.0,
                purchasePrice = purchasePrice.toDoubleOrNull() ?: 0.0,
                gstRate = gstRate.toDoubleOrNull() ?: 18.0,
                stock = stock.toIntOrNull() ?: 0,
                lowStockAlert = lowStockAlert.toIntOrNull(),
                categoryName = categoryName.ifBlank { null },
                businessId = businessId
            )

            val result = if (isEditMode) {
                productRepository.updateProduct(businessId, productId, product)
            } else {
                productRepository.createProduct(businessId, product)
            }
            isLoading = false
            when (result) {
                is AppResult.Success -> onSuccess()
                is AppResult.Error -> errorMessage = result.message
                is AppResult.Loading -> { }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AddProductScreen(
    productId: String?,
    onBack: () -> Unit,
    viewModel: AddProductViewModel = hiltViewModel()
) {
    LaunchedEffect(productId) {
        if (productId != null) {
            viewModel.loadProduct(productId!!)
        } else {
            viewModel.name = ""
            viewModel.sku = ""
            viewModel.hsnCode = ""
            viewModel.unit = "Pcs"
            viewModel.sellingPrice = ""
            viewModel.purchasePrice = ""
            viewModel.gstRate = "18"
            viewModel.stock = "0"
            viewModel.lowStockAlert = ""
            viewModel.categoryName = ""
            viewModel.isEditMode = false
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(if (viewModel.isEditMode) "Edit Product" else "Add Product") },
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
                .padding(horizontal = 16.dp)
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Spacer(modifier = Modifier.height(4.dp))

            OutlinedTextField(
                value = viewModel.name,
                onValueChange = { viewModel.name = it },
                label = { Text("Product Name *") },
                leadingIcon = { Icon(Icons.Default.ShoppingCart, contentDescription = null) },
                singleLine = true,
                modifier = Modifier.fillMaxWidth()
            )

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                OutlinedTextField(
                    value = viewModel.sku,
                    onValueChange = { viewModel.sku = it },
                    label = { Text("SKU") },
                    modifier = Modifier.weight(1f),
                    singleLine = true
                )
                OutlinedTextField(
                    value = viewModel.hsnCode,
                    onValueChange = { viewModel.hsnCode = it },
                    label = { Text("HSN Code") },
                    modifier = Modifier.weight(1f),
                    singleLine = true
                )
            }

            ExposedDropdownMenuBox(
                expanded = viewModel.showUnitDropdown,
                onExpandedChange = { viewModel.showUnitDropdown = it }
            ) {
                OutlinedTextField(
                    value = viewModel.unit,
                    onValueChange = {},
                    readOnly = true,
                    label = { Text("Unit") },
                    trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = viewModel.showUnitDropdown) },
                    modifier = Modifier
                        .fillMaxWidth()
                        .menuAnchor()
                )
                ExposedDropdownMenu(
                    expanded = viewModel.showUnitDropdown,
                    onDismissRequest = { viewModel.showUnitDropdown = false }
                ) {
                    UNITS.forEach { unit ->
                        DropdownMenuItem(
                            text = { Text(unit) },
                            onClick = {
                                viewModel.unit = unit
                                viewModel.showUnitDropdown = false
                            }
                        )
                    }
                }
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                OutlinedTextField(
                    value = viewModel.sellingPrice,
                    onValueChange = { viewModel.sellingPrice = it },
                    label = { Text("Selling Price *") },
                    leadingIcon = { Text("₹", style = MaterialTheme.typography.bodyLarge) },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                    modifier = Modifier.weight(1f),
                    singleLine = true
                )
                OutlinedTextField(
                    value = viewModel.purchasePrice,
                    onValueChange = { viewModel.purchasePrice = it },
                    label = { Text("Purchase Price") },
                    leadingIcon = { Text("₹", style = MaterialTheme.typography.bodyLarge) },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                    modifier = Modifier.weight(1f),
                    singleLine = true
                )
            }

            ExposedDropdownMenuBox(
                expanded = viewModel.showGstDropdown,
                onExpandedChange = { viewModel.showGstDropdown = it }
            ) {
                OutlinedTextField(
                    value = "${viewModel.gstRate}%",
                    onValueChange = {},
                    readOnly = true,
                    label = { Text("GST Rate") },
                    trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = viewModel.showGstDropdown) },
                    modifier = Modifier
                        .fillMaxWidth()
                        .menuAnchor()
                )
                ExposedDropdownMenu(
                    expanded = viewModel.showGstDropdown,
                    onDismissRequest = { viewModel.showGstDropdown = false }
                ) {
                    GST_OPTIONS.forEach { rate ->
                        DropdownMenuItem(
                            text = { Text("$rate%") },
                            onClick = {
                                viewModel.gstRate = rate
                                viewModel.showGstDropdown = false
                            }
                        )
                    }
                }
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                OutlinedTextField(
                    value = viewModel.stock,
                    onValueChange = { viewModel.stock = it },
                    label = { Text("Stock Quantity") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    modifier = Modifier.weight(1f),
                    singleLine = true
                )
                OutlinedTextField(
                    value = viewModel.lowStockAlert,
                    onValueChange = { viewModel.lowStockAlert = it },
                    label = { Text("Low Stock Alert") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    modifier = Modifier.weight(1f),
                    singleLine = true
                )
            }

            OutlinedTextField(
                value = viewModel.categoryName,
                onValueChange = { viewModel.categoryName = it },
                label = { Text("Category") },
                leadingIcon = { Icon(Icons.Default.Category, contentDescription = null) },
                singleLine = true,
                modifier = Modifier.fillMaxWidth()
            )

            viewModel.errorMessage?.let { error ->
                Text(
                    text = error,
                    color = MaterialTheme.colorScheme.error,
                    style = MaterialTheme.typography.bodySmall
                )
            }

            Spacer(modifier = Modifier.height(8.dp))

            Button(
                onClick = { viewModel.save(onBack) },
                enabled = !viewModel.isLoading,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(50.dp)
            ) {
                if (viewModel.isLoading) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(24.dp),
                        color = MaterialTheme.colorScheme.onPrimary,
                        strokeWidth = 2.dp
                    )
                } else {
                    Text(if (viewModel.isEditMode) "Update Product" else "Save Product")
                }
            }

            Spacer(modifier = Modifier.height(32.dp))
        }
    }
}

package com.gstbilling.app.ui.inventory

import androidx.compose.foundation.layout.*
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
import com.gstbilling.app.data.local.entity.ProductEntity
import com.gstbilling.app.data.remote.api.StockAdjustRequest
import com.gstbilling.app.data.repository.ProductRepository
import com.gstbilling.app.util.AppResult
import com.gstbilling.app.util.SessionManager
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class StockAdjustViewModel @Inject constructor(
    private val productRepository: ProductRepository,
    private val sessionManager: SessionManager
) : ViewModel() {

    var product by mutableStateOf<ProductEntity?>(null)
        private set
    var isLoading by mutableStateOf(false)
    var isSubmitting by mutableStateOf(false)
    var errorMessage by mutableStateOf<String?>(null)
    var successMessage by mutableStateOf<String?>(null)

    var adjustmentType by mutableStateOf("PURCHASE")
    var quantity by mutableStateOf("")
    var batchNo by mutableStateOf("")
    var warehouseId by mutableStateOf("")
    var notes by mutableStateOf("")
    var showTypeDropdown by mutableStateOf(false)

    private val adjustmentTypes = listOf("PURCHASE", "SALE", "ADJUSTMENT", "RETURN")

    fun loadProduct(productId: String) {
        isLoading = true
        viewModelScope.launch {
            product = productRepository.getProductById(productId)
            isLoading = false
        }
    }

    fun submitAdjustment(productId: String, onSuccess: () -> Unit) {
        val qty = quantity.toIntOrNull()
        if (qty == null || qty <= 0) {
            errorMessage = "Enter a valid quantity"
            return
        }
        isSubmitting = true
        errorMessage = null
        successMessage = null
        viewModelScope.launch {
            val request = StockAdjustRequest(
                quantity = qty,
                reason = notes.ifBlank { adjustmentType },
                type = adjustmentType
            )
            val businessId = sessionManager.getBusinessId() ?: return@launch
            when (val result = productRepository.adjustStock(businessId, productId, request)) {
                is AppResult.Success -> {
                    val updatedProduct = result.data
                    // Refresh local product
                    product = productRepository.getProductById(productId)
                    successMessage = "Stock adjusted to ${updatedProduct.stock}"
                    onSuccess()
                }
                is AppResult.Error -> {
                    errorMessage = result.message ?: "Failed to adjust stock"
                }
                else -> {}
            }
            isSubmitting = false
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun StockAdjustScreen(
    productId: String,
    onBack: () -> Unit,
    viewModel: StockAdjustViewModel = hiltViewModel()
) {
    LaunchedEffect(productId) {
        viewModel.loadProduct(productId)
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Adjust Stock") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        }
    ) { padding ->
        when {
            viewModel.isLoading -> {
                Box(
                    modifier = Modifier.fillMaxSize().padding(padding),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator()
                }
            }
            viewModel.product != null -> {
                val p = viewModel.product!!
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding)
                        .padding(horizontal = 16.dp)
                        .verticalScroll(rememberScrollState()),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Spacer(modifier = Modifier.height(4.dp))

                    Card(modifier = Modifier.fillMaxWidth()) {
                        Row(
                            modifier = Modifier.fillMaxWidth().padding(16.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                Icons.Default.Inventory2,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.primary,
                                modifier = Modifier.size(40.dp)
                            )
                            Spacer(modifier = Modifier.width(12.dp))
                            Column {
                                Text(
                                    p.name,
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.Bold
                                )
                                Text(
                                    "Current stock: ${p.stock} ${p.unit ?: ""}",
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = if (p.lowStockAlert != null && p.stock <= p.lowStockAlert!!)
                                        MaterialTheme.colorScheme.error
                                    else
                                        MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }
                    }

                    Text(
                        "Adjustment Type",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )

                    ExposedDropdownMenuBox(
                        expanded = viewModel.showTypeDropdown,
                        onExpandedChange = { viewModel.showTypeDropdown = it }
                    ) {
                        OutlinedTextField(
                            value = viewModel.adjustmentType,
                            onValueChange = {},
                            readOnly = true,
                            label = { Text("Type") },
                            leadingIcon = { Icon(Icons.Default.Category, contentDescription = null) },
                            trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = viewModel.showTypeDropdown) },
                            modifier = Modifier.fillMaxWidth().menuAnchor()
                        )
                        ExposedDropdownMenu(
                            expanded = viewModel.showTypeDropdown,
                            onDismissRequest = { viewModel.showTypeDropdown = false }
                        ) {
                            listOf("PURCHASE", "SALE", "ADJUSTMENT", "RETURN").forEach { type ->
                                DropdownMenuItem(
                                    text = { Text(type) },
                                    onClick = {
                                        viewModel.adjustmentType = type
                                        viewModel.showTypeDropdown = false
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

                    OutlinedTextField(
                        value = viewModel.batchNo,
                        onValueChange = { viewModel.batchNo = it },
                        label = { Text("Batch No") },
                        leadingIcon = { Icon(Icons.Default.QrCode, contentDescription = null) },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )

                    OutlinedTextField(
                        value = viewModel.warehouseId,
                        onValueChange = { viewModel.warehouseId = it },
                        label = { Text("Warehouse ID") },
                        leadingIcon = { Icon(Icons.Default.Warehouse, contentDescription = null) },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )

                    OutlinedTextField(
                        value = viewModel.notes,
                        onValueChange = { viewModel.notes = it },
                        label = { Text("Notes") },
                        leadingIcon = { Icon(Icons.Default.Notes, contentDescription = null) },
                        maxLines = 3,
                        modifier = Modifier.fillMaxWidth()
                    )

                    viewModel.errorMessage?.let { error ->
                        Text(
                            text = error,
                            color = MaterialTheme.colorScheme.error,
                            style = MaterialTheme.typography.bodySmall
                        )
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
                                Icon(
                                    Icons.Default.CheckCircle,
                                    contentDescription = null,
                                    tint = MaterialTheme.colorScheme.primary
                                )
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(msg, color = MaterialTheme.colorScheme.onPrimaryContainer)
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    Button(
                        onClick = { viewModel.submitAdjustment(productId) { } },
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
                            Icon(Icons.Default.Send, contentDescription = null)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Submit Adjustment")
                        }
                    }

                    Spacer(modifier = Modifier.height(32.dp))
                }
            }
        }
    }
}

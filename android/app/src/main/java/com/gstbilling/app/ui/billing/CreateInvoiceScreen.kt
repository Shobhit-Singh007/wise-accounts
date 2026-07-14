package com.gstbilling.app.ui.billing

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
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
import com.gstbilling.app.data.repository.InvoiceRepository
import com.gstbilling.app.util.AppResult
import com.gstbilling.app.util.SessionManager
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.*
import javax.inject.Inject

data class LineItemState(
    val productId: String = "",
    val productName: String = "",
    val hsnCode: String = "",
    val quantity: String = "1",
    val unitPrice: String = "0",
    val discount: String = "0",
    val gstRate: String = "18",
    val taxableAmount: Double = 0.0,
    val cgst: Double = 0.0,
    val sgst: Double = 0.0,
    val igst: Double = 0.0,
    val totalPrice: Double = 0.0
)

@HiltViewModel
class CreateInvoiceViewModel @Inject constructor(
    private val invoiceRepository: InvoiceRepository,
    private val sessionManager: SessionManager
) : ViewModel() {

    var customerId by mutableStateOf("")
    var customerName by mutableStateOf("")
    var customerGstin by mutableStateOf<String?>(null)
    var customerState by mutableStateOf<String?>(null)
    var customerAddress by mutableStateOf<String?>(null)
    var customerPhone by mutableStateOf<String?>(null)
    var invoiceType by mutableStateOf("B2C")
    var invoiceDate by mutableStateOf(SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date()))
    var dueDate by mutableStateOf("")
    var discount by mutableStateOf("0")
    var notes by mutableStateOf("")
    var lineItems = mutableStateListOf(LineItemState())
    var isLoading by mutableStateOf(false)
    var errorMessage by mutableStateOf<String?>(null)
    var isSuccess by mutableStateOf(false)

    var customerSearchResults by mutableStateOf<List<Customer>>(emptyList())
    var isSearchingCustomers by mutableStateOf(false)
    private var customerSearchJob: Job? = null

    var productSearchResults by mutableStateOf<List<Product>>(emptyList())
    var isSearchingProducts by mutableStateOf(false)
    private var productSearchJobs = mutableMapOf<Int, Job>()

    val subtotal by derivedStateOf { lineItems.sumOf { it.unitPrice.toDoubleOrNull()?.times(it.quantity.toDoubleOrNull() ?: 1.0) ?: 0.0 } }
    val discountAmount by derivedStateOf { discount.toDoubleOrNull() ?: 0.0 }
    val taxableAmount by derivedStateOf { subtotal - discountAmount }
    val totalCgst by derivedStateOf { lineItems.sumOf { it.cgst } }
    val totalSgst by derivedStateOf { lineItems.sumOf { it.sgst } }
    val totalIgst by derivedStateOf { lineItems.sumOf { it.igst } }
    val totalAmount by derivedStateOf { taxableAmount + totalCgst + totalSgst + totalIgst }

    fun searchCustomers(query: String) {
        customerSearchJob?.cancel()
        if (query.length < 2) {
            customerSearchResults = emptyList()
            return
        }
        customerSearchJob = viewModelScope.launch {
            isSearchingCustomers = true
            try {
                val businessId = sessionManager.getBusinessId() ?: return@launch
                when (val result = invoiceRepository.searchCustomers(businessId, query)) {
                    is AppResult.Success -> customerSearchResults = result.data ?: emptyList()
                    is AppResult.Error -> customerSearchResults = emptyList()
                    else -> {}
                }
            } catch (_: Exception) {
                customerSearchResults = emptyList()
            }
            isSearchingCustomers = false
        }
    }

    fun selectCustomer(customer: Customer) {
        customerId = customer.id
        customerName = customer.name
        customerGstin = customer.gstin
        customerState = customer.state
        customerAddress = customer.address
        customerPhone = customer.phone
        invoiceType = if (!customer.gstin.isNullOrBlank()) "B2B" else "B2C"
        customerSearchResults = emptyList()
    }

    fun clearCustomer() {
        customerId = ""
        customerName = ""
        customerGstin = null
        customerState = null
        customerAddress = null
        customerPhone = null
        invoiceType = "B2C"
    }

    fun searchProducts(query: String, lineIndex: Int) {
        productSearchJobs[lineIndex]?.cancel()
        if (query.length < 2) {
            productSearchResults = emptyList()
            return
        }
        productSearchJobs[lineIndex] = viewModelScope.launch {
            isSearchingProducts = true
            try {
                val businessId = sessionManager.getBusinessId() ?: return@launch
                when (val result = invoiceRepository.searchProducts(businessId, query)) {
                    is AppResult.Success -> productSearchResults = result.data ?: emptyList()
                    is AppResult.Error -> productSearchResults = emptyList()
                    else -> {}
                }
            } catch (_: Exception) {
                productSearchResults = emptyList()
            }
            isSearchingProducts = false
        }
    }

    fun selectProduct(product: Product, lineIndex: Int) {
        val item = lineItems[lineIndex]
        lineItems[lineIndex] = item.copy(
            productId = product.id,
            productName = product.name,
            hsnCode = product.hsn_code ?: "",
            unitPrice = product.sellingPrice.toString(),
            gstRate = product.gstRate.toString()
        )
        recalculateItem(lineIndex)
        productSearchResults = emptyList()
    }

    fun addLineItem() {
        lineItems.add(LineItemState())
    }

    fun removeLineItem(index: Int) {
        if (lineItems.size > 1) {
            lineItems.removeAt(index)
        }
    }

    fun updateLineItem(index: Int, item: LineItemState) {
        lineItems[index] = item
        recalculateItem(index)
    }

    private fun recalculateItem(index: Int) {
        val item = lineItems[index]
        val qty = item.quantity.toDoubleOrNull() ?: 0.0
        val price = item.unitPrice.toDoubleOrNull() ?: 0.0
        val disc = item.discount.toDoubleOrNull() ?: 0.0
        val gst = item.gstRate.toDoubleOrNull() ?: 0.0

        val lineTotal = qty * price
        val discAmount = lineTotal * (disc / 100.0)
        val taxable = lineTotal - discAmount
        val igst = taxable * (gst / 100.0)
        val cgst = igst / 2.0
        val sgst = igst / 2.0

        lineItems[index] = item.copy(
            taxableAmount = taxable,
            cgst = cgst,
            sgst = sgst,
            igst = igst,
            totalPrice = taxable + igst
        )
    }

    fun createInvoice(onSuccess: () -> Unit) {
        if (customerId.isBlank()) {
            errorMessage = "Please select a customer"
            return
        }
        isLoading = true
        errorMessage = null
        viewModelScope.launch {
            val items = lineItems.map { item ->
                InvoiceItemRequest(
                    productId = item.productId,
                    quantity = item.quantity.toDoubleOrNull() ?: 1.0,
                    unitPrice = item.unitPrice.toDoubleOrNull() ?: 0.0,
                    discount = item.discount.toDoubleOrNull() ?: 0.0,
                    gstRate = item.gstRate.toDoubleOrNull() ?: 0.0
                )
            }
            val request = CreateInvoiceRequest(
                customerId = customerId,
                invoiceDate = invoiceDate,
                dueDate = dueDate.ifBlank { null },
                items = items,
                discount = discountAmount,
                notes = notes.ifBlank { null }
            )
            when (val result = invoiceRepository.createInvoice(request)) {
                is AppResult.Success -> {
                    isLoading = false
                    isSuccess = true
                    onSuccess()
                }
                is AppResult.Error -> {
                    isLoading = false
                    errorMessage = result.message
                }
                is AppResult.Loading -> { }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CreateInvoiceScreen(
    customerId: String?,
    onBack: () -> Unit,
    onInvoiceCreated: () -> Unit,
    viewModel: CreateInvoiceViewModel = hiltViewModel()
) {
    var showCustomerSearch by remember { mutableStateOf(false) }
    var customerSearchQuery by remember { mutableStateOf("") }

    LaunchedEffect(customerId) {
        if (customerId != null && viewModel.customerId.isBlank()) {
            viewModel.customerId = customerId
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Create Invoice") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    TextButton(
                        onClick = { viewModel.createInvoice(onInvoiceCreated) },
                        enabled = !viewModel.isLoading
                    ) {
                        if (viewModel.isLoading) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(20.dp),
                                strokeWidth = 2.dp
                            )
                        } else {
                            Text("Save", fontWeight = FontWeight.Bold)
                        }
                    }
                }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            // Invoice Type
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                listOf("B2B", "B2C").forEach { type ->
                    FilterChip(
                        selected = viewModel.invoiceType == type,
                        onClick = { viewModel.invoiceType = type },
                        label = { Text(type) }
                    )
                }
            }

            // Customer Selection
            OutlinedTextField(
                value = viewModel.customerName,
                onValueChange = {
                    viewModel.customerName = it
                    showCustomerSearch = true
                    customerSearchQuery = it
                    viewModel.searchCustomers(it)
                },
                label = { Text("Customer Name") },
                leadingIcon = { Icon(Icons.Default.Person, contentDescription = null) },
                trailingIcon = {
                    if (viewModel.customerName.isNotEmpty()) {
                        IconButton(onClick = { viewModel.clearCustomer() }) {
                            Icon(Icons.Default.Clear, contentDescription = "Clear")
                        }
                    } else {
                        IconButton(onClick = { showCustomerSearch = true }) {
                            Icon(Icons.Default.Search, contentDescription = "Search customer")
                        }
                    }
                },
                singleLine = true,
                modifier = Modifier.fillMaxWidth()
            )

            // Customer Detail Card
            if (viewModel.customerId.isNotBlank()) {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.surfaceVariant
                    )
                ) {
                    Column(modifier = Modifier.padding(12.dp)) {
                        Text(
                            viewModel.customerName,
                            style = MaterialTheme.typography.bodyLarge,
                            fontWeight = FontWeight.Medium
                        )
                        viewModel.customerGstin?.let {
                            Text("GSTIN: $it", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.primary)
                        }
                        viewModel.customerState?.let {
                            Text("State: $it", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                        viewModel.customerAddress?.let {
                            Text(it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                        Text("Type: ${viewModel.invoiceType}", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.secondary)
                    }
                }
            }

            // Customer Search Dropdown
            if (showCustomerSearch && viewModel.customerSearchResults.isNotEmpty()) {
                Card(modifier = Modifier.fillMaxWidth()) {
                    LazyColumn(modifier = Modifier.heightIn(max = 200.dp)) {
                        items(viewModel.customerSearchResults) { customer ->
                            ListItem(
                                headlineContent = { Text(customer.name) },
                                supportingContent = {
                                    Text(buildString {
                                        append(customer.phone ?: "")
                                        customer.gstin?.let { append(" | GSTIN: $it") }
                                    })
                                },
                                leadingContent = { Icon(Icons.Default.Person, contentDescription = null) },
                                modifier = Modifier.clickable {
                                    viewModel.selectCustomer(customer)
                                    showCustomerSearch = false
                                    customerSearchQuery = ""
                                }
                            )
                            HorizontalDivider()
                        }
                    }
                }
            }

            // Dates
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                OutlinedTextField(
                    value = viewModel.invoiceDate,
                    onValueChange = { viewModel.invoiceDate = it },
                    label = { Text("Invoice Date") },
                    leadingIcon = { Icon(Icons.Default.CalendarToday, contentDescription = null) },
                    modifier = Modifier.weight(1f),
                    singleLine = true
                )
                OutlinedTextField(
                    value = viewModel.dueDate,
                    onValueChange = { viewModel.dueDate = it },
                    label = { Text("Due Date") },
                    leadingIcon = { Icon(Icons.Default.CalendarMonth, contentDescription = null) },
                    modifier = Modifier.weight(1f),
                    singleLine = true
                )
            }

            // Line Items Header
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    "Items",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
                IconButton(onClick = { viewModel.addLineItem() }) {
                    Icon(Icons.Default.AddCircle, contentDescription = "Add item")
                }
            }

            // Line Items
            viewModel.lineItems.forEachIndexed { index, item ->
                LineItemCard(
                    index = index,
                    item = item,
                    onUpdate = { viewModel.updateLineItem(index, it) },
                    onRemove = { viewModel.removeLineItem(index) },
                    isLast = index == viewModel.lineItems.lastIndex,
                    productSearchResults = viewModel.productSearchResults,
                    onSearchProduct = { query -> viewModel.searchProducts(query, index) },
                    onSelectProduct = { product -> viewModel.selectProduct(product, index) }
                )
            }

            // Summary
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.surfaceVariant
                )
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    SummaryRow("Subtotal", viewModel.subtotal)
                    OutlinedTextField(
                        value = viewModel.discount,
                        onValueChange = { viewModel.discount = it },
                        label = { Text("Discount") },
                        leadingIcon = { Text("₹", style = MaterialTheme.typography.bodyLarge) },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true
                    )
                    HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp))
                    SummaryRow("Taxable Amount", viewModel.taxableAmount)
                    SummaryRow("CGST", viewModel.totalCgst)
                    SummaryRow("SGST", viewModel.totalSgst)
                    SummaryRow("IGST", viewModel.totalIgst)
                    HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp))
                    SummaryRow("Total Amount", viewModel.totalAmount, bold = true)
                }
            }

            OutlinedTextField(
                value = viewModel.notes,
                onValueChange = { viewModel.notes = it },
                label = { Text("Notes") },
                minLines = 2,
                modifier = Modifier.fillMaxWidth()
            )

            viewModel.errorMessage?.let { error ->
                Text(
                    text = error,
                    color = MaterialTheme.colorScheme.error,
                    style = MaterialTheme.typography.bodySmall
                )
            }

            Button(
                onClick = { viewModel.createInvoice(onInvoiceCreated) },
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
                    Text("Create Invoice", fontWeight = FontWeight.Bold)
                }
            }

            Spacer(modifier = Modifier.height(32.dp))
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LineItemCard(
    index: Int,
    item: LineItemState,
    onUpdate: (LineItemState) -> Unit,
    onRemove: () -> Unit,
    isLast: Boolean,
    productSearchResults: List<Product>,
    onSearchProduct: (String) -> Unit,
    onSelectProduct: (Product) -> Unit
) {
    var showProductSearch by remember { mutableStateOf(false) }
    var productQuery by remember { mutableStateOf(item.productName) }

    Card(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(12.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    "Item ${index + 1}",
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

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                OutlinedTextField(
                    value = item.productName,
                    onValueChange = {
                        onUpdate(item.copy(productName = it))
                        productQuery = it
                        onSearchProduct(it)
                        showProductSearch = it.length >= 2
                    },
                    label = { Text("Product") },
                    leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
                    modifier = Modifier.weight(1f),
                    singleLine = true
                )
            }

            // Product Search Dropdown
            if (showProductSearch && productSearchResults.isNotEmpty()) {
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .heightIn(max = 150.dp)
                ) {
                    LazyColumn {
                        items(productSearchResults) { product ->
                            ListItem(
                                headlineContent = { Text(product.name) },
                                supportingContent = {
                                    Text(buildString {
                                        append("₹${product.sellingPrice}")
                                        product.sku?.let { append(" | SKU: $it") }
                                        append(" | Stock: ${product.stock}")
                                    })
                                },
                                modifier = Modifier.clickable {
                                    onSelectProduct(product)
                                    showProductSearch = false
                                    productQuery = product.name
                                }
                            )
                            HorizontalDivider()
                        }
                    }
                }
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                OutlinedTextField(
                    value = item.quantity,
                    onValueChange = { onUpdate(item.copy(quantity = it)) },
                    label = { Text("Qty") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    modifier = Modifier.weight(1f),
                    singleLine = true
                )
                OutlinedTextField(
                    value = item.unitPrice,
                    onValueChange = { onUpdate(item.copy(unitPrice = it)) },
                    label = { Text("Rate") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                    modifier = Modifier.weight(1f),
                    singleLine = true
                )
                OutlinedTextField(
                    value = item.discount,
                    onValueChange = { onUpdate(item.copy(discount = it)) },
                    label = { Text("Disc %") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                    modifier = Modifier.weight(1f),
                    singleLine = true
                )
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                OutlinedTextField(
                    value = item.gstRate,
                    onValueChange = { onUpdate(item.copy(gstRate = it)) },
                    label = { Text("GST %") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                    modifier = Modifier.weight(1f),
                    singleLine = true
                )
            }

            Text(
                text = "Amount: ₹${String.format("%.2f", item.totalPrice)}",
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(top = 4.dp)
            )
        }
    }
}

@Composable
fun SummaryRow(label: String, amount: Double, bold: Boolean = false) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 2.dp),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(
            text = label,
            style = if (bold) MaterialTheme.typography.titleSmall else MaterialTheme.typography.bodyMedium,
            fontWeight = if (bold) FontWeight.Bold else FontWeight.Normal
        )
        Text(
            text = "₹${String.format("%.2f", amount)}",
            style = if (bold) MaterialTheme.typography.titleSmall else MaterialTheme.typography.bodyMedium,
            fontWeight = if (bold) FontWeight.Bold else FontWeight.Normal
        )
    }
}

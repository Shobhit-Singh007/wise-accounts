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
import com.gstbilling.app.data.repository.InvoiceRepository
import com.gstbilling.app.util.AppResult
import com.gstbilling.app.util.SessionManager
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.*
import javax.inject.Inject

data class LineItemState(
    val productId: Long = 0,
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

    var customerId by mutableStateOf(0L)
    var customerName by mutableStateOf("")
    var invoiceDate by mutableStateOf(SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date()))
    var dueDate by mutableStateOf("")
    var discount by mutableStateOf("0")
    var notes by mutableStateOf("")
    var lineItems = mutableStateListOf(LineItemState())
    var isLoading by mutableStateOf(false)
    var errorMessage by mutableStateOf<String?>(null)
    var isSuccess by mutableStateOf(false)

    val subtotal by derivedStateOf { lineItems.sumOf { it.unitPrice.toDoubleOrNull()?.times(it.quantity.toDoubleOrNull() ?: 1.0) ?: 0.0 } }
    val discountAmount by derivedStateOf { discount.toDoubleOrNull() ?: 0.0 }
    val taxableAmount by derivedStateOf { subtotal - discountAmount }
    val totalCgst by derivedStateOf { lineItems.sumOf { it.cgst } }
    val totalSgst by derivedStateOf { lineItems.sumOf { it.sgst } }
    val totalIgst by derivedStateOf { lineItems.sumOf { it.igst } }
    val totalAmount by derivedStateOf { taxableAmount + totalCgst + totalSgst + totalIgst }

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
        if (customerId == 0L) {
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
    customerId: Long?,
    onBack: () -> Unit,
    onInvoiceCreated: () -> Unit,
    viewModel: CreateInvoiceViewModel = hiltViewModel()
) {
    LaunchedEffect(customerId) {
        if (customerId != null) {
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
            // Customer Selection
            OutlinedTextField(
                value = viewModel.customerName,
                onValueChange = { viewModel.customerName = it },
                label = { Text("Customer Name") },
                leadingIcon = { Icon(Icons.Default.Person, contentDescription = null) },
                trailingIcon = {
                    IconButton(onClick = { }) {
                        Icon(Icons.Default.Search, contentDescription = "Search customer")
                    }
                },
                singleLine = true,
                modifier = Modifier.fillMaxWidth()
            )

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
                    isLast = index == viewModel.lineItems.lastIndex
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
    isLast: Boolean
) {
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
                    onValueChange = { onUpdate(item.copy(productName = it)) },
                    label = { Text("Product") },
                    modifier = Modifier.weight(1f),
                    singleLine = true
                )
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

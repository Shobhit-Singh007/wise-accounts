package com.gstbilling.app.ui.billing

import android.content.Intent
import android.net.Uri
import android.os.Environment
import android.widget.Toast
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
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
import javax.inject.Inject

@HiltViewModel
class InvoiceDetailViewModel @Inject constructor(
    private val invoiceRepository: InvoiceRepository,
    private val apiService: ApiService,
    private val sessionManager: SessionManager
) : ViewModel() {

    var invoice by mutableStateOf<Invoice?>(null)
        private set
    var isLoading by mutableStateOf(false)
        private set
    var errorMessage by mutableStateOf<String?>(null)
        private set
    fun clearErrorMessage() { errorMessage = null }
    var showEwayBillSheet by mutableStateOf(false)
    var showEinvoiceSheet by mutableStateOf(false)
    var showGenerateBothSheet by mutableStateOf(false)

    fun loadInvoice(invoiceId: Long) {
        viewModelScope.launch {
            isLoading = true
            val entity = invoiceRepository.getInvoiceById(invoiceId)
            if (entity != null) {
                invoice = Invoice(
                    id = entity.id,
                    invoice_number = entity.invoiceNumber,
                    customer_id = entity.customerId,
                    customer_name = entity.customerName,
                    customer_gstin = entity.customerGstin,
                    business_id = entity.businessId,
                    invoice_date = entity.invoiceDate,
                    due_date = entity.dueDate,
                    subtotal = entity.subtotal,
                    discount = entity.discount,
                    taxable_amount = entity.taxableAmount,
                    cgst = entity.cgst,
                    sgst = entity.sgst,
                    igst = entity.igst,
                    total_amount = entity.totalAmount,
                    round_off = entity.roundOff,
                    status = entity.status,
                    notes = entity.notes
                )
            }
            isLoading = false
        }
    }

    fun cancelInvoice(invoiceId: Long) {
        viewModelScope.launch {
            isLoading = true
            val result = invoiceRepository.cancelInvoice(invoiceId)
            when (result) {
                is AppResult.Success -> { invoice = result.data }
                is AppResult.Error -> { errorMessage = result.message }
                is AppResult.Loading -> {}
            }
            isLoading = false
        }
    }

    fun generateEwayBill(businessId: Long, invoiceId: Long, request: EwayBillRequest) {
        viewModelScope.launch {
            isLoading = true
            try {
                val response = apiService.generateEwayBill(
                    businessId.toString(), invoiceId.toString(), request
                )
                if (response.isSuccessful) {
                    val result = response.body()?.data
                    val updated = invoice?.copy(
                        ewayBillNo = result?.ewayBillNo,
                        ewayBillDate = result?.ewayBillDate,
                        vehicleNo = result?.vehicleNo,
                        transporterName = result?.transporterName,
                        distanceKm = result?.distanceKm
                    )
                    invoice = updated
                    showEwayBillSheet = false
                } else {
                    errorMessage = response.errorBody()?.string() ?: "Failed to generate E-Way Bill"
                }
            } catch (e: Exception) {
                errorMessage = e.message
            }
            isLoading = false
        }
    }

    fun generateEinvoice(businessId: Long, invoiceId: Long, request: EinvoiceRequest) {
        viewModelScope.launch {
            isLoading = true
            try {
                val response = apiService.generateEinvoice(
                    businessId.toString(), invoiceId.toString(), request
                )
                if (response.isSuccessful) {
                    val result = response.body()?.data
                    val updated = invoice?.copy(
                        irn = result?.irn,
                        irnDate = result?.irnDate,
                        ackNo = result?.ackNo,
                        ackDate = result?.ackDate,
                        qrCode = result?.qrCode
                    )
                    invoice = updated
                    showEinvoiceSheet = false
                } else {
                    errorMessage = response.errorBody()?.string() ?: "Failed to generate e-Invoice"
                }
            } catch (e: Exception) {
                errorMessage = e.message
            }
            isLoading = false
        }
    }

    fun generateBoth(businessId: Long, invoiceId: Long, request: GenerateBothRequest) {
        viewModelScope.launch {
            isLoading = true
            try {
                val response = apiService.generateBoth(
                    businessId.toString(), invoiceId.toString(), request
                )
                if (response.isSuccessful) {
                    val result = response.body()?.data
                    val updated = invoice?.copy(
                        ewayBillNo = result?.ewayBill?.ewayBillNo,
                        ewayBillDate = result?.ewayBill?.ewayBillDate,
                        vehicleNo = result?.ewayBill?.vehicleNo,
                        transporterName = result?.ewayBill?.transporterName,
                        distanceKm = result?.ewayBill?.distanceKm,
                        irn = result?.einvoice?.irn,
                        irnDate = result?.einvoice?.irnDate,
                        ackNo = result?.einvoice?.ackNo,
                        ackDate = result?.einvoice?.ackDate,
                        qrCode = result?.einvoice?.qrCode
                    )
                    invoice = updated
                    showGenerateBothSheet = false
                } else {
                    errorMessage = response.errorBody()?.string() ?: "Failed to generate"
                }
            } catch (e: Exception) {
                errorMessage = e.message
            }
            isLoading = false
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun InvoiceDetailScreen(
    invoiceId: Long,
    onBack: () -> Unit,
    viewModel: InvoiceDetailViewModel = hiltViewModel()
) {
    val context = LocalContext.current
    val invoice = viewModel.invoice
    var showCancelDialog by remember { mutableStateOf(false) }

    LaunchedEffect(invoiceId) {
        viewModel.loadInvoice(invoiceId)
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Invoice Detail") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        }
    ) { padding ->
        if (viewModel.isLoading && invoice == null) {
            Box(
                modifier = Modifier.fillMaxSize().padding(padding),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator()
            }
        } else if (invoice == null) {
            Box(
                modifier = Modifier.fillMaxSize().padding(padding),
                contentAlignment = Alignment.Center
            ) {
                Text("Invoice not found")
            }
        } else {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .verticalScroll(rememberScrollState())
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Card(modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                invoice.invoice_number,
                                style = MaterialTheme.typography.titleLarge,
                                fontWeight = FontWeight.Bold
                            )
                            SuggestionChip(
                                onClick = {},
                                label = {
                                    Text(
                                        invoice.status.replaceFirstChar { it.uppercase() },
                                        style = MaterialTheme.typography.labelSmall
                                    )
                                },
                                colors = SuggestionChipDefaults.suggestionChipColors(
                                    containerColor = when (invoice.status) {
                                        "paid" -> Color(0xFFE8F5E9)
                                        "unpaid", "CONFIRMED" -> Color(0xFFFFEBEE)
                                        "cancelled" -> Color(0xFFF5F5F5)
                                        else -> Color(0xFFFFF8E1)
                                    }
                                )
                            )
                        }
                        Spacer(modifier = Modifier.height(8.dp))
                        LabeledRow("Customer", invoice.customer_name ?: "Walk-in")
                        if (invoice.customer_gstin != null) {
                            LabeledRow("GSTIN", invoice.customer_gstin!!)
                        }
                        LabeledRow("Date", invoice.invoice_date)
                        if (invoice.due_date != null) {
                            LabeledRow("Due Date", invoice.due_date!!)
                        }
                    }
                }

                Card(modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text("Amounts", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                        Spacer(modifier = Modifier.height(4.dp))
                        LabeledRow("Subtotal", "₹${String.format("%.2f", invoice.subtotal)}")
                        if (invoice.discount > 0) {
                            LabeledRow("Discount", "-₹${String.format("%.2f", invoice.discount)}")
                        }
                        LabeledRow("CGST", "₹${String.format("%.2f", invoice.cgst)}")
                        LabeledRow("SGST", "₹${String.format("%.2f", invoice.sgst)}")
                        if (invoice.igst > 0) {
                            LabeledRow("IGST", "₹${String.format("%.2f", invoice.igst)}")
                        }
                        HorizontalDivider(modifier = Modifier.padding(vertical = 4.dp))
                        LabeledRow(
                            "Grand Total",
                            "₹${String.format("%.2f", invoice.total_amount)}",
                            fontWeight = FontWeight.Bold
                        )
                    }
                }

                if (invoice.ewayBillNo != null && invoice.ewayBillNo!!.isNotEmpty()) {
                    Card(modifier = Modifier.fillMaxWidth()) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Text("E-Way Bill", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                            Spacer(modifier = Modifier.height(4.dp))
                            LabeledRow("E-Way Bill No", invoice.ewayBillNo!!)
                            invoice.ewayBillDate?.let { LabeledRow("Date", it) }
                            invoice.vehicleNo?.let { LabeledRow("Vehicle No", it) }
                            invoice.transporterName?.let { LabeledRow("Transporter", it) }
                            invoice.distanceKm?.let { LabeledRow("Distance", "$it km") }
                        }
                    }
                }

                if (invoice.irn != null && invoice.irn!!.isNotEmpty()) {
                    Card(modifier = Modifier.fillMaxWidth()) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Text("e-Invoice", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                            Spacer(modifier = Modifier.height(4.dp))
                            LabeledRow("IRN", invoice.irn!!)
                            invoice.irnDate?.let { LabeledRow("IRN Date", it) }
                            invoice.ackNo?.let { LabeledRow("Ack No", it) }
                            invoice.ackDate?.let { LabeledRow("Ack Date", it) }
                        }
                    }
                }

                if (invoice.notes != null && invoice.notes!!.isNotEmpty()) {
                    Card(modifier = Modifier.fillMaxWidth()) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Text("Notes", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(invoice.notes!!, style = MaterialTheme.typography.bodyMedium)
                        }
                    }
                }

                if (invoice.status != "cancelled") {
                    Button(
                        onClick = { viewModel.showGenerateBothSheet = true },
                        modifier = Modifier.fillMaxWidth(),
                        colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)
                    ) {
                        Icon(Icons.Default.Bolt, contentDescription = null)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("E-Way Bill & e-Invoice (One Click)")
                    }

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        val hasEwayBill = invoice.ewayBillNo != null && invoice.ewayBillNo!!.isNotEmpty()
                        val hasEinvoice = invoice.irn != null && invoice.irn!!.isNotEmpty()

                        OutlinedButton(
                            onClick = { viewModel.showEwayBillSheet = true },
                            modifier = Modifier.weight(1f),
                            enabled = !hasEwayBill
                        ) {
                            Icon(Icons.Default.LocalShipping, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(if (hasEwayBill) "Generated" else "E-Way Bill", style = MaterialTheme.typography.labelMedium)
                        }

                        OutlinedButton(
                            onClick = { viewModel.showEinvoiceSheet = true },
                            modifier = Modifier.weight(1f),
                            enabled = !hasEinvoice
                        ) {
                            Icon(Icons.Default.Description, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(if (hasEinvoice) "Generated" else "e-Invoice", style = MaterialTheme.typography.labelMedium)
                        }
                    }

                    OutlinedButton(
                        onClick = {
                            val baseUrl = "http://10.0.2.2:3000/api/v1"
                            val url = "$baseUrl/businesses/${invoice.business_id}/invoices/${invoice.id}/print"
                            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
                            context.startActivity(intent)
                        },
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Icon(Icons.Default.Print, contentDescription = null)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Print / PDF")
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    OutlinedButton(
                        onClick = { showCancelDialog = true },
                        modifier = Modifier.fillMaxWidth(),
                        colors = ButtonDefaults.outlinedButtonColors(contentColor = Color.Red)
                    ) {
                        Icon(Icons.Default.Cancel, contentDescription = null)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Cancel Invoice")
                    }
                }

                if (invoice.status == "cancelled") {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = Color(0xFFFFEBEE))
                    ) {
                        Text(
                            "This invoice has been cancelled",
                            modifier = Modifier.padding(16.dp),
                            color = Color.Red,
                            style = MaterialTheme.typography.bodyMedium
                        )
                    }
                }
            }
        }

        if (showCancelDialog) {
            AlertDialog(
                onDismissRequest = { showCancelDialog = false },
                title = { Text("Cancel Invoice") },
                text = { Text("This action cannot be undone. Are you sure?") },
                confirmButton = {
                    TextButton(
                        onClick = {
                            showCancelDialog = false
                            viewModel.cancelInvoice(invoiceId)
                        }
                    ) { Text("Cancel Invoice", color = Color.Red) }
                },
                dismissButton = {
                    TextButton(onClick = { showCancelDialog = false }) { Text("Keep") }
                }
            )
        }

        if (viewModel.showGenerateBothSheet) {
            GenerateBothSheet(
                invoice = invoice!!,
                onDismiss = { viewModel.showGenerateBothSheet = false },
                onGenerate = { request ->
                    viewModel.generateBoth(invoice!!.business_id, invoice!!.id, request)
                }
            )
        }

        if (viewModel.showEwayBillSheet) {
            EwayBillSheet(
                invoice = invoice!!,
                onDismiss = { viewModel.showEwayBillSheet = false },
                onGenerate = { request ->
                    viewModel.generateEwayBill(invoice!!.business_id, invoice!!.id, request)
                }
            )
        }

        if (viewModel.showEinvoiceSheet) {
            EinvoiceSheet(
                invoice = invoice!!,
                onDismiss = { viewModel.showEinvoiceSheet = false },
                onGenerate = { request ->
                    viewModel.generateEinvoice(invoice!!.business_id, invoice!!.id, request)
                }
            )
        }

        viewModel.errorMessage?.let { msg ->
            Snackbar(
                modifier = Modifier.padding(16.dp),
                action = {
                    TextButton(onClick = { viewModel.clearErrorMessage() }) {
                        Text("Dismiss")
                    }
                }
            ) {
                Text(msg)
            }
        }
    }
}

@Composable
fun LabeledRow(label: String, value: String, fontWeight: FontWeight = FontWeight.Normal) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 2.dp),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(label, style = MaterialTheme.typography.bodySmall, color = Color.Gray)
        Text(value, style = MaterialTheme.typography.bodySmall, fontWeight = fontWeight)
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun GenerateBothSheet(
    invoice: Invoice,
    onDismiss: () -> Unit,
    onGenerate: (GenerateBothRequest) -> Unit
) {
    var vehicleNo by remember { mutableStateOf("") }
    var distanceKm by remember { mutableStateOf("") }
    var transporterId by remember { mutableStateOf("") }
    var transporterName by remember { mutableStateOf("") }
    var generateEinvoice by remember { mutableStateOf(true) }

    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Text("Generate E-Way Bill & e-Invoice", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
            Text("One-click generation for both documents", style = MaterialTheme.typography.bodySmall, color = Color.Gray)

            OutlinedTextField(
                value = vehicleNo,
                onValueChange = { vehicleNo = it },
                label = { Text("Vehicle Number *") },
                modifier = Modifier.fillMaxWidth()
            )

            OutlinedTextField(
                value = distanceKm,
                onValueChange = { distanceKm = it },
                label = { Text("Distance (km) *") },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                modifier = Modifier.fillMaxWidth()
            )

            OutlinedTextField(
                value = transporterId,
                onValueChange = { transporterId = it },
                label = { Text("Transporter ID (GSTIN/PAN)") },
                modifier = Modifier.fillMaxWidth()
            )

            OutlinedTextField(
                value = transporterName,
                onValueChange = { transporterName = it },
                label = { Text("Transporter Name") },
                modifier = Modifier.fillMaxWidth()
            )

            Row(verticalAlignment = Alignment.CenterVertically) {
                Checkbox(checked = generateEinvoice, onCheckedChange = { generateEinvoice = it })
                Text("Also generate e-Invoice", style = MaterialTheme.typography.bodyMedium)
            }

            Button(
                onClick = {
                    val dist = distanceKm.toIntOrNull() ?: 0
                    if (vehicleNo.isNotEmpty() && dist > 0) {
                        onGenerate(
                            GenerateBothRequest(
                                vehicleNo = vehicleNo,
                                distanceKm = dist,
                                transporterId = transporterId.ifEmpty { null },
                                transporterName = transporterName.ifEmpty { null },
                                generateEinvoice = generateEinvoice
                            )
                        )
                    }
                },
                modifier = Modifier.fillMaxWidth(),
                enabled = vehicleNo.isNotEmpty() && (distanceKm.toIntOrNull() ?: 0) > 0
            ) {
                Icon(Icons.Default.Bolt, contentDescription = null)
                Spacer(modifier = Modifier.width(8.dp))
                Text("Generate Both")
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EwayBillSheet(
    invoice: Invoice,
    onDismiss: () -> Unit,
    onGenerate: (EwayBillRequest) -> Unit
) {
    var vehicleNo by remember { mutableStateOf("") }
    var distanceKm by remember { mutableStateOf("") }
    var transporterId by remember { mutableStateOf("") }
    var transporterName by remember { mutableStateOf("") }

    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Text("Generate E-Way Bill", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)

            OutlinedTextField(
                value = vehicleNo,
                onValueChange = { vehicleNo = it },
                label = { Text("Vehicle Number *") },
                modifier = Modifier.fillMaxWidth()
            )

            OutlinedTextField(
                value = distanceKm,
                onValueChange = { distanceKm = it },
                label = { Text("Distance (km) *") },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                modifier = Modifier.fillMaxWidth()
            )

            OutlinedTextField(
                value = transporterId,
                onValueChange = { transporterId = it },
                label = { Text("Transporter ID (GSTIN/PAN)") },
                modifier = Modifier.fillMaxWidth()
            )

            OutlinedTextField(
                value = transporterName,
                onValueChange = { transporterName = it },
                label = { Text("Transporter Name") },
                modifier = Modifier.fillMaxWidth()
            )

            Button(
                onClick = {
                    val dist = distanceKm.toIntOrNull() ?: 0
                    if (vehicleNo.isNotEmpty() && dist > 0) {
                        onGenerate(
                            EwayBillRequest(
                                vehicleNo = vehicleNo,
                                distanceKm = dist,
                                transporterId = transporterId.ifEmpty { null },
                                transporterName = transporterName.ifEmpty { null }
                            )
                        )
                    }
                },
                modifier = Modifier.fillMaxWidth(),
                enabled = vehicleNo.isNotEmpty() && (distanceKm.toIntOrNull() ?: 0) > 0
            ) {
                Text("Generate E-Way Bill")
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EinvoiceSheet(
    invoice: Invoice,
    onDismiss: () -> Unit,
    onGenerate: (EinvoiceRequest) -> Unit
) {
    var autoGenerate by remember { mutableStateOf(true) }
    var irn by remember { mutableStateOf("") }
    var ackNo by remember { mutableStateOf("") }

    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Text("Generate e-Invoice", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)

            Row(verticalAlignment = Alignment.CenterVertically) {
                Checkbox(checked = autoGenerate, onCheckedChange = { autoGenerate = it })
                Text("Auto-generate via GSTN API")
            }

            if (!autoGenerate) {
                OutlinedTextField(
                    value = irn,
                    onValueChange = { irn = it },
                    label = { Text("IRN") },
                    modifier = Modifier.fillMaxWidth()
                )
                OutlinedTextField(
                    value = ackNo,
                    onValueChange = { ackNo = it },
                    label = { Text("Acknowledgement No") },
                    modifier = Modifier.fillMaxWidth()
                )
            }

            Button(
                onClick = {
                    onGenerate(
                        EinvoiceRequest(
                            generateViaApi = autoGenerate,
                            irn = if (autoGenerate) null else irn.ifEmpty { null },
                            ackNo = if (autoGenerate) null else ackNo.ifEmpty { null }
                        )
                    )
                },
                modifier = Modifier.fillMaxWidth()
            ) {
                Text("Generate e-Invoice")
            }
        }
    }
}

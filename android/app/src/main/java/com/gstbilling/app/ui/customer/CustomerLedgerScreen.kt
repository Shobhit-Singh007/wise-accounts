package com.gstbilling.app.ui.customer

import android.content.Intent
import android.net.Uri
import com.gstbilling.app.BuildConfig
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import coil.compose.AsyncImage
import com.gstbilling.app.data.remote.api.*
import com.gstbilling.app.data.repository.CustomerRepository
import com.gstbilling.app.util.AppResult
import com.gstbilling.app.util.SessionManager
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.ui.text.input.KeyboardType
import java.text.SimpleDateFormat
import java.util.*
import javax.inject.Inject

@HiltViewModel
class CustomerLedgerViewModel @Inject constructor(
    private val customerRepository: CustomerRepository,
    private val sessionManager: SessionManager
) : ViewModel() {

    var ledgerResponse by mutableStateOf<LedgerResponse?>(null)
    var isLoading by mutableStateOf(false)
    var errorMessage by mutableStateOf<String?>(null)

    var showEntryDialog by mutableStateOf(false)
    var entryType by mutableStateOf("GAVE")
    var entryAmount by mutableStateOf("")
    var entryPaymentMode by mutableStateOf("CASH")
    var entryDescription by mutableStateOf("")
    var entryDate by mutableStateOf(SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date()))
    var entryReference by mutableStateOf("")
    var isSaving by mutableStateOf(false)
    var selectedImageUri by mutableStateOf<android.net.Uri?>(null)
    var selectedImageFile by mutableStateOf<java.io.File?>(null)

    var showSmsDialog by mutableStateOf(false)
    var smsPhone by mutableStateOf("")
    var smsMessage by mutableStateOf("")
    var isSendingSms by mutableStateOf(false)

    var snackbarMessage by mutableStateOf<String?>(null)

    fun downloadPdf(customerId: String, context: android.content.Context) {
        viewModelScope.launch {
            snackbarMessage = "Downloading PDF..."
            val businessId = sessionManager.getBusinessId() ?: ""
            when (val result = customerRepository.getLedgerPdf(businessId, customerId)) {
                is AppResult.Success -> {
                    try {
                        val file = java.io.File(context.cacheDir, "ledger_${customerId}.pdf")
                        result.data?.byteStream()?.use { input ->
                            file.outputStream().use { output -> input.copyTo(output) }
                        }
                        val uri = androidx.core.content.FileProvider.getUriForFile(
                            context,
                            "${context.packageName}.fileprovider",
                            file
                        )
                        val intent = android.content.Intent(android.content.Intent.ACTION_VIEW).apply {
                            setDataAndType(uri, "application/pdf")
                            addFlags(android.content.Intent.FLAG_GRANT_READ_URI_PERMISSION)
                        }
                        context.startActivity(android.content.Intent.createChooser(intent, "Open Ledger PDF"))
                    } catch (e: Exception) {
                        snackbarMessage = "Failed to open PDF: ${e.message}"
                    }
                }
                is AppResult.Error -> snackbarMessage = result.message
                is AppResult.Loading -> {}
            }
        }
    }

    fun sharePdf(customerId: String, context: android.content.Context) {
        viewModelScope.launch {
            val businessId = sessionManager.getBusinessId() ?: ""
            when (val result = customerRepository.getLedgerPdf(businessId, customerId)) {
                is AppResult.Success -> {
                    try {
                        val file = java.io.File(context.cacheDir, "ledger_${customerId}.pdf")
                        result.data?.byteStream()?.use { input ->
                            file.outputStream().use { output -> input.copyTo(output) }
                        }
                        val uri = androidx.core.content.FileProvider.getUriForFile(
                            context,
                            "${context.packageName}.fileprovider",
                            file
                        )
                        val shareIntent = android.content.Intent(android.content.Intent.ACTION_SEND).apply {
                            type = "application/pdf"
                            putExtra(android.content.Intent.EXTRA_STREAM, uri)
                            putExtra(android.content.Intent.EXTRA_SUBJECT, "Customer Ledger")
                            addFlags(android.content.Intent.FLAG_GRANT_READ_URI_PERMISSION)
                        }
                        context.startActivity(android.content.Intent.createChooser(shareIntent, "Share Ledger PDF"))
                    } catch (e: Exception) {
                        snackbarMessage = "Failed to share PDF: ${e.message}"
                    }
                }
                is AppResult.Error -> snackbarMessage = result.message
                is AppResult.Loading -> {}
            }
        }
    }

    fun openImageUrl(url: String, context: android.content.Context) {
        try {
            val fullUrl = if (url.startsWith("http")) url else "${BuildConfig.API_BASE_URL.trimEnd('/')}$url"
            val intent = android.content.Intent(android.content.Intent.ACTION_VIEW, android.net.Uri.parse(fullUrl))
            context.startActivity(intent)
        } catch (e: Exception) {
            snackbarMessage = "Cannot open image"
        }
    }

    fun loadLedger(customerId: String) {
        viewModelScope.launch {
            isLoading = true
            errorMessage = null
            val businessId = sessionManager.getBusinessId() ?: ""
            val result = customerRepository.getCustomerLedger(businessId, customerId)
            when (result) {
                is AppResult.Success -> {
                    ledgerResponse = result.data
                    smsPhone = result.data?.customer?.phone ?: ""
                }
                is AppResult.Error -> errorMessage = result.message
                is AppResult.Loading -> {}
            }
            isLoading = false
        }
    }

    fun openEntryDialog(type: String) {
        entryType = type
        entryAmount = ""
        entryPaymentMode = "CASH"
        entryDescription = ""
        entryDate = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())
        entryReference = ""
        selectedImageUri = null
        selectedImageFile = null
        showEntryDialog = true
    }

    fun saveEntry(customerId: String) {
        val amount = entryAmount.toDoubleOrNull() ?: return
        if (amount <= 0) {
            snackbarMessage = "Enter a valid amount"
            return
        }
        viewModelScope.launch {
            isSaving = true
            val businessId = sessionManager.getBusinessId() ?: ""
            var imageUrl: String? = null
            if (selectedImageFile != null) {
                when (val uploadResult = customerRepository.uploadLedgerImage(businessId, customerId, selectedImageFile!!)) {
                    is AppResult.Success -> imageUrl = uploadResult.data?.url
                    is AppResult.Error -> {
                        snackbarMessage = "Image upload failed: ${uploadResult.message}"
                        isSaving = false
                        return@launch
                    }
                    is AppResult.Loading -> {}
                }
            }
            val request = CreateLedgerEntryRequest(
                amount = amount,
                type = entryType,
                paymentMode = entryPaymentMode,
                description = entryDescription.ifBlank { null },
                date = entryDate.ifBlank { null },
                reference = entryReference.ifBlank { null },
                imageUrl = imageUrl
            )
            when (val result = customerRepository.createLedgerEntry(businessId, customerId, request)) {
                is AppResult.Success -> {
                    showEntryDialog = false
                    snackbarMessage = if (entryType == "GAVE") "Debit entry added" else "Credit entry added"
                    loadLedger(customerId)
                }
                is AppResult.Error -> snackbarMessage = result.message
                is AppResult.Loading -> {}
            }
            isSaving = false
        }
    }

    fun deleteEntry(customerId: String, transactionId: String) {
        viewModelScope.launch {
            val businessId = sessionManager.getBusinessId() ?: ""
            when (val result = customerRepository.deleteLedgerEntry(businessId, customerId, transactionId)) {
                is AppResult.Success -> {
                    snackbarMessage = "Transaction deleted"
                    loadLedger(customerId)
                }
                is AppResult.Error -> snackbarMessage = result.message
                is AppResult.Loading -> {}
            }
        }
    }

    fun openSmsDialog() {
        smsMessage = ""
        showSmsDialog = true
    }

    fun sendSms(customerId: String) {
        if (smsPhone.isBlank()) {
            snackbarMessage = "Enter phone number"
            return
        }
        viewModelScope.launch {
            isSendingSms = true
            val businessId = sessionManager.getBusinessId() ?: ""
            val request = SendLedgerSmsRequest(
                phone = smsPhone.ifBlank { null },
                message = smsMessage.ifBlank { null }
            )
            when (val result = customerRepository.sendLedgerSms(businessId, customerId, request)) {
                is AppResult.Success -> {
                    showSmsDialog = false
                    snackbarMessage = "SMS sent to ${result.data?.phone}"
                }
                is AppResult.Error -> snackbarMessage = result.message
                is AppResult.Loading -> {}
            }
            isSendingSms = false
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CustomerLedgerScreen(
    customerId: String,
    onBack: () -> Unit,
    viewModel: CustomerLedgerViewModel = hiltViewModel()
) {
    val context = LocalContext.current
    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(customerId) {
        viewModel.loadLedger(customerId)
    }

    LaunchedEffect(viewModel.snackbarMessage) {
        viewModel.snackbarMessage?.let {
            snackbarHostState.showSnackbar(it)
            viewModel.snackbarMessage = null
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Customer Ledger") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    IconButton(onClick = { viewModel.downloadPdf(customerId, context) }) {
                        Icon(Icons.Default.PictureAsPdf, contentDescription = "Download PDF")
                    }
                    IconButton(onClick = { viewModel.sharePdf(customerId, context) }) {
                        Icon(Icons.Default.Share, contentDescription = "Share PDF")
                    }
                    IconButton(onClick = { viewModel.openSmsDialog() }) {
                        Icon(Icons.Default.Sms, contentDescription = "Send SMS")
                    }
                }
            )
        },
        snackbarHost = { SnackbarHost(snackbarHostState) }
    ) { padding ->
        when {
            viewModel.isLoading -> {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator()
                }
            }
            viewModel.errorMessage != null -> {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(
                            Icons.Default.ErrorOutline,
                            contentDescription = null,
                            modifier = Modifier.size(64.dp),
                            tint = MaterialTheme.colorScheme.error
                        )
                        Spacer(modifier = Modifier.height(16.dp))
                        Text(
                            text = viewModel.errorMessage ?: "Error",
                            style = MaterialTheme.typography.bodyLarge,
                            color = MaterialTheme.colorScheme.error
                        )
                    }
                }
            }
            viewModel.ledgerResponse != null -> {
                val response = viewModel.ledgerResponse!!
                LazyColumn(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    item {
                        CustomerHeaderCard(response.customer)
                    }
                    item {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            Button(
                                onClick = { viewModel.openEntryDialog("GAVE") },
                                modifier = Modifier.weight(1f).height(56.dp),
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = Color(0xFFF44336)
                                ),
                                shape = RoundedCornerShape(12.dp)
                            ) {
                                Icon(Icons.Default.TrendingDown, contentDescription = null, tint = Color.White)
                                Spacer(modifier = Modifier.width(8.dp))
                                Text("You Gave", fontWeight = FontWeight.Bold, color = Color.White)
                            }
                            Button(
                                onClick = { viewModel.openEntryDialog("RECEIVED") },
                                modifier = Modifier.weight(1f).height(56.dp),
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = Color(0xFF4CAF50)
                                ),
                                shape = RoundedCornerShape(12.dp)
                            ) {
                                Icon(Icons.Default.TrendingUp, contentDescription = null, tint = Color.White)
                                Spacer(modifier = Modifier.width(8.dp))
                                Text("You Got", fontWeight = FontWeight.Bold, color = Color.White)
                            }
                        }
                    }
                    item {
                        SummaryCards(response.summary)
                    }
                    item {
                        TransactionHeader()
                    }
                    items(response.entries) { entry ->
                        TransactionRow(
                            entry = entry,
                            onDelete = {
                                viewModel.deleteEntry(customerId, entry.id)
                            },
                            onImageClick = { url ->
                                viewModel.openImageUrl(url, context)
                            }
                        )
                    }
                    item {
                        TransactionFooter(response.summary)
                    }
                }
            }
        }

        // Entry Dialog
        if (viewModel.showEntryDialog) {
            AlertDialog(
                onDismissRequest = { viewModel.showEntryDialog = false },
                title = {
                    Column {
                        Text(
                            text = if (viewModel.entryType == "GAVE") "You Gave (Debit)" else "You Got (Credit)",
                            fontWeight = FontWeight.Bold,
                            color = if (viewModel.entryType == "GAVE") Color(0xFFF44336) else Color(0xFF4CAF50)
                        )
                        Text(
                            text = if (viewModel.entryType == "GAVE") "Customer now owes you more" else "Customer has paid you",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                },
                text = {
                    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        OutlinedTextField(
                            value = viewModel.entryAmount,
                            onValueChange = { viewModel.entryAmount = it },
                            label = { Text("Amount (\u20B9)") },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true
                        )

                        var paymentModeExpanded by remember { mutableStateOf(false) }
                        ExposedDropdownMenuBox(
                            expanded = paymentModeExpanded,
                            onExpandedChange = { paymentModeExpanded = it }
                        ) {
                            OutlinedTextField(
                                value = viewModel.entryPaymentMode,
                                onValueChange = {},
                                readOnly = true,
                                label = { Text("Payment Mode") },
                                trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = paymentModeExpanded) },
                                modifier = Modifier.fillMaxWidth().menuAnchor()
                            )
                            ExposedDropdownMenu(
                                expanded = paymentModeExpanded,
                                onDismissRequest = { paymentModeExpanded = false }
                            ) {
                                listOf("CASH", "UPI", "BANK_TRANSFER", "CHEQUE", "OTHER").forEach { mode ->
                                    DropdownMenuItem(
                                        text = { Text(mode.replace("_", " ").lowercase().replaceFirstChar { it.uppercase() }) },
                                        onClick = {
                                            viewModel.entryPaymentMode = mode
                                            paymentModeExpanded = false
                                        }
                                    )
                                }
                            }
                        }

                        OutlinedTextField(
                            value = viewModel.entryDate,
                            onValueChange = { viewModel.entryDate = it },
                            label = { Text("Date") },
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true
                        )

                        OutlinedTextField(
                            value = viewModel.entryDescription,
                            onValueChange = { viewModel.entryDescription = it },
                            label = { Text("Description") },
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true
                        )

                        OutlinedTextField(
                            value = viewModel.entryReference,
                            onValueChange = { viewModel.entryReference = it },
                            label = { Text("Reference Number") },
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true
                        )

                        // Image attachment
                        val imagePickerLauncher = rememberLauncherForActivityResult(
                            contract = ActivityResultContracts.GetContent()
                        ) { uri: android.net.Uri? ->
                            uri?.let {
                                viewModel.selectedImageUri = it
                                val ctx = context
                                val inputStream = ctx.contentResolver.openInputStream(it)
                                val file = java.io.File(ctx.cacheDir, "ledger_img_${System.currentTimeMillis()}.jpg")
                                inputStream?.use { input ->
                                    file.outputStream().use { output -> input.copyTo(output) }
                                }
                                viewModel.selectedImageFile = file
                            }
                        }

                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .border(1.dp, MaterialTheme.colorScheme.outline, RoundedCornerShape(8.dp))
                                .clickable { imagePickerLauncher.launch("image/*") }
                                .padding(12.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            if (viewModel.selectedImageUri != null) {
                                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                    AsyncImage(
                                        model = viewModel.selectedImageUri,
                                        contentDescription = "Selected image",
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .height(120.dp)
                                            .clip(RoundedCornerShape(8.dp)),
                                        contentScale = ContentScale.Crop
                                    )
                                    Spacer(modifier = Modifier.height(4.dp))
                                    Text("Tap to change", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.primary)
                                }
                            } else {
                                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                    Icon(Icons.Default.CameraAlt, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
                                    Spacer(modifier = Modifier.height(4.dp))
                                    Text("Attach photo", style = MaterialTheme.typography.bodySmall)
                                    Text("Receipt, payment proof, etc.", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                            }
                        }
                    }
                },
                confirmButton = {
                    Button(
                        onClick = { viewModel.saveEntry(customerId) },
                        enabled = !viewModel.isSaving && viewModel.entryAmount.isNotBlank(),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = if (viewModel.entryType == "GAVE") Color(0xFFF44336) else Color(0xFF4CAF50)
                        )
                    ) {
                        if (viewModel.isSaving) {
                            CircularProgressIndicator(modifier = Modifier.size(20.dp), color = Color.White, strokeWidth = 2.dp)
                        } else {
                            Text(if (viewModel.entryType == "GAVE") "Add Debit" else "Add Credit", fontWeight = FontWeight.Bold)
                        }
                    }
                },
                dismissButton = {
                    TextButton(onClick = { viewModel.showEntryDialog = false }) {
                        Text("Cancel")
                    }
                }
            )
        }

        // SMS Dialog
        if (viewModel.showSmsDialog) {
            AlertDialog(
                onDismissRequest = { viewModel.showSmsDialog = false },
                title = {
                    Column {
                        Text("Send Ledger SMS", fontWeight = FontWeight.Bold)
                        Text(
                            text = "Send balance update and ledger link to customer",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                },
                text = {
                    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        OutlinedTextField(
                            value = viewModel.smsPhone,
                            onValueChange = { viewModel.smsPhone = it },
                            label = { Text("Phone Number") },
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true
                        )
                        OutlinedTextField(
                            value = viewModel.smsMessage,
                            onValueChange = { viewModel.smsMessage = it },
                            label = { Text("Custom Message (optional)") },
                            modifier = Modifier.fillMaxWidth(),
                            minLines = 2,
                            maxLines = 4
                        )
                    }
                },
                confirmButton = {
                    Button(
                        onClick = { viewModel.sendSms(customerId) },
                        enabled = !viewModel.isSendingSms && viewModel.smsPhone.isNotBlank(),
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1565C0))
                    ) {
                        if (viewModel.isSendingSms) {
                            CircularProgressIndicator(modifier = Modifier.size(20.dp), color = Color.White, strokeWidth = 2.dp)
                        } else {
                            Text("Send SMS", fontWeight = FontWeight.Bold)
                        }
                    }
                },
                dismissButton = {
                    TextButton(onClick = { viewModel.showSmsDialog = false }) {
                        Text("Cancel")
                    }
                }
            )
        }
    }
}

@Composable
fun CustomerHeaderCard(customer: LedgerCustomer) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp)
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .background(
                    Brush.linearGradient(
                        colors = listOf(
                            Color(0xFF1A237E),
                            Color(0xFF283593)
                        )
                    )
                )
                .padding(20.dp)
        ) {
            Column {
                Text(
                    text = customer.name,
                    style = MaterialTheme.typography.headlineSmall,
                    color = Color.White,
                    fontWeight = FontWeight.Bold
                )
                Spacer(modifier = Modifier.height(8.dp))
                if (customer.phone != null) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            Icons.Default.Phone,
                            contentDescription = null,
                            tint = Color(0xFF90CAF9),
                            modifier = Modifier.size(16.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = customer.phone!!,
                            style = MaterialTheme.typography.bodyMedium,
                            color = Color(0xFF90CAF9)
                        )
                    }
                }
                if (customer.gstin != null) {
                    Spacer(modifier = Modifier.height(4.dp))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            Icons.Default.Business,
                            contentDescription = null,
                            tint = Color(0xFF90CAF9),
                            modifier = Modifier.size(16.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "GSTIN: ${customer.gstin}",
                            style = MaterialTheme.typography.bodyMedium,
                            color = Color(0xFF90CAF9)
                        )
                    }
                }
                if (customer.address != null) {
                    Spacer(modifier = Modifier.height(4.dp))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            Icons.Default.LocationOn,
                            contentDescription = null,
                            tint = Color(0xFF90CAF9),
                            modifier = Modifier.size(16.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = listOfNotNull(customer.address, customer.city, customer.state)
                                .joinToString(", "),
                            style = MaterialTheme.typography.bodyMedium,
                            color = Color(0xFF90CAF9)
                        )
                    }
                }
                Spacer(modifier = Modifier.height(8.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Column {
                        Text(
                            text = "Credit Limit",
                            style = MaterialTheme.typography.labelSmall,
                            color = Color(0xFF90CAF9)
                        )
                        Text(
                            text = "\u20B9${String.format("%.2f", customer.creditLimit)}",
                            style = MaterialTheme.typography.bodyMedium,
                            color = Color.White,
                            fontWeight = FontWeight.Bold
                        )
                    }
                    Column(horizontalAlignment = Alignment.End) {
                        Text(
                            text = "Current Balance",
                            style = MaterialTheme.typography.labelSmall,
                            color = Color(0xFF90CAF9)
                        )
                        Text(
                            text = "\u20B9${String.format("%.2f", customer.currentBalance)}",
                            style = MaterialTheme.typography.bodyMedium,
                            color = if (customer.currentBalance > 0) Color(0xFFFFAB91) else Color(0xFFA5D6A7),
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun SummaryCards(summary: LedgerSummary) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        SummaryCard(
            label = "Opening",
            value = summary.openingBalance,
            color = Color(0xFFFF9800),
            modifier = Modifier.weight(1f)
        )
        SummaryCard(
            label = "Debit",
            value = summary.totalDebit,
            color = Color(0xFFF44336),
            modifier = Modifier.weight(1f)
        )
        SummaryCard(
            label = "Credit",
            value = summary.totalCredit,
            color = Color(0xFF4CAF50),
            modifier = Modifier.weight(1f)
        )
        SummaryCard(
            label = "Closing",
            value = summary.closingBalance,
            color = if (summary.closingBalance > 0) Color(0xFFF44336) else Color(0xFF4CAF50),
            modifier = Modifier.weight(1f)
        )
    }
}

@Composable
fun SummaryCard(
    label: String,
    value: Double,
    color: Color,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier,
        shape = RoundedCornerShape(8.dp),
        colors = CardDefaults.cardColors(
            containerColor = color.copy(alpha = 0.1f)
        )
    ) {
        Column(
            modifier = Modifier.padding(8.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                text = label,
                style = MaterialTheme.typography.labelSmall,
                color = color
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = "\u20B9${String.format("%.0f", value)}",
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.Bold,
                color = color
            )
        }
    }
}

@Composable
fun TransactionHeader() {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(8.dp))
            .background(MaterialTheme.colorScheme.surfaceVariant)
            .padding(horizontal = 12.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = "Date",
            style = MaterialTheme.typography.labelMedium,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.weight(1.5f)
        )
        Text(
            text = "Description",
            style = MaterialTheme.typography.labelMedium,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.weight(2.5f)
        )
        Text(
            text = "Dr",
            style = MaterialTheme.typography.labelMedium,
            fontWeight = FontWeight.Bold,
            textAlign = TextAlign.End,
            modifier = Modifier.weight(1f)
        )
        Text(
            text = "Cr",
            style = MaterialTheme.typography.labelMedium,
            fontWeight = FontWeight.Bold,
            textAlign = TextAlign.End,
            modifier = Modifier.weight(1f)
        )
        Text(
            text = "Balance",
            style = MaterialTheme.typography.labelMedium,
            fontWeight = FontWeight.Bold,
            textAlign = TextAlign.End,
            modifier = Modifier.weight(1.2f)
        )
        Spacer(modifier = Modifier.weight(0.3f))
    }
}

@Composable
fun TransactionRow(
    entry: LedgerEntry,
    onDelete: () -> Unit = {},
    onImageClick: (String) -> Unit = {}
) {
    val isStandalone = entry.type == "LEDGER_GAVE" || entry.type == "LEDGER_RECEIVED"
    val typeColor = when {
        entry.type.contains("INVOICE") || entry.type == "LEDGER_GAVE" -> Color(0xFFF44336)
        entry.type.contains("PAYMENT") || entry.type == "LEDGER_RECEIVED" -> Color(0xFF4CAF50)
        entry.type == "OPENING_BALANCE" -> Color(0xFF9C27B0)
        else -> MaterialTheme.colorScheme.onSurface
    }
    val typeLabel = when {
        entry.type.contains("INVOICE") || entry.type == "LEDGER_GAVE" -> "Dr"
        entry.type.contains("PAYMENT") || entry.type == "LEDGER_RECEIVED" -> "Cr"
        entry.type == "OPENING_BALANCE" -> "OB"
        else -> entry.type
    }

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = entry.date,
            style = MaterialTheme.typography.bodySmall,
            modifier = Modifier.weight(1.5f)
        )
        Column(modifier = Modifier.weight(2.5f)) {
            Text(
                text = entry.description,
                style = MaterialTheme.typography.bodySmall
            )
            if (entry.invoiceNo != null) {
                Text(
                    text = "Inv: ${entry.invoiceNo}",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            if (entry.imageUrl != null) {
                AsyncImage(
                    model = entry.imageUrl,
                    contentDescription = "Attachment",
                    modifier = Modifier
                        .size(40.dp)
                        .clip(RoundedCornerShape(4.dp))
                        .clickable { onImageClick(entry.imageUrl ?: "") },
                    contentScale = ContentScale.Crop
                )
            }
        }
        Text(
            text = if (entry.debit > 0) String.format("%.2f", entry.debit) else "-",
            style = MaterialTheme.typography.bodySmall,
            color = if (entry.debit > 0) Color(0xFFF44336) else MaterialTheme.colorScheme.onSurfaceVariant,
            textAlign = TextAlign.End,
            modifier = Modifier.weight(1f)
        )
        Text(
            text = if (entry.credit > 0) String.format("%.2f", entry.credit) else "-",
            style = MaterialTheme.typography.bodySmall,
            color = if (entry.credit > 0) Color(0xFF4CAF50) else MaterialTheme.colorScheme.onSurfaceVariant,
            textAlign = TextAlign.End,
            modifier = Modifier.weight(1f)
        )
        Row(
            modifier = Modifier.weight(1.2f),
            horizontalArrangement = Arrangement.End,
            verticalAlignment = Alignment.CenterVertically
        ) {
            SuggestionChip(
                onClick = {},
                label = {
                    Text(
                        text = typeLabel,
                        style = MaterialTheme.typography.labelSmall,
                        color = Color.White
                    )
                },
                colors = SuggestionChipDefaults.suggestionChipColors(
                    containerColor = typeColor
                ),
                modifier = Modifier.height(24.dp)
            )
            Spacer(modifier = Modifier.width(4.dp))
            Text(
                text = String.format("%.2f", entry.balanceAfter),
                style = MaterialTheme.typography.bodySmall,
                fontWeight = FontWeight.Bold,
                color = if (entry.balanceAfter > 0) Color(0xFFF44336) else Color(0xFF4CAF50),
                textAlign = TextAlign.End
            )
        }
        if (isStandalone) {
            IconButton(onClick = onDelete, modifier = Modifier.size(32.dp)) {
                Icon(
                    Icons.Default.Delete,
                    contentDescription = "Delete",
                    tint = Color(0xFFF44336),
                    modifier = Modifier.size(18.dp)
                )
            }
        } else {
            Spacer(modifier = Modifier.width(32.dp))
        }
    }
    HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
}

@Composable
fun TransactionFooter(summary: LedgerSummary) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant
        )
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Column {
                Text(
                    text = "Total Entries: ${summary.totalEntries}",
                    style = MaterialTheme.typography.labelMedium,
                    fontWeight = FontWeight.Bold
                )
            }
            Column(horizontalAlignment = Alignment.End) {
                Text(
                    text = "Total Dr: \u20B9${String.format("%.2f", summary.totalDebit)}",
                    style = MaterialTheme.typography.labelMedium,
                    color = Color(0xFFF44336),
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = "Total Cr: \u20B9${String.format("%.2f", summary.totalCredit)}",
                    style = MaterialTheme.typography.labelMedium,
                    color = Color(0xFF4CAF50),
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = "Closing: \u20B9${String.format("%.2f", summary.closingBalance)}",
                    style = MaterialTheme.typography.titleSmall,
                    color = if (summary.closingBalance > 0) Color(0xFFF44336) else Color(0xFF4CAF50),
                    fontWeight = FontWeight.Bold
                )
            }
        }
    }
}

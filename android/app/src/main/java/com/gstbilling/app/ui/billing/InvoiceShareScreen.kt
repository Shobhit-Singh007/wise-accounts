package com.gstbilling.app.ui.billing

import android.content.Intent
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
import com.gstbilling.app.data.remote.api.ApiService
import com.gstbilling.app.data.remote.api.Invoice
import com.gstbilling.app.data.remote.api.InvoiceShareRequest
import com.gstbilling.app.util.AppResult
import com.gstbilling.app.util.SessionManager
import com.gstbilling.app.util.safeApiCall
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class InvoiceShareViewModel @Inject constructor(
    private val apiService: ApiService,
    private val sessionManager: SessionManager
) : ViewModel() {

    var invoice by mutableStateOf<Invoice?>(null)
        private set
    var isLoading by mutableStateOf(false)
        private set
    var errorMessage by mutableStateOf<String?>(null)
        private set
    var shareSuccess by mutableStateOf(false)
        private set
    fun resetShareSuccess() { shareSuccess = false }
    var selectedMethod by mutableStateOf("SMS")
    var recipient by mutableStateOf("")
    var customMessage by mutableStateOf("")

    fun loadInvoice(invoiceId: String) {
        viewModelScope.launch {
            isLoading = true
            val businessId = sessionManager.getBusinessId() ?: return@launch
            when (val result = safeApiCall { apiService.getInvoice(invoiceId) }) {
                is AppResult.Success -> {
                    invoice = result.data?.body()?.data
                }
                is AppResult.Error -> {
                    errorMessage = result.message
                }
                else -> {}
            }
            isLoading = false
        }
    }

    fun shareInvoice(invoiceId: String) {
        if (recipient.isBlank()) {
            errorMessage = "Please enter a recipient"
            return
        }
        viewModelScope.launch {
            isLoading = true
            errorMessage = null
            val businessId = sessionManager.getBusinessId() ?: return@launch
            val request = InvoiceShareRequest(
                method = selectedMethod,
                recipient = recipient.trim(),
                message = customMessage.ifBlank { null }
            )
            when (val result = safeApiCall {
                apiService.shareInvoice(businessId.toString(), invoiceId.toString(), request)
            }) {
                is AppResult.Success -> {
                    shareSuccess = true
                }
                is AppResult.Error -> {
                    errorMessage = result.message
                }
                else -> {}
            }
            isLoading = false
        }
    }

    fun getShareIntent(invoiceId: String): Intent {
        val inv = invoice
        val shareText = buildString {
            append("Invoice ${inv?.invoiceNumber ?: ""}")
            append("\nAmount: ₹${String.format("%.2f", inv?.totalAmount ?: 0.0)}")
            if (customMessage.isNotBlank()) {
                append("\n\n$customMessage")
            }
        }
        return Intent(Intent.ACTION_SEND).apply {
            type = "text/plain"
            putExtra(Intent.EXTRA_TEXT, shareText)
            putExtra(Intent.EXTRA_SUBJECT, "Invoice ${inv?.invoiceNumber ?: ""}")
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun InvoiceShareScreen(
    invoiceId: String,
    onBack: () -> Unit,
    viewModel: InvoiceShareViewModel = hiltViewModel()
) {
    val context = LocalContext.current
    val invoice = viewModel.invoice
    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(invoiceId) {
        viewModel.loadInvoice(invoiceId)
    }

    LaunchedEffect(viewModel.shareSuccess) {
        if (viewModel.shareSuccess) {
            snackbarHostState.showSnackbar("Invoice shared successfully")
            viewModel.resetShareSuccess()
            onBack()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Share Invoice") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        },
        snackbarHost = { SnackbarHost(snackbarHostState) }
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
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                Card(modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text(
                            "Invoice Summary",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        LabeledRow("Invoice Number", invoice.invoiceNumber)
                        LabeledRow("Customer", invoice.customerName ?: "Walk-in")
                        LabeledRow(
                            "Total Amount",
                            "₹${String.format("%.2f", invoice.totalAmount)}"
                        )
                        LabeledRow("Status", invoice.status.replaceFirstChar { it.uppercase() })
                        LabeledRow("Date", invoice.invoiceDate)
                    }
                }

                Card(modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text(
                            "Share Via",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold
                        )
                        Spacer(modifier = Modifier.height(12.dp))

                        val methods = listOf("SMS" to Icons.Default.Sms, "Email" to Icons.Default.Email, "WhatsApp" to Icons.Default.Chat)
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            methods.forEach { (method, icon) ->
                                FilterChip(
                                    selected = viewModel.selectedMethod == method,
                                    onClick = { viewModel.selectedMethod = method },
                                    label = { Text(method) },
                                    leadingIcon = {
                                        Icon(icon, contentDescription = null, modifier = Modifier.size(18.dp))
                                    },
                                    modifier = Modifier.weight(1f)
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(12.dp))

                        OutlinedTextField(
                            value = viewModel.recipient,
                            onValueChange = { viewModel.recipient = it },
                            label = {
                                Text(
                                    when (viewModel.selectedMethod) {
                                        "SMS" -> "Phone Number"
                                        "Email" -> "Email Address"
                                        "WhatsApp" -> "WhatsApp Number"
                                        else -> "Recipient"
                                    }
                                )
                            },
                            leadingIcon = {
                                Icon(
                                    when (viewModel.selectedMethod) {
                                        "SMS", "WhatsApp" -> Icons.Default.Phone
                                        else -> Icons.Default.Email
                                    },
                                    contentDescription = null
                                )
                            },
                            keyboardOptions = KeyboardOptions(
                                keyboardType = if (viewModel.selectedMethod == "Email") KeyboardType.Email else KeyboardType.Phone
                            ),
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth()
                        )

                        Spacer(modifier = Modifier.height(8.dp))

                        OutlinedTextField(
                            value = viewModel.customMessage,
                            onValueChange = { viewModel.customMessage = it },
                            label = { Text("Custom Message (Optional)") },
                            minLines = 2,
                            maxLines = 4,
                            modifier = Modifier.fillMaxWidth()
                        )
                    }
                }

                viewModel.errorMessage?.let { error ->
                    Text(
                        text = error,
                        color = MaterialTheme.colorScheme.error,
                        style = MaterialTheme.typography.bodySmall
                    )
                }

                Button(
                    onClick = { viewModel.shareInvoice(invoiceId) },
                    enabled = !viewModel.isLoading && viewModel.recipient.isNotBlank(),
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
                        Icon(Icons.Default.Share, contentDescription = null)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Share Invoice", fontWeight = FontWeight.Bold)
                    }
                }

                OutlinedButton(
                    onClick = {
                        val intent = viewModel.getShareIntent(invoiceId)
                        context.startActivity(Intent.createChooser(intent, "Share Invoice"))
                    },
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Icon(Icons.Default.OpenInNew, contentDescription = null)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Share via Other Apps")
                }
            }
        }
    }
}

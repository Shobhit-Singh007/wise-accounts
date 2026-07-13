package com.gstbilling.app.ui.payments

import android.content.Intent
import android.net.Uri
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.gstbilling.app.data.remote.api.ApiService
import com.gstbilling.app.data.remote.api.RecordPaymentRequest
import com.gstbilling.app.data.remote.api.UpiLinkRequest
import com.gstbilling.app.util.AppResult
import com.gstbilling.app.util.SessionManager
import com.gstbilling.app.util.safeApiCall
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.*
import javax.inject.Inject

@HiltViewModel
class RecordPaymentViewModel @Inject constructor(
    private val apiService: ApiService,
    private val sessionManager: SessionManager
) : ViewModel() {

    var invoiceId by mutableStateOf(0L)
    var customerId by mutableStateOf(0L)
    var amount by mutableStateOf("")
    var selectedMethod by mutableStateOf("CASH")
    var referenceNumber by mutableStateOf("")
    var notes by mutableStateOf("")
    var paymentDate by mutableStateOf(SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date()))

    var isLoading by mutableStateOf(false)
        private set
    var errorMessage by mutableStateOf<String?>(null)
        private set
    var isSuccess by mutableStateOf(false)
        private set
    var upiLink by mutableStateOf<String?>(null)
        private set

    val methods = listOf("CASH", "UPI", "BANK_TRANSFER", "CARD", "RAZORPAY", "CHEQUE")

    fun setArgs(invId: Long?, custId: Long?) {
        invId?.let { invoiceId = it }
        custId?.let { customerId = it }
    }

    fun submitPayment() {
        val amt = amount.toDoubleOrNull()
        if (amt == null || amt <= 0) {
            errorMessage = "Please enter a valid amount"
            return
        }
        if (invoiceId == 0L) {
            errorMessage = "Invoice ID is required"
            return
        }
        viewModelScope.launch {
            isLoading = true
            errorMessage = null
            val businessId = sessionManager.getBusinessId() ?: return@launch

            if (selectedMethod == "UPI") {
                when (val result = safeApiCall {
                    apiService.generateUpiLinkForBusiness(
                        businessId.toString(),
                        UpiLinkRequest(invoice_id = invoiceId, amount = amt)
                    )
                }) {
                    is AppResult.Success -> {
                        upiLink = result.data?.data?.upi_link
                    }
                    is AppResult.Error -> {
                        errorMessage = result.message
                    }
                    else -> {}
                }
                isLoading = false
                return@launch
            }

            val request = RecordPaymentRequest(
                invoice_id = invoiceId,
                amount = amt,
                date = paymentDate,
                mode = selectedMethod,
                reference = referenceNumber.ifBlank { null },
                notes = notes.ifBlank { null }
            )
            when (val result = safeApiCall {
                apiService.recordBusinessPayment(businessId.toString(), request)
            }) {
                is AppResult.Success -> {
                    isSuccess = true
                }
                is AppResult.Error -> {
                    errorMessage = result.message
                }
                else -> {}
            }
            isLoading = false
        }
    }

    fun generateUpiLink() {
        val amt = amount.toDoubleOrNull()
        if (amt == null || amt <= 0) {
            errorMessage = "Please enter a valid amount"
            return
        }
        viewModelScope.launch {
            isLoading = true
            val businessId = sessionManager.getBusinessId() ?: return@launch
            when (val result = safeApiCall {
                apiService.generateUpiLinkForBusiness(
                    businessId.toString(),
                    UpiLinkRequest(invoice_id = invoiceId, amount = amt)
                )
            }) {
                is AppResult.Success -> {
                    upiLink = result.data?.data?.upi_link
                }
                is AppResult.Error -> {
                    errorMessage = result.message
                }
                else -> {}
            }
            isLoading = false
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RecordPaymentScreen(
    invoiceId: Long?,
    customerId: Long?,
    onBack: () -> Unit,
    viewModel: RecordPaymentViewModel = hiltViewModel()
) {
    val context = LocalContext.current
    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(invoiceId, customerId) {
        viewModel.setArgs(invoiceId, customerId)
    }

    LaunchedEffect(viewModel.isSuccess) {
        if (viewModel.isSuccess) {
            snackbarHostState.showSnackbar("Payment recorded successfully")
            onBack()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Record Payment") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        },
        snackbarHost = { SnackbarHost(snackbarHostState) }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            OutlinedTextField(
                value = viewModel.amount,
                onValueChange = { viewModel.amount = it },
                label = { Text("Amount *") },
                leadingIcon = { Text("₹", style = MaterialTheme.typography.bodyLarge) },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                modifier = Modifier.fillMaxWidth(),
                singleLine = true
            )

            OutlinedTextField(
                value = viewModel.paymentDate,
                onValueChange = { viewModel.paymentDate = it },
                label = { Text("Payment Date") },
                leadingIcon = { Icon(Icons.Default.CalendarToday, contentDescription = null) },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true
            )

            Text("Payment Method", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)

            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                viewModel.methods.chunked(3).forEach { row ->
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        row.forEach { method ->
                            FilterChip(
                                selected = viewModel.selectedMethod == method,
                                onClick = { viewModel.selectedMethod = method },
                                label = {
                                    Text(
                                        method.replace("_", " "),
                                        style = MaterialTheme.typography.labelSmall
                                    )
                                },
                                modifier = Modifier.weight(1f)
                            )
                        }
                        repeat(3 - row.size) {
                            Spacer(modifier = Modifier.weight(1f))
                        }
                    }
                }
            }

            if (viewModel.selectedMethod != "UPI") {
                OutlinedTextField(
                    value = viewModel.referenceNumber,
                    onValueChange = { viewModel.referenceNumber = it },
                    label = {
                        Text(
                            when (viewModel.selectedMethod) {
                                "BANK_TRANSFER" -> "UTR / Transaction ID"
                                "CARD" -> "Card Last 4 Digits"
                                "CHEQUE" -> "Cheque Number"
                                "RAZORPAY" -> "Razorpay Order ID"
                                else -> "Reference Number"
                            }
                        )
                    },
                    leadingIcon = { Icon(Icons.Default.Tag, contentDescription = null) },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )
            }

            OutlinedTextField(
                value = viewModel.notes,
                onValueChange = { viewModel.notes = it },
                label = { Text("Notes") },
                minLines = 2,
                modifier = Modifier.fillMaxWidth()
            )

            viewModel.upiLink?.let { link ->
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.primaryContainer
                    )
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text(
                            "UPI Payment Link",
                            style = MaterialTheme.typography.titleSmall,
                            fontWeight = FontWeight.Bold
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(link, style = MaterialTheme.typography.bodySmall)
                        Spacer(modifier = Modifier.height(8.dp))
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            OutlinedButton(onClick = {
                                val clip = android.content.ClipData.newPlainText("UPI Link", link)
                                context.getSystemService(android.content.ClipboardManager::class.java)
                                    ?.setPrimaryClip(clip)
                            }) {
                                Text("Copy")
                            }
                            Button(onClick = {
                                val intent = Intent(Intent.ACTION_SEND).apply {
                                    type = "text/plain"
                                    putExtra(Intent.EXTRA_TEXT, link)
                                }
                                context.startActivity(Intent.createChooser(intent, "Share UPI Link"))
                            }) {
                                Text("Share")
                            }
                        }
                    }
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
                onClick = {
                    if (viewModel.selectedMethod == "UPI") {
                        viewModel.generateUpiLink()
                    } else {
                        viewModel.submitPayment()
                    }
                },
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
                    Text(
                        if (viewModel.selectedMethod == "UPI") "Generate UPI Link" else "Submit Payment",
                        fontWeight = FontWeight.Bold
                    )
                }
            }

            Spacer(modifier = Modifier.height(32.dp))
        }
    }
}

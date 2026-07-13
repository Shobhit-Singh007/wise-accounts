package com.gstbilling.app.ui.payments

import android.app.Activity
import android.content.Intent
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
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
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.razorpay.Checkout
import com.razorpay.PaymentResultListener
import org.json.JSONObject

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RazorpayCheckoutScreen(
    amount: Double,
    invoiceNo: String?,
    customerName: String,
    razorpayKeyId: String,
    onBack: () -> Unit,
    onPaymentSuccess: (String) -> Unit,
    onPaymentError: (String) -> Unit
) {
    val context = LocalContext.current
    var isProcessing by remember { mutableStateOf(false) }
    var paymentStatus by remember { mutableStateOf<String?>(null) }
    var paymentId by remember { mutableStateOf<String?>(null) }
    var errorMessage by remember { mutableStateOf<String?>(null) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Razorpay Payment") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, "Back")
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
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Amount Card
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer)
            ) {
                Column(
                    modifier = Modifier.padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text("Amount to Pay", style = MaterialTheme.typography.bodyLarge, color = MaterialTheme.colorScheme.onPrimaryContainer)
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        "₹${String.format("%.2f", amount)}",
                        style = MaterialTheme.typography.headlineLarge,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onPrimaryContainer
                    )
                    if (invoiceNo != null) {
                        Spacer(modifier = Modifier.height(4.dp))
                        Text("Invoice: $invoiceNo", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = 0.7f))
                    }
                    Spacer(modifier = Modifier.height(4.dp))
                    Text("To: $customerName", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = 0.7f))
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            // Payment Status
            when {
                paymentStatus == "SUCCESS" -> {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = Color(0xFFE8F5E9))
                    ) {
                        Column(
                            modifier = Modifier.padding(24.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Icon(
                                Icons.Default.CheckCircle,
                                contentDescription = null,
                                modifier = Modifier.size(64.dp),
                                tint = Color(0xFF2E7D32)
                            )
                            Spacer(modifier = Modifier.height(12.dp))
                            Text("Payment Successful!", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, color = Color(0xFF2E7D32))
                            Spacer(modifier = Modifier.height(4.dp))
                            Text("Payment ID: $paymentId", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            Spacer(modifier = Modifier.height(16.dp))
                            Button(onClick = { onPaymentSuccess(paymentId ?: "") }) {
                                Text("Continue")
                            }
                        }
                    }
                }
                paymentStatus == "FAILED" -> {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.errorContainer)
                    ) {
                        Column(
                            modifier = Modifier.padding(24.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Icon(
                                Icons.Default.Error,
                                contentDescription = null,
                                modifier = Modifier.size(64.dp),
                                tint = MaterialTheme.colorScheme.error
                            )
                            Spacer(modifier = Modifier.height(12.dp))
                            Text("Payment Failed", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.error)
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(errorMessage ?: "Unknown error", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, textAlign = TextAlign.Center)
                            Spacer(modifier = Modifier.height(16.dp))
                            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                                OutlinedButton(onClick = onBack) { Text("Cancel") }
                                Button(onClick = {
                                    paymentStatus = null
                                    errorMessage = null
                                    isProcessing = false
                                }) { Text("Retry") }
                            }
                        }
                    }
                }
                else -> {
                    // Payment Details
                    Card(modifier = Modifier.fillMaxWidth()) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Text("Payment Details", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                            Spacer(modifier = Modifier.height(12.dp))
                            DetailRow("Customer", customerName)
                            if (invoiceNo != null) DetailRow("Invoice", invoiceNo)
                            DetailRow("Amount", "₹${String.format("%.2f", amount)}")
                            DetailRow("Payment Gateway", "Razorpay")
                            DetailRow("Currency", "INR")
                        }
                    }

                    Spacer(modifier = Modifier.height(24.dp))

                    // Supported payment methods
                    Text("Supported Payment Methods", style = MaterialTheme.typography.titleSmall, color = MaterialTheme.colorScheme.outline)
                    Spacer(modifier = Modifier.height(8.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceEvenly
                    ) {
                        PaymentMethodChip("UPI")
                        PaymentMethodChip("Cards")
                        PaymentMethodChip("Netbanking")
                        PaymentMethodChip("Wallets")
                    }

                    Spacer(modifier = Modifier.height(32.dp))

                    // Pay Button
                    Button(
                        onClick = {
                            isProcessing = true
                            startRazorpayCheckout(
                                activity = context as Activity,
                                amount = amount,
                                razorpayKeyId = razorpayKeyId,
                                description = "Payment for ${invoiceNo ?: "order"}",
                                onSuccess = { rpPaymentId ->
                                    paymentStatus = "SUCCESS"
                                    paymentId = rpPaymentId
                                    isProcessing = false
                                },
                                onError = { code, description ->
                                    paymentStatus = "FAILED"
                                    errorMessage = "Error $code: $description"
                                    isProcessing = false
                                }
                            )
                        },
                        modifier = Modifier.fillMaxWidth().height(56.dp),
                        enabled = !isProcessing
                    ) {
                        if (isProcessing) {
                            CircularProgressIndicator(modifier = Modifier.size(24.dp), color = MaterialTheme.colorScheme.onPrimary)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Processing...")
                        } else {
                            Icon(Icons.Default.Lock, null)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Pay ₹${String.format("%.2f", amount)}", style = MaterialTheme.typography.titleMedium)
                        }
                    }

                    Spacer(modifier = Modifier.height(12.dp))
                    Text(
                        "Secured by Razorpay",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.outline,
                        textAlign = TextAlign.Center,
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            }
        }
    }
}

@Composable
private fun DetailRow(label: String, value: String) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(label, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(value, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Medium)
    }
}

@Composable
private fun PaymentMethodChip(label: String) {
    Surface(
        color = MaterialTheme.colorScheme.surfaceVariant,
        shape = MaterialTheme.shapes.small
    ) {
        Text(
            label,
            style = MaterialTheme.typography.labelSmall,
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp)
        )
    }
}

private fun startRazorpayCheckout(
    activity: Activity,
    amount: Double,
    razorpayKeyId: String,
    description: String,
    onSuccess: (String) -> Unit,
    onError: (Int, String) -> Unit
) {
    val checkout = Checkout()
    checkout.setKeyID(razorpayKeyId)

    try {
        val options = JSONObject().apply {
            put("name", "Wise Accounts")
            put("description", description)
            put("currency", "INR")
            put("amount", (amount * 100).toLong()) // Razorpay expects amount in paise
            put("prefill", JSONObject().apply {
                put("contact", "")
                put("email", "")
            })
            put("theme", JSONObject().apply {
                put("color", "#1565C0")
            })
        }

        checkout.open(activity, options)
    } catch (e: Exception) {
        onError(-1, e.message ?: "Failed to start payment")
    }
}

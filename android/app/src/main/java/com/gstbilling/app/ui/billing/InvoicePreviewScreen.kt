package com.gstbilling.app.ui.billing

import android.content.Intent
import android.graphics.Bitmap
import android.print.PrintAttributes
import android.print.PrintDocumentAdapter
import android.print.PrintManager
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.gstbilling.app.data.remote.api.ApiService
import com.gstbilling.app.util.AppResult
import com.gstbilling.app.util.SessionManager
import com.gstbilling.app.util.safeApiCall
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class InvoicePreviewViewModel @Inject constructor(
    private val apiService: ApiService,
    private val sessionManager: SessionManager
) : ViewModel() {

    var printHtml by mutableStateOf<String?>(null)
        private set
    var isLoading by mutableStateOf(false)
        private set
    var errorMessage by mutableStateOf<String?>(null)
        private set

    fun loadPrintHtml(invoiceId: String, documentType: String? = null) {
        viewModelScope.launch {
            isLoading = true
            val businessId = sessionManager.getBusinessId() ?: return@launch
            when (val result = safeApiCall {
                apiService.getInvoicePrintHtml(businessId.toString(), invoiceId.toString(), documentType)
            }) {
                is AppResult.Success -> {
                    printHtml = result.data?.body()?.data?.html
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
fun InvoicePreviewScreen(
    invoiceId: String,
    onBack: () -> Unit,
    onShare: () -> Unit,
    documentType: String? = null,
    viewModel: InvoicePreviewViewModel = hiltViewModel()
) {
    val context = LocalContext.current
    val html = viewModel.printHtml
    var webView by remember { mutableStateOf<WebView?>(null) }

    LaunchedEffect(invoiceId, documentType) {
        viewModel.loadPrintHtml(invoiceId, documentType)
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Invoice Preview") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    IconButton(onClick = {
                        webView?.let { wv ->
                            val printManager = context.getSystemService(PrintManager::class.java)
                            val printAdapter = wv.createPrintDocumentAdapter("Invoice")
                            printManager?.print("Invoice", printAdapter, PrintAttributes.Builder().build())
                        }
                    }) {
                        Icon(Icons.Default.Print, contentDescription = "Print")
                    }
                    IconButton(onClick = onShare) {
                        Icon(Icons.Default.Share, contentDescription = "Share")
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
            viewModel.errorMessage != null -> {
                Box(
                    modifier = Modifier.fillMaxSize().padding(padding),
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
                            viewModel.errorMessage ?: "Error",
                            style = MaterialTheme.typography.bodyLarge,
                            color = MaterialTheme.colorScheme.error
                        )
                        Spacer(modifier = Modifier.height(16.dp))
                        Button(onClick = { viewModel.loadPrintHtml(invoiceId) }) {
                            Text("Retry")
                        }
                    }
                }
            }
            html != null -> {
                Column(modifier = Modifier.fillMaxSize().padding(padding)) {
                    AndroidView(
                        factory = { ctx ->
                            WebView(ctx).apply {
                                webViewClient = WebViewClient()
                                settings.javaScriptEnabled = false
                                settings.loadWithOverviewMode = true
                                settings.useWideViewPort = true
                                loadDataWithBaseURL(null, html, "text/html", "UTF-8", null)
                                webView = this
                            }
                        },
                        modifier = Modifier
                            .fillMaxWidth()
                            .weight(1f)
                    )

                    Surface(
                        modifier = Modifier.fillMaxWidth(),
                        tonalElevation = 3.dp,
                        shadowElevation = 4.dp
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(16.dp),
                            horizontalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            OutlinedButton(
                                onClick = {
                                    webView?.let { wv ->
                                        val printManager = context.getSystemService(PrintManager::class.java)
                                        val printAdapter = wv.createPrintDocumentAdapter("Invoice")
                                        printManager?.print("Invoice", printAdapter, PrintAttributes.Builder().build())
                                    }
                                },
                                modifier = Modifier.weight(1f)
                            ) {
                                Icon(Icons.Default.Print, contentDescription = null)
                                Spacer(modifier = Modifier.width(8.dp))
                                Text("Print")
                            }

                            Button(
                                onClick = onShare,
                                modifier = Modifier.weight(1f)
                            ) {
                                Icon(Icons.Default.Share, contentDescription = null)
                                Spacer(modifier = Modifier.width(8.dp))
                                Text("Share")
                            }
                        }
                    }
                }
            }
            else -> {
                Box(
                    modifier = Modifier.fillMaxSize().padding(padding),
                    contentAlignment = Alignment.Center
                ) {
                    Text("No preview available")
                }
            }
        }
    }
}

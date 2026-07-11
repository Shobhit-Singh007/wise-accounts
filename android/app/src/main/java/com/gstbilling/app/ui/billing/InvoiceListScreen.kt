package com.gstbilling.app.ui.billing

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.gstbilling.app.data.local.entity.InvoiceEntity
import com.gstbilling.app.data.repository.InvoiceRepository
import com.gstbilling.app.util.AppResult
import com.gstbilling.app.util.SessionManager
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class InvoiceListViewModel @Inject constructor(
    private val invoiceRepository: InvoiceRepository,
    private val sessionManager: SessionManager
) : ViewModel() {

    var selectedStatus by mutableStateOf("all")
    var selectedDirection by mutableStateOf("SALE")
    var isRefreshing by mutableStateOf(false)
    private var businessId by mutableStateOf(0L)
    var invoices by mutableStateOf<List<InvoiceEntity>>(emptyList())
        private set

    init {
        viewModelScope.launch {
            businessId = sessionManager.getBusinessId() ?: 0L
            loadInvoices()
            if (businessId != 0L) {
                invoiceRepository.refreshInvoices(businessId, selectedDirection)
            }
        }
    }

    private fun loadInvoices() {
        val id = businessId
        if (id != 0L) {
            viewModelScope.launch {
                val flow = if (selectedStatus == "all") {
                    invoiceRepository.getInvoices(id)
                } else {
                    invoiceRepository.getInvoicesByStatus(id, selectedStatus)
                }
                flow.collect { invoices = it }
            }
        }
    }

    fun refresh() {
        viewModelScope.launch {
            isRefreshing = true
            val id = if (businessId == 0L) sessionManager.getBusinessId() ?: 0L else businessId
            businessId = id
            if (id != 0L) {
                invoiceRepository.refreshInvoices(id, selectedDirection)
            }
            isRefreshing = false
        }
    }

    fun setStatusFilter(status: String) {
        selectedStatus = status
        loadInvoices()
    }

    fun setDirectionFilter(direction: String) {
        selectedDirection = direction
        loadInvoices()
        refresh()
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun InvoiceListScreen(
    onBack: () -> Unit,
    onInvoiceClick: (Long) -> Unit,
    viewModel: InvoiceListViewModel = hiltViewModel()
) {
    val statuses = listOf("all", "draft", "unpaid", "paid", "cancelled")

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Invoices") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    IconButton(onClick = { viewModel.refresh() }) {
                        Icon(Icons.Default.Refresh, contentDescription = "Refresh")
                    }
                }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            // Status Filter Chips
            ScrollableTabRow(
                selectedTabIndex = statuses.indexOf(viewModel.selectedStatus),
                modifier = Modifier.fillMaxWidth(),
                edgePadding = 16.dp
            ) {
                statuses.forEach { status ->
                    Tab(
                        selected = viewModel.selectedStatus == status,
                        onClick = { viewModel.setStatusFilter(status) },
                        text = {
                            Text(
                                when (status) {
                                    "all" -> "All"
                                    "draft" -> "Draft"
                                    "unpaid" -> "Unpaid"
                                    "paid" -> "Paid"
                                    "cancelled" -> "Cancelled"
                                    else -> status
                                }
                            )
                        }
                    )
                }
            }

            val directions = listOf("SALE", "PURCHASE")
            TabRow(
                selectedTabIndex = directions.indexOf(viewModel.selectedDirection),
                modifier = Modifier.fillMaxWidth()
            ) {
                directions.forEach { direction ->
                    Tab(
                        selected = viewModel.selectedDirection == direction,
                        onClick = { viewModel.setDirectionFilter(direction) },
                        text = {
                            Text(
                                when (direction) {
                                    "SALE" -> "Sale Invoices"
                                    "PURCHASE" -> "Purchase Invoices"
                                    else -> direction
                                }
                            )
                        }
                    )
                }
            }

            if (viewModel.isRefreshing) {
                LinearProgressIndicator(modifier = Modifier.fillMaxWidth())
            }

            val invoiceList = viewModel.invoices
            if (invoiceList.isEmpty()) {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(
                            Icons.Default.ReceiptLong,
                            contentDescription = null,
                            modifier = Modifier.size(64.dp),
                            tint = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Spacer(modifier = Modifier.height(16.dp))
                        Text(
                            "No invoices found",
                            style = MaterialTheme.typography.bodyLarge,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            } else {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    items(invoiceList, key = { it.id }) { invoice ->
                        InvoiceListItem(
                            invoice = invoice,
                            onClick = { onInvoiceClick(invoice.id) }
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun InvoiceListItem(
    invoice: InvoiceEntity,
    onClick: () -> Unit
) {
    Card(onClick = onClick) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                Icons.Default.Receipt,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.primary,
                modifier = Modifier.size(40.dp)
            )
            Spacer(modifier = Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = invoice.invoiceNumber,
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = invoice.customerName ?: "Walk-in Customer",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Text(
                    text = invoice.invoiceDate,
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            Column(horizontalAlignment = Alignment.End) {
                Text(
                    text = "₹${String.format("%.0f", invoice.totalAmount)}",
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold
                )
                SuggestionChip(
                    onClick = {},
                    label = {
                        Text(
                            when (invoice.status) {
                                "paid" -> "Paid"
                                "unpaid" -> "Unpaid"
                                "draft" -> "Draft"
                                "cancelled" -> "Cancelled"
                                else -> invoice.status
                            },
                            style = MaterialTheme.typography.labelSmall
                        )
                    },
                    colors = SuggestionChipDefaults.suggestionChipColors(
                        containerColor = when (invoice.status) {
                            "paid" -> Color(0xFFE8F5E9)
                            "unpaid" -> Color(0xFFFFEBEE)
                            "cancelled" -> Color(0xFFF5F5F5)
                            else -> Color(0xFFFFF8E1)
                        }
                    )
                )
            }
        }
    }
}

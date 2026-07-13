package com.gstbilling.app.ui.reports

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
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
import com.gstbilling.app.data.remote.api.ApiService
import com.gstbilling.app.data.remote.api.BreakdownItem
import com.gstbilling.app.data.remote.api.ProfitLossReport
import com.gstbilling.app.util.AppResult
import com.gstbilling.app.util.SessionManager
import com.gstbilling.app.util.safeApiCall
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import java.util.*
import javax.inject.Inject

@HiltViewModel
class ProfitLossViewModel @Inject constructor(
    private val apiService: ApiService,
    private val sessionManager: SessionManager
) : ViewModel() {

    var profitLossReport by mutableStateOf<ProfitLossReport?>(null)
    var isLoading by mutableStateOf(false)
    var errorMessage by mutableStateOf<String?>(null)
    var startDate by mutableStateOf<String?>(null)
    var endDate by mutableStateOf<String?>(null)
    var showStartPicker by mutableStateOf(false)
    var showEndPicker by mutableStateOf(false)

    init {
        loadProfitLoss()
    }

    fun loadProfitLoss() {
        viewModelScope.launch {
            isLoading = true
            errorMessage = null
            val businessId = sessionManager.getBusinessId()
            if (businessId != null) {
                when (val result = safeApiCall {
                    apiService.getProfitLoss(businessId, from = startDate, to = endDate).body()?.data
                }) {
                    is AppResult.Success -> {
                        profitLossReport = result.data
                    }
                    is AppResult.Error -> {
                        errorMessage = result.message
                    }
                    is AppResult.Loading -> {}
                }
            }
            isLoading = false
        }
    }

    fun onStartDateSelected(year: Int, month: Int, day: Int) {
        startDate = String.format("%04d-%02d-%02d", year, month + 1, day)
        showStartPicker = false
        loadProfitLoss()
    }

    fun onEndDateSelected(year: Int, month: Int, day: Int) {
        endDate = String.format("%04d-%02d-%02d", year, month + 1, day)
        showEndPicker = false
        loadProfitLoss()
    }

    fun clearDateRange() {
        startDate = null
        endDate = null
        loadProfitLoss()
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProfitLossScreen(
    onBack: () -> Unit,
    viewModel: ProfitLossViewModel = hiltViewModel()
) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Profit & Loss") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    IconButton(onClick = { viewModel.loadProfitLoss() }) {
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
                .padding(horizontal = 16.dp)
        ) {
            DateRangeHeader(
                startDate = viewModel.startDate,
                endDate = viewModel.endDate,
                onStartClick = { viewModel.showStartPicker = true },
                onEndClick = { viewModel.showEndPicker = true },
                onClear = { viewModel.clearDateRange() }
            )

            if (viewModel.showStartPicker) {
                val datePickerState = rememberDatePickerState()
                DatePickerDialog(
                    onDismissRequest = { viewModel.showStartPicker = false },
                    confirmButton = {
                        TextButton(onClick = {
                            datePickerState.selectedDateMillis?.let { millis ->
                                val cal = Calendar.getInstance().apply { timeInMillis = millis }
                                viewModel.onStartDateSelected(
                                    cal.get(Calendar.YEAR),
                                    cal.get(Calendar.MONTH),
                                    cal.get(Calendar.DAY_OF_MONTH)
                                )
                            }
                        }) {
                            Text("OK")
                        }
                    },
                    dismissButton = {
                        TextButton(onClick = { viewModel.showStartPicker = false }) {
                            Text("Cancel")
                        }
                    }
                ) {
                    DatePicker(state = datePickerState)
                }
            }

            if (viewModel.showEndPicker) {
                val datePickerState = rememberDatePickerState()
                DatePickerDialog(
                    onDismissRequest = { viewModel.showEndPicker = false },
                    confirmButton = {
                        TextButton(onClick = {
                            datePickerState.selectedDateMillis?.let { millis ->
                                val cal = Calendar.getInstance().apply { timeInMillis = millis }
                                viewModel.onEndDateSelected(
                                    cal.get(Calendar.YEAR),
                                    cal.get(Calendar.MONTH),
                                    cal.get(Calendar.DAY_OF_MONTH)
                                )
                            }
                        }) {
                            Text("OK")
                        }
                    },
                    dismissButton = {
                        TextButton(onClick = { viewModel.showEndPicker = false }) {
                            Text("Cancel")
                        }
                    }
                ) {
                    DatePicker(state = datePickerState)
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

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
                            Spacer(modifier = Modifier.height(12.dp))
                            Text(
                                text = viewModel.errorMessage ?: "Error",
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.error
                            )
                            Spacer(modifier = Modifier.height(12.dp))
                            Button(onClick = { viewModel.loadProfitLoss() }) {
                                Text("Retry")
                            }
                        }
                    }
                }
                else -> {
                    val report = viewModel.profitLossReport
                    if (report == null) {
                        Box(
                            modifier = Modifier.fillMaxSize(),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = "No profit & loss data available",
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    } else {
                        val marginPercent = if (report.total_revenue > 0)
                            (report.net_profit / report.total_revenue * 100) else 0.0

                        LazyColumn(
                            verticalArrangement = Arrangement.spacedBy(12.dp),
                            contentPadding = PaddingValues(bottom = 16.dp)
                        ) {
                            item {
                                ProfitLossSummaryCards(
                                    totalRevenue = report.total_revenue,
                                    totalExpenses = report.total_expenses,
                                    grossProfit = report.gross_profit,
                                    netProfit = report.net_profit,
                                    marginPercent = marginPercent
                                )
                            }

                            item {
                                Text(
                                    text = "Revenue Breakdown",
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.Bold
                                )
                            }

                            val revenueItems = report.revenue_breakdown ?: emptyList()
                            if (revenueItems.isEmpty()) {
                                item {
                                    EmptyBreakdownCard("No revenue data")
                                }
                            } else {
                                items(revenueItems.size) { index ->
                                    BreakdownRow(
                                        item = revenueItems[index],
                                        color = Color(0xFF2E7D32)
                                    )
                                }
                            }

                            item {
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(
                                    text = "Expense Breakdown",
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.Bold
                                )
                            }

                            val expenseItems = report.expense_breakdown ?: emptyList()
                            if (expenseItems.isEmpty()) {
                                item {
                                    EmptyBreakdownCard("No expense data")
                                }
                            } else {
                                items(expenseItems.size) { index ->
                                    BreakdownRow(
                                        item = expenseItems[index],
                                        color = MaterialTheme.colorScheme.error
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun ProfitLossSummaryCards(
    totalRevenue: Double,
    totalExpenses: Double,
    grossProfit: Double,
    netProfit: Double,
    marginPercent: Double
) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            SummaryStatCard(
                title = "Revenue",
                value = "₹${String.format("%.2f", totalRevenue)}",
                icon = Icons.Default.TrendingUp,
                color = MaterialTheme.colorScheme.primary,
                modifier = Modifier.weight(1f)
            )
            SummaryStatCard(
                title = "Expenses",
                value = "₹${String.format("%.2f", totalExpenses)}",
                icon = Icons.Default.TrendingDown,
                color = MaterialTheme.colorScheme.error,
                modifier = Modifier.weight(1f)
            )
        }
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            SummaryStatCard(
                title = "Gross Profit",
                value = "₹${String.format("%.2f", grossProfit)}",
                icon = Icons.Default.AccountBalance,
                color = Color(0xFF2E7D32),
                modifier = Modifier.weight(1f)
            )
            SummaryStatCard(
                title = "Net Profit",
                value = "₹${String.format("%.2f", netProfit)}",
                icon = Icons.Default.Savings,
                color = if (netProfit >= 0) Color(0xFF2E7D32) else MaterialTheme.colorScheme.error,
                modifier = Modifier.weight(1f)
            )
        }
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(
                containerColor = MaterialTheme.colorScheme.surfaceVariant
            )
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Profit Margin",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = "${String.format("%.1f", marginPercent)}%",
                    style = MaterialTheme.typography.headlineSmall,
                    fontWeight = FontWeight.Bold,
                    color = if (marginPercent >= 0) Color(0xFF2E7D32) else MaterialTheme.colorScheme.error
                )
            }
        }
    }
}

@Composable
private fun SummaryStatCard(
    title: String,
    value: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    color: Color,
    modifier: Modifier = Modifier
) {
    Card(modifier = modifier) {
        Column(
            modifier = Modifier.padding(12.dp)
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = color,
                modifier = Modifier.size(24.dp)
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = value,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                color = color
            )
            Text(
                text = title,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

@Composable
private fun BreakdownRow(item: BreakdownItem, color: Color) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Text(
                text = item.label,
                style = MaterialTheme.typography.bodyMedium
            )
            Text(
                text = "₹${String.format("%.2f", item.amount)}",
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = FontWeight.Bold,
                color = color
            )
        }
    }
}

@Composable
private fun EmptyBreakdownCard(message: String) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
        )
    ) {
        Text(
            text = message,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.padding(16.dp)
        )
    }
}

package com.gstbilling.app.ui.reports

import androidx.compose.foundation.clickable
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
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.gstbilling.app.data.remote.api.*
import com.gstbilling.app.util.AppResult
import com.gstbilling.app.util.SessionManager
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class ReportsViewModel @Inject constructor(
    private val apiService: ApiService,
    private val sessionManager: SessionManager
) : ViewModel() {

    var salesReport by mutableStateOf<SalesReport?>(null)
    var gstr1Report by mutableStateOf<Gstr1Report?>(null)
    var gstr3bReport by mutableStateOf<Gstr3bReport?>(null)
    var profitLoss by mutableStateOf<ProfitLossReport?>(null)
    var isLoading by mutableStateOf(false)
    var selectedReport by mutableStateOf<String?>(null)
    var errorMessage by mutableStateOf<String?>(null)

    var selectedMonth by mutableStateOf(7)
    var selectedYear by mutableStateOf(2026)

    fun loadSalesReport() {
        viewModelScope.launch {
            isLoading = true
            errorMessage = null
            selectedReport = "sales"
            val businessId = sessionManager.getBusinessId()
            if (businessId != null) {
                try {
                    val response = apiService.getSalesReport(businessId)
                    if (response.isSuccessful) {
                        salesReport = response.body()?.data
                    } else {
                        errorMessage = response.errorBody()?.string() ?: "Failed to load sales report"
                    }
                } catch (e: Exception) {
                    errorMessage = e.message ?: "Network error"
                }
            }
            isLoading = false
        }
    }

    fun loadGstr1(month: Int = selectedMonth, year: Int = selectedYear) {
        viewModelScope.launch {
            isLoading = true
            errorMessage = null
            selectedReport = "gstr1"
            selectedMonth = month
            selectedYear = year
            val businessId = sessionManager.getBusinessId()
            if (businessId != null) {
                try {
                    val response = apiService.getGstr1Report(businessId, month = month, year = year)
                    if (response.isSuccessful) {
                        gstr1Report = response.body()?.data
                    } else {
                        errorMessage = response.errorBody()?.string() ?: "Failed to load GSTR-1"
                    }
                } catch (e: Exception) {
                    errorMessage = e.message ?: "Network error"
                }
            }
            isLoading = false
        }
    }

    fun loadGstr3b(month: Int = selectedMonth, year: Int = selectedYear) {
        viewModelScope.launch {
            isLoading = true
            errorMessage = null
            selectedReport = "gstr3b"
            selectedMonth = month
            selectedYear = year
            val businessId = sessionManager.getBusinessId()
            if (businessId != null) {
                try {
                    val response = apiService.getGstr3bReport(businessId, month = month, year = year)
                    if (response.isSuccessful) {
                        gstr3bReport = response.body()?.data
                    } else {
                        errorMessage = response.errorBody()?.string() ?: "Failed to load GSTR-3B"
                    }
                } catch (e: Exception) {
                    errorMessage = e.message ?: "Network error"
                }
            }
            isLoading = false
        }
    }

    fun loadProfitLoss() {
        viewModelScope.launch {
            isLoading = true
            errorMessage = null
            selectedReport = "pl"
            val businessId = sessionManager.getBusinessId()
            if (businessId != null) {
                try {
                    val response = apiService.getProfitLoss(businessId)
                    if (response.isSuccessful) {
                        profitLoss = response.body()?.data
                    } else {
                        errorMessage = response.errorBody()?.string() ?: "Failed to load profit & loss"
                    }
                } catch (e: Exception) {
                    errorMessage = e.message ?: "Network error"
                }
            }
            isLoading = false
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ReportsScreen(
    onBack: () -> Unit,
    viewModel: ReportsViewModel = hiltViewModel()
) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Reports") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        }
    ) { padding ->
        if (viewModel.isLoading) {
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator()
            }
        } else if (viewModel.selectedReport != null) {
            viewModel.selectedReport?.let { reportType ->
                ReportDetailView(
                    reportType = reportType,
                    viewModel = viewModel,
                    onBack = { viewModel.selectedReport = null }
                )
            }
        } else {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                item { Text("Select Report", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold) }
                item { Spacer(modifier = Modifier.height(8.dp)) }

                item {
                    ReportCard(
                        title = "Sales Report",
                        description = "Daily, monthly and yearly sales summary",
                        icon = Icons.Default.TrendingUp,
                        color = Color(0xFF1565C0),
                        onClick = { viewModel.loadSalesReport() }
                    )
                }
                item {
                    ReportCard(
                        title = "GSTR-1",
                        description = "Outward supply returns for GST",
                        icon = Icons.Default.Assignment,
                        color = Color(0xFF2E7D32),
                        onClick = { viewModel.loadGstr1() }
                    )
                }
                item {
                    ReportCard(
                        title = "GSTR-3B",
                        description = "Monthly summary return",
                        icon = Icons.Default.AssignmentTurnedIn,
                        color = Color(0xFFE65100),
                        onClick = { viewModel.loadGstr3b() }
                    )
                }
                item {
                    ReportCard(
                        title = "Customer Report",
                        description = "Customer-wise sales and outstanding",
                        icon = Icons.Default.People,
                        color = Color(0xFF6A1B9A),
                        onClick = { /* implement */ }
                    )
                }
                item {
                    ReportCard(
                        title = "Profit & Loss",
                        description = "Revenue, expenses and net profit",
                        icon = Icons.Default.AccountBalance,
                        color = Color(0xFFC62828),
                        onClick = { viewModel.loadProfitLoss() }
                    )
                }
            }
        }
    }
}

@Composable
fun ReportCard(
    title: String,
    description: String,
    icon: ImageVector,
    color: Color,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = color,
                modifier = Modifier.size(40.dp)
            )
            Spacer(modifier = Modifier.width(16.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = title,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = description,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            Icon(
                Icons.Default.ChevronRight,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MonthYearSelector(
    selectedMonth: Int,
    selectedYear: Int,
    onMonthYearChanged: (Int, Int) -> Unit
) {
    val months = listOf(
        1 to "January", 2 to "February", 3 to "March", 4 to "April",
        5 to "May", 6 to "June", 7 to "July", 8 to "August",
        9 to "September", 10 to "October", 11 to "November", 12 to "December"
    )
    val years = listOf(2024, 2025, 2026, 2027)

    var monthExpanded by remember { mutableStateOf(false) }
    var yearExpanded by remember { mutableStateOf(false) }

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(bottom = 12.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        ExposedDropdownMenuBox(
            expanded = monthExpanded,
            onExpandedChange = { monthExpanded = it },
            modifier = Modifier.weight(1f)
        ) {
            OutlinedTextField(
                value = months.firstOrNull { it.first == selectedMonth }?.second ?: "",
                onValueChange = {},
                readOnly = true,
                label = { Text("Month") },
                trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = monthExpanded) },
                modifier = Modifier.menuAnchor()
            )
            ExposedDropdownMenu(
                expanded = monthExpanded,
                onDismissRequest = { monthExpanded = false }
            ) {
                months.forEach { (value, label) ->
                    DropdownMenuItem(
                        text = { Text(label) },
                        onClick = {
                            onMonthYearChanged(value, selectedYear)
                            monthExpanded = false
                        }
                    )
                }
            }
        }

        ExposedDropdownMenuBox(
            expanded = yearExpanded,
            onExpandedChange = { yearExpanded = it },
            modifier = Modifier.weight(1f)
        ) {
            OutlinedTextField(
                value = selectedYear.toString(),
                onValueChange = {},
                readOnly = true,
                label = { Text("Year") },
                trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = yearExpanded) },
                modifier = Modifier.menuAnchor()
            )
            ExposedDropdownMenu(
                expanded = yearExpanded,
                onDismissRequest = { yearExpanded = false }
            ) {
                years.forEach { year ->
                    DropdownMenuItem(
                        text = { Text(year.toString()) },
                        onClick = {
                            onMonthYearChanged(selectedMonth, year)
                            yearExpanded = false
                        }
                    )
                }
            }
        }
    }
}

@Composable
fun ReportDetailView(
    reportType: String,
    viewModel: ReportsViewModel,
    onBack: () -> Unit
) {
    Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = onBack) {
                Icon(Icons.Default.ArrowBack, contentDescription = "Back")
            }
            Text(
                text = when (reportType) {
                    "sales" -> "Sales Report"
                    "gstr1" -> "GSTR-1 Report"
                    "gstr3b" -> "GSTR-3B Report"
                    "pl" -> "Profit & Loss"
                    else -> "Report"
                },
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold
            )
        }
        Spacer(modifier = Modifier.height(16.dp))

        when (reportType) {
            "sales" -> SalesReportDetail(viewModel.salesReport)
            "gstr1" -> {
                MonthYearSelector(
                    selectedMonth = viewModel.selectedMonth,
                    selectedYear = viewModel.selectedYear,
                    onMonthYearChanged = { month, year -> viewModel.loadGstr1(month, year) }
                )
                Gstr1ReportDetail(viewModel.gstr1Report)
            }
            "gstr3b" -> {
                MonthYearSelector(
                    selectedMonth = viewModel.selectedMonth,
                    selectedYear = viewModel.selectedYear,
                    onMonthYearChanged = { month, year -> viewModel.loadGstr3b(month, year) }
                )
                Gstr3bReportDetail(viewModel.gstr3bReport)
            }
            "pl" -> ProfitLossDetail(viewModel.profitLoss)
        }
    }
}

@Composable
fun SalesReportDetail(report: SalesReport?) {
    if (report == null) {
        EmptyReportPlaceholder()
        return
    }
    LazyColumn(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item {
            ReportSummaryCard(
                title = "Sales Summary",
                items = listOf(
                    "Total Sales" to "₹${String.format("%.2f", report.summary.totalSales)}",
                    "Total Tax" to "₹${String.format("%.2f", report.summary.totalTax)}",
                    "Total Invoices" to report.summary.totalInvoices.toString(),
                    "Average Invoice" to "₹${String.format("%.2f", report.summary.averageInvoice)}"
                )
            )
        }
        if (report.categorySales.isNotEmpty()) {
            item {
                Text("Category Sales", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
            }
            items(report.categorySales) { category ->
                Card(modifier = Modifier.fillMaxWidth()) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(12.dp),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text(category.name, style = MaterialTheme.typography.bodyMedium)
                        Text(
                            "₹${String.format("%.2f", category.total)}",
                            style = MaterialTheme.typography.bodyMedium,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun Gstr1ReportDetail(report: Gstr1Report?) {
    if (report == null) {
        EmptyReportPlaceholder()
        return
    }
    LazyColumn(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item {
            Text(
                text = "Period: ${report.fromDate} to ${report.toDate}",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
        item {
            ReportSummaryCard(
                title = "GSTR-1 Summary",
                items = listOf(
                    "Total Invoices" to report.summary.totalInvoices.toString(),
                    "Total Taxable Value" to "₹${String.format("%.2f", report.summary.totalTaxableValue)}",
                    "Total Tax" to "₹${String.format("%.2f", report.summary.totalTax)}"
                )
            )
        }
        if (report.b2b.isNotEmpty()) {
            item {
                Text("B2B Invoices", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
            }
            items(report.b2b) { entry ->
                Card(modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.padding(12.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text(entry.invoiceNo, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Bold)
                            Text(
                                "₹${String.format("%.2f", entry.grandTotal)}",
                                style = MaterialTheme.typography.bodyMedium,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.primary
                            )
                        }
                        if (entry.customerName != null) {
                            Text(entry.customerName, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                        if (entry.customerGstin != null) {
                            Text("GSTIN: ${entry.customerGstin}", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.tertiary)
                        }
                    }
                }
            }
        }
        item {
            ReportSummaryCard(
                title = "B2C Summary",
                items = listOf(
                    "Count" to report.b2c.count.toString(),
                    "Total Taxable Value" to "₹${String.format("%.2f", report.b2c.totalTaxableValue)}",
                    "Total Tax" to "₹${String.format("%.2f", report.b2c.totalTax)}"
                )
            )
        }
    }
}

@Composable
fun Gstr3bReportDetail(report: Gstr3bReport?) {
    if (report == null) {
        EmptyReportPlaceholder()
        return
    }
    val monthName = listOf(
        "", "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ).getOrElse(report.month) { report.month.toString() }

    LazyColumn(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item {
            Text(
                text = "Period: $monthName ${report.year}",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
        item {
            ReportSummaryCard(
                title = "GSTR-3B Summary",
                items = listOf(
                    "Total Invoices" to report.summary.totalInvoices.toString(),
                    "Total Taxable Value" to "₹${String.format("%.2f", report.summary.totalTaxableValue)}",
                    "Total Tax" to "₹${String.format("%.2f", report.summary.totalTax)}",
                    "Total Paid" to "₹${String.format("%.2f", report.summary.totalPaid)}",
                    "Outstanding" to "₹${String.format("%.2f", report.summary.outstanding)}"
                )
            )
        }
    }
}

@Composable
fun ProfitLossDetail(report: ProfitLossReport?) {
    if (report == null) {
        EmptyReportPlaceholder()
        return
    }
    LazyColumn(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item {
            ReportSummaryCard(
                title = "Profit & Loss",
                items = listOf(
                    "Total Revenue" to "₹${String.format("%.2f", report.total_revenue)}",
                    "Total Expenses" to "₹${String.format("%.2f", report.total_expenses)}",
                    "Gross Profit" to "₹${String.format("%.2f", report.gross_profit)}",
                    "Net Profit" to "₹${String.format("%.2f", report.net_profit)}"
                )
            )
        }
        report.revenue_breakdown?.let { items ->
            if (items.isNotEmpty()) {
                item {
                    Text("Revenue Breakdown", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                }
                items(items) { item ->
                    Card(modifier = Modifier.fillMaxWidth()) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(12.dp),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text(item.label, style = MaterialTheme.typography.bodyMedium)
                            Text(
                                "₹${String.format("%.2f", item.amount)}",
                                style = MaterialTheme.typography.bodyMedium,
                                fontWeight = FontWeight.Bold,
                                color = Color(0xFF4CAF50)
                            )
                        }
                    }
                }
            }
        }
        report.expense_breakdown?.let { items ->
            if (items.isNotEmpty()) {
                item {
                    Text("Expense Breakdown", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                }
                items(items) { item ->
                    Card(modifier = Modifier.fillMaxWidth()) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(12.dp),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text(item.label, style = MaterialTheme.typography.bodyMedium)
                            Text(
                                "₹${String.format("%.2f", item.amount)}",
                                style = MaterialTheme.typography.bodyMedium,
                                fontWeight = FontWeight.Bold,
                                color = Color(0xFFF44336)
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun ReportSummaryCard(title: String, items: List<Pair<String, String>>) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant
        )
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(
                text = title,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold
            )
            Spacer(modifier = Modifier.height(12.dp))
            items.forEach { (label, value) ->
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 4.dp),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(
                        text = label,
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Text(
                        text = value,
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        }
    }
}

@Composable
fun EmptyReportPlaceholder() {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant
        )
    ) {
        Column(
            modifier = Modifier.padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Icon(
                Icons.Default.BarChart,
                contentDescription = null,
                modifier = Modifier.size(64.dp),
                tint = MaterialTheme.colorScheme.primary
            )
            Spacer(modifier = Modifier.height(16.dp))
            Text(
                text = "Report Preview",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = "Connect to the API to view live data.\nThis report will display charts and tables.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

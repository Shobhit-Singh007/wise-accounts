package com.gstbilling.app.ui.reports

import android.content.Context
import android.content.Intent
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.horizontalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.FileProvider
import androidx.hilt.navigation.compose.hiltViewModel
import com.gstbilling.app.ui.dataimport.ExportUtils
import java.io.File
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
    var outstandingReport by mutableStateOf<List<CustomerReport>>(emptyList())
    var isLoading by mutableStateOf(false)
    var selectedReport by mutableStateOf<String?>(null)
    var errorMessage by mutableStateOf<String?>(null)

    var selectedMonth by mutableStateOf(7)
    var selectedYear by mutableStateOf(2026)

    var gstr1StartDate by mutableStateOf("2026-07-01")
    var gstr1EndDate by mutableStateOf("2026-07-31")

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

    fun loadGstr1(
        month: Int = selectedMonth,
        year: Int = selectedYear,
        fromDate: String = gstr1StartDate,
        toDate: String = gstr1EndDate
    ) {
        viewModelScope.launch {
            isLoading = true
            errorMessage = null
            selectedReport = "gstr1"
            selectedMonth = month
            selectedYear = year
            gstr1StartDate = fromDate
            gstr1EndDate = toDate
            val businessId = sessionManager.getBusinessId()
            if (businessId != null) {
                try {
                    val response = apiService.getGstr1Report(
                        businessId,
                        fromDate = fromDate,
                        toDate = toDate
                    )
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

    fun loadOutstanding() {
        viewModelScope.launch {
            isLoading = true; errorMessage = null; selectedReport = "outstanding"
            val id = sessionManager.getBusinessId()
            if (id != null) {
                try {
                    val response = apiService.getCustomerReport(id)
                    if (response.isSuccessful) outstandingReport = response.body()?.data ?: emptyList()
                    else errorMessage = response.errorBody()?.string()
                } catch (e: Exception) { errorMessage = e.message }
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
    onCustomerReport: () -> Unit = {},
    onProductReport: () -> Unit = {},
    onProfitLoss: () -> Unit = {},
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
                        title = "Profit & Loss",
                        description = "View profit and loss summary",
                        icon = Icons.Default.TrendingDown,
                        color = Color(0xFF6A1B9A),
                        onClick = { viewModel.loadProfitLoss() }
                    )
                }
                item {
                    ReportCard(
                        title = "Outstanding",
                        description = "Customers with outstanding balance",
                        icon = Icons.Default.Person,
                        color = Color(0xFFD84315),
                        onClick = { viewModel.loadOutstanding() }
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
                        onClick = onCustomerReport
                    )
                }
                item {
                    ReportCard(
                        title = "Profit & Loss",
                        description = "Revenue, expenses and net profit",
                        icon = Icons.Default.AccountBalance,
                        color = Color(0xFFC62828),
                        onClick = onProfitLoss
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
fun DateRangeSelector(
    startDate: String,
    endDate: String,
    onStartChanged: (String) -> Unit,
    onEndChanged: (String) -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(bottom = 12.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        OutlinedTextField(
            value = startDate,
            onValueChange = onStartChanged,
            label = { Text("From Date") },
            placeholder = { Text("YYYY-MM-DD") },
            modifier = Modifier.weight(1f),
            singleLine = true
        )
        OutlinedTextField(
            value = endDate,
            onValueChange = onEndChanged,
            label = { Text("To Date") },
            placeholder = { Text("YYYY-MM-DD") },
            modifier = Modifier.weight(1f),
            singleLine = true
        )
    }
}

@Composable
private fun buildReportData(reportType: String, vm: ReportsViewModel): Pair<List<String>, List<List<String>>> {
    val headers: List<String>
    val rows: List<List<String>>
    when (reportType) {
        "sales" -> {
            val s = vm.salesReport?.summary
            headers = listOf("Metric", "Value")
            rows = listOf(
                listOf("Total Sales", s?.totalSales?.toString() ?: "0"),
                listOf("Total GST", s?.totalTax?.toString() ?: "0"),
                listOf("Invoice Count", s?.totalInvoices?.toString() ?: "0"),
                listOf("Average Invoice", s?.averageInvoice?.toString() ?: "0"),
            )
        }
        "gstr1" -> {
            val r = vm.gstr1Report
            headers = listOf("Section", "Count", "Taxable Value", "Tax")
            rows = (r?.b2b?.map { listOf("B2B", "1", (it.taxableValue ?: 0.0).toString(), (it.taxAmount ?: 0.0).toString()) } ?: emptyList())
        }
        "gstr3b" -> {
            val s = vm.gstr3bReport?.summary
            headers = listOf("Metric", "Value")
            rows = listOf(
                listOf("Total Invoices", s?.totalInvoices?.toString() ?: "0"),
                listOf("Total Taxable Value", s?.totalTaxableValue?.toString() ?: "0"),
                listOf("Total Tax", s?.totalTax?.toString() ?: "0"),
                listOf("Total Paid", s?.totalPaid?.toString() ?: "0"),
                listOf("Outstanding", s?.outstanding?.toString() ?: "0"),
            )
        }
        "pl" -> {
            val p = vm.profitLoss
            headers = listOf("Metric", "Value")
            rows = listOf(
                listOf("Revenue", p?.total_revenue?.toString() ?: "0"),
                listOf("Expenses", p?.total_expenses?.toString() ?: "0"),
                listOf("Net Profit", p?.net_profit?.toString() ?: "0"),
            )
        }
        "outstanding" -> {
            val r = vm.outstandingReport
            headers = listOf("Customer", "Phone", "Outstanding")
            rows = r.map { listOf(it.customerName, it.phone ?: "", it.outstanding.toString()) }
        }
        else -> { headers = emptyList(); rows = emptyList() }
    }
    return headers to rows
}

private fun shareReport(context: Context, filename: String, headers: List<String>, rows: List<List<String>>) {
    val csv = ExportUtils.buildCsv(headers, rows)
    val file = File(context.cacheDir, filename)
    file.writeText(csv)
    val uri = FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", file)
    val intent = Intent(Intent.ACTION_SEND).apply {
        type = "text/csv"
        putExtra(Intent.EXTRA_STREAM, uri)
        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
    }
    context.startActivity(Intent.createChooser(intent, "Export Report"))
}

@Composable
fun ReportDetailView(
    reportType: String,
    viewModel: ReportsViewModel,
    onBack: () -> Unit
) {
    val context = LocalContext.current
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
                    "outstanding" -> "Outstanding"
                    else -> "Report"
                },
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.weight(1f)
            )
            IconButton(onClick = {
                val hdrs = listOf("Metric", "Value")
                val rws = listOf(
                    listOf("Total Sales", viewModel.salesReport?.summary?.totalSales?.toString() ?: "0"),
                    listOf("Total GST", viewModel.salesReport?.summary?.totalTax?.toString() ?: "0"),
                    listOf("Invoice Count", viewModel.salesReport?.summary?.totalInvoices?.toString() ?: "0"),
                    listOf("Average Invoice", viewModel.salesReport?.summary?.averageInvoice?.toString() ?: "0"),
                )
                if (rws.isNotEmpty()) shareReport(context, "${reportType}_report.csv", hdrs, rws)
            }) {
                Icon(Icons.Default.Share, contentDescription = "Export CSV")
            }
        }
        Spacer(modifier = Modifier.height(16.dp))

        when (reportType) {
            "sales" -> SalesReportDetail(viewModel.salesReport)
            "gstr1" -> {
                DateRangeSelector(
                    startDate = viewModel.gstr1StartDate,
                    endDate = viewModel.gstr1EndDate,
                    onStartChanged = { viewModel.gstr1StartDate = it },
                    onEndChanged = { viewModel.gstr1EndDate = it }
                )
                MonthYearSelector(
                    selectedMonth = viewModel.selectedMonth,
                    selectedYear = viewModel.selectedYear,
                    onMonthYearChanged = { month, year ->
                        viewModel.loadGstr1(month, year, viewModel.gstr1StartDate, viewModel.gstr1EndDate)
                    }
                )
                OutlinedButton(
                    onClick = {
                        viewModel.loadGstr1(
                            viewModel.selectedMonth,
                            viewModel.selectedYear,
                            viewModel.gstr1StartDate,
                            viewModel.gstr1EndDate
                        )
                    },
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Icon(Icons.Default.Refresh, contentDescription = null)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Refresh Data")
                }
                Spacer(modifier = Modifier.height(8.dp))
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
            "outstanding" -> OutstandingDetail(viewModel.outstandingReport)
        }
    }
}

@Composable
fun OutstandingDetail(report: List<CustomerReport>) {
    Column(modifier = Modifier.fillMaxWidth()) {
        Text("Outstanding Customers", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
        Spacer(modifier = Modifier.height(8.dp))
        if (report.isEmpty()) { Text("No outstanding customers", color = MaterialTheme.colorScheme.outline); return }
        report.forEach { c ->
            Card(modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp)) {
                Row(modifier = Modifier.padding(12.dp).fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Column(modifier = Modifier.weight(1f)) { Text(c.customerName, fontWeight = FontWeight.Bold); Text(c.phone ?: "", style = MaterialTheme.typography.bodySmall) }
                    Text("\u20B9${String.format("%.2f", c.outstanding)}", fontWeight = FontWeight.Bold, color = if (c.outstanding > 0) Color.Red else Color(0xFF2E7D32))
                }
            }
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
        report.summary?.let { summary ->
            item {
                ReportSummaryCard(
                    title = "GSTR-1 Summary",
                    items = listOf(
                        "Total Invoices" to summary.totalInvoices.toString(),
                        "Total Taxable Value" to "₹${String.format("%.2f", summary.totalTaxableValue)}",
                        "Total Tax" to "₹${String.format("%.2f", summary.totalTax)}"
                    )
                )
            }
        }

        // Table 4: B2B Invoices
        if (!report.b2b.isNullOrEmpty()) {
            item {
                SectionHeader("Table 4: B2B Invoices")
            }
            items(report.b2b) { entry ->
                Card(modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.padding(12.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text(
                                entry.invoiceNo,
                                style = MaterialTheme.typography.bodyMedium,
                                fontWeight = FontWeight.Bold
                            )
                            Text(
                                "₹${String.format("%.2f", if (entry.invoiceValue != 0.0) entry.invoiceValue else entry.grandTotal)}",
                                style = MaterialTheme.typography.bodyMedium,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.primary
                            )
                        }
                        Spacer(modifier = Modifier.height(4.dp))
                        if (entry.customerGstin != null) {
                            Text(
                                "GSTIN: ${entry.customerGstin}",
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.tertiary
                            )
                        }
                        if (entry.customerName != null) {
                            Text(
                                entry.customerName,
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                        Spacer(modifier = Modifier.height(4.dp))
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Text(
                                "Date: ${entry.date}",
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                            if (entry.placeOfSupply != null) {
                                Text(
                                    "POS: ${entry.placeOfSupply}",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                            if (entry.reverseCharge) {
                                AssistChip(
                                    onClick = {},
                                    label = { Text("RC", style = MaterialTheme.typography.labelSmall) },
                                    colors = AssistChipDefaults.assistChipColors(
                                        containerColor = MaterialTheme.colorScheme.errorContainer
                                    ),
                                    border = null
                                )
                            }
                        }
                        Spacer(modifier = Modifier.height(4.dp))
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            TaxChip("Taxable", entry.taxableValue)
                            TaxChip("CGST", entry.cgst)
                            TaxChip("SGST", entry.sgst)
                            TaxChip("IGST", entry.igst)
                        }
                    }
                }
            }
        }

        // Table 5: B2C Large
        if (report.b2cLarge.isNotEmpty()) {
            item {
                SectionHeader("Table 5: B2C Large")
            }
            items(report.b2cLarge) { entry ->
                B2cRowCard(entry.placeOfSupply, entry.rate, entry.taxableValue, entry.cgst, entry.sgst, entry.igst)
            }
        }

        // Table 6: B2C Small
        if (report.b2cSmall.isNotEmpty()) {
            item {
                SectionHeader("Table 6: B2C Small")
            }
            items(report.b2cSmall) { entry ->
                B2cRowCard(entry.placeOfSupply, entry.rate, entry.taxableValue, entry.cgst, entry.sgst, entry.igst)
            }
        }

        // B2C Summary (fallback if detailed data not available)
        report.b2c?.let { b2c ->
            item {
                ReportSummaryCard(
                    title = "B2C Summary",
                    items = listOf(
                        "Count" to b2c.count.toString(),
                        "Total Taxable Value" to "₹${String.format("%.2f", b2c.totalTaxableValue)}",
                        "Total Tax" to "₹${String.format("%.2f", b2c.totalTax)}"
                    )
                )
            }
        }

        // Table 7: HSN Summary
        if (report.hsnSummary.isNotEmpty()) {
            item {
                SectionHeader("Table 7: HSN Summary")
            }
            items(report.hsnSummary) { entry ->
                Card(modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.padding(12.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text(
                                entry.hsnCode,
                                style = MaterialTheme.typography.bodyMedium,
                                fontWeight = FontWeight.Bold
                            )
                            Text(
                                entry.uqc,
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                        Text(
                            entry.description,
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Text("Qty: ${entry.quantity}", style = MaterialTheme.typography.labelSmall)
                            Text(
                                "Total: ₹${String.format("%.2f", entry.totalValue)}",
                                style = MaterialTheme.typography.labelSmall
                            )
                        }
                        Spacer(modifier = Modifier.height(4.dp))
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            TaxChip("Taxable", entry.taxableValue)
                            TaxChip("CGST", entry.cgst)
                            TaxChip("SGST", entry.sgst)
                            TaxChip("IGST", entry.igst)
                        }
                    }
                }
            }
        }

        // Table 8: Documents
        report.documents?.let { docs ->
            item {
                SectionHeader("Table 8: Documents")
            }
            item {
                Card(modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.padding(12.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Column {
                                Text(
                                    "Invoices Issued",
                                    style = MaterialTheme.typography.bodyMedium,
                                    fontWeight = FontWeight.Bold
                                )
                                Text(
                                    "Count: ${docs.invoicesIssued.count}",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                                Text(
                                    "Value: ₹${String.format("%.2f", docs.invoicesIssued.totalValue)}",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.primary,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                            Column(horizontalAlignment = Alignment.End) {
                                Text(
                                    "Credit Notes",
                                    style = MaterialTheme.typography.bodyMedium,
                                    fontWeight = FontWeight.Bold
                                )
                                Text(
                                    "Count: ${docs.creditNotes.count}",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                                Text(
                                    "Value: ₹${String.format("%.2f", docs.creditNotes.totalValue)}",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.error,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                        }
                    }
                }
            }
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

        // Table 3.1: Outward Supplies
        if (report.outwardSupplies.isNotEmpty()) {
            item {
                SectionHeader("Table 3.1: Outward Supplies")
            }
            item {
                Gstr3bLabeledTable(
                    headers = listOf("Label", "Taxable", "IGST", "CGST", "SGST"),
                    rows = report.outwardSupplies.filter { it.taxableValue > 0 || it.igst > 0 || it.cgst > 0 }
                )
            }
        }

        // Table 3.2: Inter-state Supplies
        if (report.interStateSupplies.isNotEmpty()) {
            item {
                SectionHeader("Table 3.2: Inter-state Supplies")
            }
            items(report.interStateSupplies) { entry ->
                Card(modifier = Modifier.fillMaxWidth()) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(12.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text(
                                entry.placeOfSupply,
                                style = MaterialTheme.typography.bodyMedium,
                                fontWeight = FontWeight.Bold
                            )
                            Text(
                                "Taxable: ₹${String.format("%.2f", entry.taxableValue)}",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                        Text(
                            "IGST: ₹${String.format("%.2f", entry.igst)}",
                            style = MaterialTheme.typography.bodyMedium,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.primary
                        )
                    }
                }
            }
        }

        // Table 4: Eligible ITC
        if (report.eligibleItc.isNotEmpty()) {
            item {
                SectionHeader("Table 4: Eligible ITC")
            }
            item {
                Gstr3bItcTable(
                    headers = listOf("Label", "IGST", "CGST", "SGST", "Cess"),
                    rows = report.eligibleItc
                )
            }
        }

        // Table 5: Exempt, Nil & Non-GST
        if (report.exemptNilNonGst.isNotEmpty()) {
            item {
                SectionHeader("Table 5: Exempt, Nil & Non-GST")
            }
            item {
                Gstr3bLabeledTable(
                    headers = listOf("Label", "Taxable", "IGST", "CGST", "SGST"),
                    rows = report.exemptNilNonGst.map { Gstr3bLabeledSupply(it.label, it.taxableValue, it.igst, it.cgst, it.sgst, it.cess) }
                )
            }
        }

        // Table 6: Payment of Tax
        if (report.paymentOfTax.isNotEmpty()) {
            item {
                SectionHeader("Table 6: Payment of Tax")
            }
            item {
                Gstr3bPaymentTable(rows = report.paymentOfTax)
            }
        }
    }
}

@Composable
fun Gstr3bLabeledTable(
    headers: List<String>,
    rows: List<Gstr3bLabeledSupply>
) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(12.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                headers.forEach { header ->
                    Text(
                        header,
                        style = MaterialTheme.typography.labelMedium,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.weight(1f)
                    )
                }
            }
            HorizontalDivider(modifier = Modifier.padding(vertical = 4.dp))
            rows.forEach { row ->
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 4.dp),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(
                        row.label,
                        style = MaterialTheme.typography.bodySmall,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.weight(1f)
                    )
                    Text(
                        "₹${String.format("%.2f", row.taxableValue)}",
                        style = MaterialTheme.typography.bodySmall,
                        modifier = Modifier.weight(1f)
                    )
                    Text(
                        "₹${String.format("%.2f", row.igst)}",
                        style = MaterialTheme.typography.bodySmall,
                        modifier = Modifier.weight(1f)
                    )
                    Text(
                        "₹${String.format("%.2f", row.cgst)}",
                        style = MaterialTheme.typography.bodySmall,
                        modifier = Modifier.weight(1f)
                    )
                    Text(
                        "₹${String.format("%.2f", row.sgst)}",
                        style = MaterialTheme.typography.bodySmall,
                        modifier = Modifier.weight(1f)
                    )
                }
            }
            if (rows.isEmpty()) {
                Text(
                    "No data available",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(vertical = 8.dp)
                )
            }
        }
    }
}

@Composable
fun Gstr3bItcTable(
    headers: List<String>,
    rows: List<Gstr3bLabeledItc>
) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(12.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                headers.forEach { header ->
                    Text(
                        header,
                        style = MaterialTheme.typography.labelMedium,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.weight(1f)
                    )
                }
            }
            HorizontalDivider(modifier = Modifier.padding(vertical = 4.dp))
            rows.forEach { row ->
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 4.dp),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(
                        row.label,
                        style = MaterialTheme.typography.bodySmall,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.weight(1f)
                    )
                    Text(
                        "₹${String.format("%.2f", row.igst)}",
                        style = MaterialTheme.typography.bodySmall,
                        modifier = Modifier.weight(1f)
                    )
                    Text(
                        "₹${String.format("%.2f", row.cgst)}",
                        style = MaterialTheme.typography.bodySmall,
                        modifier = Modifier.weight(1f)
                    )
                    Text(
                        "₹${String.format("%.2f", row.sgst)}",
                        style = MaterialTheme.typography.bodySmall,
                        modifier = Modifier.weight(1f)
                    )
                    Text(
                        "₹${String.format("%.2f", row.cess)}",
                        style = MaterialTheme.typography.bodySmall,
                        modifier = Modifier.weight(1f)
                    )
                }
            }
            if (rows.isEmpty()) {
                Text(
                    "No data available",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(vertical = 8.dp)
                )
            }
        }
    }
}

@Composable
fun Gstr3bPaymentTable(rows: List<Gstr3bPaymentRow>) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(12.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                listOf("Label", "CGST", "SGST", "IGST", "Cess", "Interest", "Late Fee", "Total").forEach { header ->
                    Text(
                        header,
                        style = MaterialTheme.typography.labelMedium,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.weight(1f)
                    )
                }
            }
            HorizontalDivider(modifier = Modifier.padding(vertical = 4.dp))
            rows.forEach { row ->
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 4.dp),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(row.label, style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
                    Text("₹${String.format("%.2f", row.cgst)}", style = MaterialTheme.typography.bodySmall, modifier = Modifier.weight(1f))
                    Text("₹${String.format("%.2f", row.sgst)}", style = MaterialTheme.typography.bodySmall, modifier = Modifier.weight(1f))
                    Text("₹${String.format("%.2f", row.igst)}", style = MaterialTheme.typography.bodySmall, modifier = Modifier.weight(1f))
                    Text("₹${String.format("%.2f", row.cess)}", style = MaterialTheme.typography.bodySmall, modifier = Modifier.weight(1f))
                    Text("₹${String.format("%.2f", row.interest)}", style = MaterialTheme.typography.bodySmall, modifier = Modifier.weight(1f))
                    Text("₹${String.format("%.2f", row.lateFee)}", style = MaterialTheme.typography.bodySmall, modifier = Modifier.weight(1f))
                    Text(
                        "₹${String.format("%.2f", row.total)}",
                        style = MaterialTheme.typography.bodySmall,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.weight(1f)
                    )
                }
            }
            if (rows.isEmpty()) {
                Text(
                    "No data available",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(vertical = 8.dp)
                )
            }
        }
    }
}

@Composable
fun PaymentRow(label: String, payable: Double, paid: Double, isTotal: Boolean = false) {
    val balance = payable - paid
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 3.dp),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(
            label,
            style = if (isTotal) MaterialTheme.typography.bodyMedium else MaterialTheme.typography.bodySmall,
            fontWeight = if (isTotal) FontWeight.Bold else FontWeight.Normal,
            modifier = Modifier.weight(1f)
        )
        Text(
            "₹${String.format("%.2f", payable)}",
            style = if (isTotal) MaterialTheme.typography.bodyMedium else MaterialTheme.typography.bodySmall,
            fontWeight = if (isTotal) FontWeight.Bold else FontWeight.Normal,
            modifier = Modifier.weight(1f)
        )
        Text(
            "₹${String.format("%.2f", paid)}",
            style = if (isTotal) MaterialTheme.typography.bodyMedium else MaterialTheme.typography.bodySmall,
            fontWeight = if (isTotal) FontWeight.Bold else FontWeight.Normal,
            modifier = Modifier.weight(1f)
        )
        Text(
            "₹${String.format("%.2f", balance)}",
            style = if (isTotal) MaterialTheme.typography.bodyMedium else MaterialTheme.typography.bodySmall,
            fontWeight = if (isTotal) FontWeight.Bold else FontWeight.Normal,
            color = if (balance > 0) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.primary,
            modifier = Modifier.weight(1f)
        )
    }
}

@Composable
fun B2cRowCard(
    placeOfSupply: String,
    rate: Double,
    taxableValue: Double,
    cgst: Double,
    sgst: Double,
    igst: Double
) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(12.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(
                    placeOfSupply,
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    "Rate: ${rate}%",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            Spacer(modifier = Modifier.height(4.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                TaxChip("Taxable", taxableValue)
                TaxChip("CGST", cgst)
                TaxChip("SGST", sgst)
                TaxChip("IGST", igst)
            }
        }
    }
}

@Composable
fun SectionHeader(title: String) {
    Text(
        text = title,
        style = MaterialTheme.typography.titleMedium,
        fontWeight = FontWeight.Bold,
        color = MaterialTheme.colorScheme.primary,
        modifier = Modifier.padding(vertical = 4.dp)
    )
}

@Composable
fun TaxChip(label: String, value: Double) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(
            label,
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            fontSize = 10.sp
        )
        Text(
            "₹${String.format("%.2f", value)}",
            style = MaterialTheme.typography.labelSmall,
            fontWeight = FontWeight.Bold,
            fontSize = 10.sp
        )
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

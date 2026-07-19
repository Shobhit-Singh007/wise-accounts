package com.gstbilling.app.ui.dataimport

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.AnimatedContent
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.gstbilling.app.data.remote.api.*
import com.gstbilling.app.data.remote.api.ImportApi
import com.gstbilling.app.util.SessionManager
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.apache.poi.ss.usermodel.WorkbookFactory
import org.apache.poi.ss.usermodel.Workbook
import java.io.ByteArrayInputStream
import javax.inject.Inject

enum class ImportType(val label: String, val description: String, val source: String) {
    CUSTOMERS("Customers", "Import customer contacts and details", "Khatabook"),
    PRODUCTS("Products", "Import product catalog with prices", "Khatabook / GoGST"),
    INVOICES("Invoices", "Import past invoices and billing history", "GoGST")
}

enum class ImportStep {
    SELECT_TYPE, PICK_FILE, IMPORTING
}

data class ColumnMapping(
    val sourceColumn: String,
    val targetField: String
)

@HiltViewModel
class DataImportViewModel @Inject constructor(
    private val importApi: ImportApi,
    private val sessionManager: SessionManager
) : ViewModel() {

    var currentStep by mutableStateOf(ImportStep.SELECT_TYPE)
    var selectedType by mutableStateOf<ImportType?>(null)
    var isLoading by mutableStateOf(false)
    var errorMessage by mutableStateOf<String?>(null)

    var parsedData by mutableStateOf<ParseCsvResponse?>(null)
    var columnMappings by mutableStateOf<List<ColumnMapping>>(emptyList())
    var csvContent by mutableStateOf<String?>(null)
    var fileName by mutableStateOf<String?>(null)

    var importResult by mutableStateOf<ImportResult?>(null)

    fun getTargetFields(type: ImportType): List<String> {
        return when (type) {
            ImportType.CUSTOMERS -> listOf("name", "phone", "email", "gstin", "address", "city", "state", "pincode", "openingBalance", "creditLimit")
            ImportType.PRODUCTS -> listOf("name", "sku", "hsnCode", "unit", "sellingPrice", "purchasePrice", "gstRate", "stock", "lowStockAlert")
            ImportType.INVOICES -> listOf("invoiceNumber", "customerName", "customerPhone", "customerGstin", "customerAddress", "customerState", "invoiceDate", "dueDate", "subtotal", "taxableValue", "discount", "totalQuantity", "cgst", "sgst", "igst", "cgstRate", "sgstRate", "igstRate", "cessTotal", "cessRate", "cessAmount", "taxAmount", "totalTax", "totalAmount", "grandTotal", "status", "placeOfSupply", "reverseCharge", "poNo", "challanNo", "lrNo", "paymentType", "totalInWords", "ewayBillNo", "ewayBillDate", "transporterId", "transporterName", "vehicleNo", "distanceKm", "supplyType", "docType", "irn", "irnDate", "ackNo", "ackDate", "notes")
        }
    }

    fun selectType(type: ImportType) {
        selectedType = type
        currentStep = ImportStep.PICK_FILE
        parsedData = null
        importResult = null
        errorMessage = null
        columnMappings = emptyList()
    }

    fun parseCsv(content: String, name: String) {
        viewModelScope.launch {
            isLoading = true
            errorMessage = null
            csvContent = content
            fileName = name

            try {
                val businessId = sessionManager.getBusinessId() ?: run {
                    errorMessage = "No business ID found. Please login again."
                    isLoading = false
                    return@launch
                }

                val request = ParseCsvRequest(
                    csvContent = content,
                    fileType = selectedType?.name?.lowercase() ?: "csv"
                )

                withContext(Dispatchers.IO) {
                    val response = importApi.parseCsv(businessId, request)
                    if (response.isSuccessful) {
                        val body = response.body()?.data
                        if (body != null) {
                            parsedData = body
                            val targetFields = getTargetFields(selectedType!!)
                            columnMappings = body.suggestedMapping.map { (source, target) ->
                                ColumnMapping(source, target)
                            }
                            currentStep = ImportStep.IMPORTING
                        } else {
                            errorMessage = response.body()?.message ?: "Failed to parse CSV"
                        }
                    } else {
                        errorMessage = "Server error: ${response.code()} ${response.message()}"
                    }
                }
            } catch (e: Exception) {
                errorMessage = "Error parsing file: ${e.localizedMessage}"
            } finally {
                isLoading = false
            }
        }
    }

    fun parseCsvLocally(content: String, name: String) {
        fileName = name
        csvContent = content
        val lines = content.lines().filter { it.isNotBlank() }
        if (lines.size < 2) {
            errorMessage = "File must have a header row and at least one data row"
            return
        }

        val headers = lines[0].split(",").map { it.trim().trim('"') }
        val targetFields = getTargetFields(selectedType!!)

        val autoMapping = mutableMapOf<String, String>()
        for (header in headers) {
            val lower = header.lowercase().replace(" ", "").replace("_", "")
            val matched = targetFields.find { target ->
                target.lowercase().replace("_", "") == lower ||
                        lower.contains(target.lowercase().replace("_", "")) ||
                        target.lowercase().replace("_", "").contains(lower)
            }
            if (matched != null) {
                autoMapping[header] = matched
            }
        }

        val rows = lines.drop(1).mapIndexed { index, line ->
            val values = parseCsvLine(line)
            val data = headers.zip(values).toMap()
            ParsedRow(index = index, data = data)
        }

        parsedData = ParseCsvResponse(
            fileName = name,
            totalRows = rows.size,
            headers = headers,
            suggestedMapping = autoMapping,
            rows = rows
        )

        columnMappings = headers.map { header ->
            ColumnMapping(header, autoMapping[header] ?: "")
        }

        currentStep = ImportStep.IMPORTING
    }

    private fun parseCsvLine(line: String): List<String> {
        val result = mutableListOf<String>()
        var current = StringBuilder()
        var inQuotes = false

        for (char in line) {
            when {
                char == '"' -> inQuotes = !inQuotes
                char == ',' && !inQuotes -> {
                    result.add(current.toString().trim())
                    current = StringBuilder()
                }
                else -> current.append(char)
            }
        }
        result.add(current.toString().trim())
        return result
    }

    fun updateMapping(index: Int, targetField: String) {
        columnMappings = columnMappings.toMutableList().apply {
            this[index] = this[index].copy(targetField = targetField)
        }
    }

    fun importData() {
        val data = parsedData ?: return
        val mapping = columnMappings.filter { it.targetField.isNotBlank() }
        if (mapping.isEmpty()) {
            errorMessage = "Please map at least one column"
            return
        }

        viewModelScope.launch {
            isLoading = true
            errorMessage = null

            try {
                val businessId = sessionManager.getBusinessId() ?: run {
                    errorMessage = "No business ID found"
                    isLoading = false
                    return@launch
                }

                val mappedData = data.rows.map { row ->
                    val mapped = mutableMapOf<String, Any>()
                    for (m in mapping) {
                        val value = row.data[m.sourceColumn] ?: ""
                        if (value.isNotBlank()) {
                            mapped[m.targetField] = value
                        }
                    }
                    mapped
                }

                val request = ImportRequest(records = mappedData)

                withContext(Dispatchers.IO) {
                    val response = when (selectedType) {
                        ImportType.CUSTOMERS -> importApi.importCustomers(businessId, request)
                        ImportType.PRODUCTS -> importApi.importProducts(businessId, request)
                        ImportType.INVOICES -> importApi.importInvoices(businessId, request)
                        null -> throw IllegalStateException("No type selected")
                    }

                    if (response.isSuccessful) {
                        importResult = response.body()?.data
                    } else {
                        errorMessage = "Import failed: ${response.code()} ${response.message()}"
                    }
                }
            } catch (e: Exception) {
                errorMessage = "Import error: ${e.localizedMessage}"
            } finally {
                isLoading = false
            }
        }
    }

    fun parseXlsxLocally(bytes: ByteArray, name: String) {
        fileName = name
        try {
            val workbook: Workbook = WorkbookFactory.create(ByteArrayInputStream(bytes))
            val sheet = workbook.getSheetAt(0)
            if (sheet.physicalNumberOfRows < 1) {
                errorMessage = "Excel file is empty"
                workbook.close()
                return
            }

            val headerRow = sheet.getRow(0)
            val headers = mutableListOf<String>()
            for (cell in headerRow) {
                headers.add(cell.stringCellValue.trim())
            }
            val targetFields = getTargetFields(selectedType!!)

            val autoMapping = mutableMapOf<String, String>()
            for (header in headers) {
                val lower = header.lowercase().replace(" ", "").replace("_", "")
                val matched = targetFields.find { target ->
                    target.lowercase().replace("_", "") == lower ||
                            lower.contains(target.lowercase().replace("_", "")) ||
                            target.lowercase().replace("_", "").contains(lower)
                }
                if (matched != null) {
                    autoMapping[header] = matched
                }
            }

            val rows = mutableListOf<ParsedRow>()
            for (i in 1..sheet.lastRowNum) {
                val row = sheet.getRow(i) ?: continue
                val data = mutableMapOf<String, String>()
                for (j in headers.indices) {
                    val cell = row.getCell(j)
                    data[headers[j]] = when {
                        cell == null -> ""
                        else -> {
                            val v = when (cell.cellType) {
                                org.apache.poi.ss.usermodel.CellType.NUMERIC -> {
                                    val dv = cell.numericCellValue
                                    if (dv == dv.toLong().toDouble()) dv.toLong().toString() else dv.toString()
                                }
                                org.apache.poi.ss.usermodel.CellType.BOOLEAN -> cell.booleanCellValue.toString()
                                org.apache.poi.ss.usermodel.CellType.FORMULA -> {
                                    try { cell.stringCellValue } catch (_: Exception) { cell.numericCellValue.toString() }
                                }
                                else -> cell.stringCellValue
                            }
                            v.trim()
                        }
                    }
                }
                rows.add(ParsedRow(index = i - 1, data = data))
            }
            workbook.close()

            parsedData = ParseCsvResponse(
                fileName = name,
                totalRows = rows.size,
                headers = headers,
                suggestedMapping = autoMapping,
                rows = rows
            )

            columnMappings = headers.map { header ->
                ColumnMapping(header, autoMapping[header] ?: "")
            }

            currentStep = ImportStep.IMPORTING
        } catch (e: Exception) {
            errorMessage = "Failed to parse Excel file: ${e.localizedMessage}"
        }
    }

    fun reset() {
        currentStep = ImportStep.SELECT_TYPE
        selectedType = null
        parsedData = null
        importResult = null
        errorMessage = null
        columnMappings = emptyList()
        csvContent = null
        fileName = null
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DataImportScreen(
    viewModel: DataImportViewModel = hiltViewModel(),
    onBack: () -> Unit
) {
    val context = LocalContext.current

    val filePickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode == Activity.RESULT_OK) {
            result.data?.data?.let { uri ->
                try {
                    val cursor = context.contentResolver.query(uri, null, null, null, null)
                    val name = cursor?.use {
                        val nameIndex = it.getColumnIndex(android.provider.OpenableColumns.DISPLAY_NAME)
                        it.moveToFirst()
                        it.getString(nameIndex)
                    } ?: "import.csv"
                    cursor?.close()

                    if (name.endsWith(".csv", ignoreCase = true)) {
                        val inputStream = context.contentResolver.openInputStream(uri)
                        val content = inputStream?.bufferedReader()?.use { it.readText() }
                        if (content != null) {
                            viewModel.parseCsvLocally(content, name)
                        }
                        inputStream?.close()
                    } else if (name.endsWith(".xlsx", ignoreCase = true) || name.endsWith(".xls", ignoreCase = true)) {
                        val inputStream = context.contentResolver.openInputStream(uri)
                        val bytes = inputStream?.readBytes()
                        inputStream?.close()
                        if (bytes != null) {
                            viewModel.parseXlsxLocally(bytes, name)
                        } else {
                            viewModel.errorMessage = "Failed to read Excel file"
                        }
                    } else {
                        viewModel.errorMessage = "Please select a CSV or Excel (.xlsx/.xls) file"
                    }
                } catch (e: Exception) {
                    viewModel.errorMessage = "Failed to read file: ${e.localizedMessage}"
                }
            }
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Data Import") },
                navigationIcon = {
                    IconButton(onClick = if (viewModel.currentStep == ImportStep.SELECT_TYPE) onBack else {
                        { viewModel.currentStep = ImportStep.PICK_FILE }
                    }) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    if (viewModel.currentStep != ImportStep.SELECT_TYPE) {
                        TextButton(onClick = { viewModel.reset() }) {
                            Text("Start Over")
                        }
                    }
                }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp)
        ) {
            StepIndicator(currentStep = viewModel.currentStep)

            Spacer(modifier = Modifier.height(16.dp))

            AnimatedContent(targetState = viewModel.currentStep) { step ->
                when (step) {
                    ImportStep.SELECT_TYPE -> SelectTypeContent(
                        onSelectType = { viewModel.selectType(it) }
                    )
                    ImportStep.PICK_FILE -> PickFileContent(
                        selectedType = viewModel.selectedType!!,
                        isLoading = viewModel.isLoading,
                        errorMessage = viewModel.errorMessage,
                        onPickFile = {
                            val intent = Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
                                addCategory(Intent.CATEGORY_OPENABLE)
                                type = "*/*"
                                putExtra(Intent.EXTRA_MIME_TYPES, arrayOf(
                                    "text/csv",
                                    "text/comma-separated-values",
                                    "text/plain",
                                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                                    "application/vnd.ms-excel"
                                ))
                            }
                            filePickerLauncher.launch(intent)
                        },
                        onParseCsv = { content, name -> viewModel.parseCsv(content, name) }
                    )
                    ImportStep.IMPORTING -> ImportingContent(
                        selectedType = viewModel.selectedType!!,
                        parsedData = viewModel.parsedData,
                        columnMappings = viewModel.columnMappings,
                        importResult = viewModel.importResult,
                        isLoading = viewModel.isLoading,
                        errorMessage = viewModel.errorMessage,
                        onMappingChange = { index, field -> viewModel.updateMapping(index, field) },
                        onImport = { viewModel.importData() },
                        targetFields = viewModel.getTargetFields(viewModel.selectedType!!),
                        onStartOver = { viewModel.reset() }
                    )
                }
            }
        }
    }
}

@Composable
private fun StepIndicator(currentStep: ImportStep) {
    val steps = listOf(
        "Select Type" to (currentStep.ordinal >= 0),
        "Pick File" to (currentStep.ordinal >= 1),
        "Import" to (currentStep.ordinal >= 2)
    )

    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        steps.forEachIndexed { index, (label, completed) ->
            Row(
                verticalAlignment = Alignment.CenterVertically
            ) {
                Surface(
                    shape = MaterialTheme.shapes.small,
                    color = when {
                        completed && currentStep.ordinal > index -> MaterialTheme.colorScheme.primary
                        currentStep.ordinal == index -> MaterialTheme.colorScheme.primary
                        else -> MaterialTheme.colorScheme.surfaceVariant
                    },
                    modifier = Modifier.size(28.dp)
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        if (completed && currentStep.ordinal > index) {
                            Icon(
                                Icons.Default.Check,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.onPrimary,
                                modifier = Modifier.size(16.dp)
                            )
                        } else {
                            Text(
                                text = "${index + 1}",
                                style = MaterialTheme.typography.labelSmall,
                                color = if (currentStep.ordinal >= index)
                                    MaterialTheme.colorScheme.onPrimary
                                else
                                    MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                }
                Spacer(modifier = Modifier.width(4.dp))
                Text(
                    text = label,
                    style = MaterialTheme.typography.labelSmall,
                    color = if (currentStep.ordinal >= index)
                        MaterialTheme.colorScheme.onSurface
                    else
                        MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
    }
}

@Composable
private fun SelectTypeContent(
    onSelectType: (ImportType) -> Unit
) {
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text(
            "Select Import Type",
            style = MaterialTheme.typography.headlineSmall,
            fontWeight = FontWeight.Bold
        )

        Text(
            "Choose the type of data you want to import from Khatabook, GoGST, or other billing software.",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )

        Spacer(modifier = Modifier.height(8.dp))

        ImportType.entries.forEach { type ->
            Card(
                onClick = { onSelectType(type) },
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f)
                )
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = when (type) {
                            ImportType.CUSTOMERS -> Icons.Default.People
                            ImportType.PRODUCTS -> Icons.Default.Inventory2
                            ImportType.INVOICES -> Icons.Default.Receipt
                        },
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.size(32.dp)
                    )
                    Spacer(modifier = Modifier.width(16.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = type.label,
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = type.description,
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Text(
                            text = "Source: ${type.source}",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.primary
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

        Spacer(modifier = Modifier.height(16.dp))

        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(
                containerColor = MaterialTheme.colorScheme.tertiaryContainer.copy(alpha = 0.5f)
            )
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(12.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    Icons.Default.Info,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.tertiary,
                    modifier = Modifier.size(20.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = "Export your data as CSV from Khatabook or GoGST, then import here.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onTertiaryContainer
                )
            }
        }
    }
}

@Composable
private fun PickFileContent(
    selectedType: ImportType,
    isLoading: Boolean,
    errorMessage: String?,
    onPickFile: () -> Unit,
    onParseCsv: (String, String) -> Unit
) {
    var directInput by remember { mutableStateOf("") }

    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
        Text(
            "Import ${selectedType.label}",
            style = MaterialTheme.typography.headlineSmall,
            fontWeight = FontWeight.Bold
        )

        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(
                containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f)
            )
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Icon(
                    Icons.Default.UploadFile,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.size(48.dp)
                )
                Text(
                    "Select a CSV file from your device",
                    style = MaterialTheme.typography.bodyMedium
                )
                Button(onClick = onPickFile) {
                    Icon(Icons.Default.FolderOpen, contentDescription = null)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Browse Files")
                }
            }
        }

        HorizontalDivider()

        Text(
            "Or paste CSV data directly:",
            style = MaterialTheme.typography.titleSmall,
            fontWeight = FontWeight.Bold
        )

        OutlinedTextField(
            value = directInput,
            onValueChange = { directInput = it },
            modifier = Modifier
                .fillMaxWidth()
                .height(150.dp),
            placeholder = {
                Text("name,phone,email\nABC Corp,9876543210,abc@email.com")
            },
            maxLines = 10
        )

        Button(
            onClick = {
                if (directInput.isNotBlank()) {
                    onParseCsv(directInput, "pasted_data.csv")
                }
            },
            modifier = Modifier.fillMaxWidth(),
            enabled = directInput.isNotBlank() && !isLoading
        ) {
            if (isLoading) {
                CircularProgressIndicator(
                    modifier = Modifier.size(18.dp),
                    strokeWidth = 2.dp,
                    color = MaterialTheme.colorScheme.onPrimary
                )
                Spacer(modifier = Modifier.width(8.dp))
            }
            Text("Parse & Continue")
        }

        if (errorMessage != null) {
            Card(
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.errorContainer
                )
            ) {
                Row(
                    modifier = Modifier.padding(12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        Icons.Default.Error,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.error
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        errorMessage,
                        color = MaterialTheme.colorScheme.onErrorContainer,
                        style = MaterialTheme.typography.bodySmall
                    )
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ImportingContent(
    selectedType: ImportType,
    parsedData: ParseCsvResponse?,
    columnMappings: List<ColumnMapping>,
    importResult: ImportResult?,
    isLoading: Boolean,
    errorMessage: String?,
    onMappingChange: (Int, String) -> Unit,
    onImport: () -> Unit,
    targetFields: List<String>,
    onStartOver: () -> Unit
) {
    if (importResult != null) {
        ImportResultContent(
            result = importResult,
            selectedType = selectedType,
            onStartOver = onStartOver
        )
        return
    }

    if (parsedData == null) return

    LazyColumn(
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            Text(
                "Map Columns",
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.Bold
            )
        }

        item {
            Card(
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f)
                )
            ) {
                Column(modifier = Modifier.padding(12.dp)) {
                    Text(
                        "File: ${parsedData.fileName}",
                        style = MaterialTheme.typography.labelMedium
                    )
                    Text(
                        "${parsedData.totalRows} rows detected with ${parsedData.headers.size} columns",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }

        item {
            Text(
                "Column Mapping",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold
            )
            Text(
                "Map each CSV column to a ${selectedType.label.lowercase()} field",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }

        itemsIndexed(columnMappings) { index, mapping ->
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.surface
                )
            ) {
                Column(modifier = Modifier.padding(12.dp)) {
                    Text(
                        "CSV Column: ${mapping.sourceColumn}",
                        style = MaterialTheme.typography.labelMedium,
                        fontWeight = FontWeight.Bold
                    )

                    val sampleValues = parsedData.rows.take(3).mapNotNull { it.data[mapping.sourceColumn] }.filter { it.isNotBlank() }
                    if (sampleValues.isNotEmpty()) {
                        Text(
                            "Sample: ${sampleValues.take(3).joinToString(", ")}",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    var expanded by remember { mutableStateOf(false) }
                    ExposedDropdownMenuBox(
                        expanded = expanded,
                        onExpandedChange = { expanded = !expanded }
                    ) {
                        OutlinedTextField(
                            value = mapping.targetField.ifBlank { "Skip" },
                            onValueChange = {},
                            readOnly = true,
                            label = { Text("Map to field") },
                            modifier = Modifier
                                .fillMaxWidth()
                                .menuAnchor(),
                            trailingIcon = {
                                ExposedDropdownMenuDefaults.TrailingIcon(expanded = expanded)
                            }
                        )
                        ExposedDropdownMenu(
                            expanded = expanded,
                            onDismissRequest = { expanded = false }
                        ) {
                            DropdownMenuItem(
                                text = { Text("Skip (do not import)") },
                                onClick = {
                                    onMappingChange(index, "")
                                    expanded = false
                                }
                            )
                            targetFields.forEach { field ->
                                DropdownMenuItem(
                                    text = { Text(field) },
                                    onClick = {
                                        onMappingChange(index, field)
                                        expanded = false
                                    }
                                )
                            }
                        }
                    }
                }
            }
        }

        item {
            val mappedCount = columnMappings.count { it.targetField.isNotBlank() }
            val previewRows = parsedData.rows.take(3)

            if (mappedCount > 0 && previewRows.isNotEmpty()) {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f)
                    )
                ) {
                    Column(modifier = Modifier.padding(12.dp)) {
                        Text(
                            "Preview (first 3 rows, $mappedCount mapped columns)",
                            style = MaterialTheme.typography.labelMedium,
                            fontWeight = FontWeight.Bold
                        )
                        Spacer(modifier = Modifier.height(8.dp))

                        val mappedFields = columnMappings.filter { it.targetField.isNotBlank() }
                        mappedFields.forEach { mapping ->
                            Text(
                                "${mapping.targetField}: ${previewRows.joinToString(", ") { it.data[mapping.sourceColumn] ?: "" }}",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                        }
                    }
                }
            }
        }

        item {
            if (errorMessage != null) {
                Card(
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.errorContainer
                    )
                ) {
                    Row(
                        modifier = Modifier.padding(12.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            Icons.Default.Error,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.error
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            errorMessage,
                            color = MaterialTheme.colorScheme.onErrorContainer,
                            style = MaterialTheme.typography.bodySmall
                        )
                    }
                }
            }

            Button(
                onClick = onImport,
                modifier = Modifier.fillMaxWidth(),
                enabled = !isLoading && columnMappings.any { it.targetField.isNotBlank() }
            ) {
                if (isLoading) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(18.dp),
                        strokeWidth = 2.dp,
                        color = MaterialTheme.colorScheme.onPrimary
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                }
                Icon(Icons.Default.CloudDownload, contentDescription = null)
                Spacer(modifier = Modifier.width(8.dp))
                Text("Import ${parsedData.totalRows} Rows")
            }

            Spacer(modifier = Modifier.height(32.dp))
        }
    }
}

@Composable
private fun ImportResultContent(
    result: ImportResult,
    selectedType: ImportType,
    onStartOver: () -> Unit
) {
    Column(
        modifier = Modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Spacer(modifier = Modifier.height(16.dp))

        Icon(
            if (result.errors.isEmpty()) Icons.Default.CheckCircle else Icons.Default.Warning,
            contentDescription = null,
            tint = if (result.errors.isEmpty()) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.error,
            modifier = Modifier.size(64.dp)
        )

        Text(
            if (result.errors.isEmpty()) "Import Complete" else "Import Completed with Errors",
            style = MaterialTheme.typography.headlineSmall,
            fontWeight = FontWeight.Bold
        )

        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(
                containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f)
            )
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                ResultStat("Total Rows", result.totalRows.toString())
                HorizontalDivider()
                ResultStat("Imported", result.imported.toString(), MaterialTheme.colorScheme.primary)
                if (result.skipped > 0) {
                    ResultStat("Skipped", result.skipped.toString(), MaterialTheme.colorScheme.tertiary)
                }
                if (result.errors.isNotEmpty()) {
                    ResultStat("Errors", result.errors.size.toString(), MaterialTheme.colorScheme.error)
                }
            }
        }

        if (result.errors.isNotEmpty()) {
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.errorContainer.copy(alpha = 0.3f)
                )
            ) {
                Column(
                    modifier = Modifier.padding(12.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Text(
                        "Errors:",
                        style = MaterialTheme.typography.labelMedium,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.error
                    )
                    result.errors.take(10).forEach { error ->
                        Text(
                            "Row ${error.row}: ${error.message}",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onErrorContainer
                        )
                    }
                    if (result.errors.size > 10) {
                        Text(
                            "...and ${result.errors.size - 10} more errors",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }
        }

        if (result.warnings.isNotEmpty()) {
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.tertiaryContainer.copy(alpha = 0.3f)
                )
            ) {
                Column(
                    modifier = Modifier.padding(12.dp),
                    verticalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    Text(
                        "Warnings:",
                        style = MaterialTheme.typography.labelMedium,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.tertiary
                    )
                    result.warnings.take(5).forEach { warning ->
                        Text(
                            warning,
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onTertiaryContainer
                        )
                    }
                }
            }
        }

        Button(
            onClick = onStartOver,
            modifier = Modifier.fillMaxWidth()
        ) {
            Text("Import Another File")
        }

        Spacer(modifier = Modifier.height(32.dp))
    }
}

@Composable
private fun ResultStat(label: String, value: String, color: androidx.compose.ui.graphics.Color = MaterialTheme.colorScheme.onSurface) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(label, style = MaterialTheme.typography.bodyMedium)
        Text(
            value,
            style = MaterialTheme.typography.bodyMedium,
            fontWeight = FontWeight.Bold,
            color = color
        )
    }
}

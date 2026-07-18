package com.gstbilling.app.ui.settings

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Save
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PrintSettingsScreen(
    onBack: () -> Unit,
    viewModel: SubSettingsViewModel = hiltViewModel()
) {
    val copyOptions = listOf("1", "2", "3")
    val paperSizeOptions = listOf("A4", "A5", "Thermal 80mm", "Thermal 58mm")
    var copiesDropdownExpanded by remember { mutableStateOf(false) }
    var paperSizeDropdownExpanded by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        viewModel.clearMessages()
        viewModel.loadPrintSettings()
    }

    LaunchedEffect(viewModel.saveSuccess) {
        if (viewModel.saveSuccess) {
            kotlinx.coroutines.delay(2000)
            viewModel.clearMessages()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Print Settings") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    IconButton(onClick = { viewModel.savePrintSettings() }) {
                        Icon(Icons.Default.Save, contentDescription = "Save")
                    }
                }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier.fillMaxSize().padding(padding).verticalScroll(rememberScrollState()).padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            if (viewModel.isLoading && !viewModel.saveSuccess) {
                CircularProgressIndicator(modifier = Modifier.fillMaxWidth().wrapContentWidth())
            }

            Card(modifier = Modifier.fillMaxWidth(), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f))) {
                Column(modifier = Modifier.fillMaxWidth().padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Printer", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) { Text("Bluetooth Printer Enabled", style = MaterialTheme.typography.bodyLarge); Switch(checked = viewModel.bluetoothEnabled, onCheckedChange = { viewModel.onBluetoothEnabledChange(it) }) }
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) { Text("Auto Print after Invoice", style = MaterialTheme.typography.bodyLarge); Switch(checked = viewModel.autoPrint, onCheckedChange = { viewModel.onAutoPrintChange(it) }) }
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) { Text("Print Logo on Receipt", style = MaterialTheme.typography.bodyLarge); Switch(checked = viewModel.printLogo, onCheckedChange = { viewModel.onPrintLogoChange(it) }) }
                }
            }

            Card(modifier = Modifier.fillMaxWidth(), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f))) {
                Column(modifier = Modifier.fillMaxWidth().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text("Print Options", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
                    ExposedDropdownMenuBox(expanded = copiesDropdownExpanded, onExpandedChange = { copiesDropdownExpanded = !copiesDropdownExpanded }) {
                        OutlinedTextField(value = viewModel.printCopies, onValueChange = {}, label = { Text("Print Copies") }, modifier = Modifier.fillMaxWidth().menuAnchor(), readOnly = true, trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = copiesDropdownExpanded) })
                        ExposedDropdownMenu(expanded = copiesDropdownExpanded, onDismissRequest = { copiesDropdownExpanded = false }) {
                            copyOptions.forEach { copy ->
                                DropdownMenuItem(text = { Text(copy) }, onClick = { viewModel.onPrintCopiesChange(copy); copiesDropdownExpanded = false })
                            }
                        }
                    }
                    ExposedDropdownMenuBox(expanded = paperSizeDropdownExpanded, onExpandedChange = { paperSizeDropdownExpanded = !paperSizeDropdownExpanded }) {
                        OutlinedTextField(value = viewModel.paperSize, onValueChange = {}, label = { Text("Paper Size") }, modifier = Modifier.fillMaxWidth().menuAnchor(), readOnly = true, trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = paperSizeDropdownExpanded) })
                        ExposedDropdownMenu(expanded = paperSizeDropdownExpanded, onDismissRequest = { paperSizeDropdownExpanded = false }) {
                            paperSizeOptions.forEach { size ->
                                DropdownMenuItem(text = { Text(size) }, onClick = { viewModel.onPaperSizeChange(size); paperSizeDropdownExpanded = false })
                            }
                        }
                    }
                }
            }

            viewModel.errorMessage?.let { error ->
                Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.errorContainer)) {
                    Text(text = error, color = MaterialTheme.colorScheme.onErrorContainer, modifier = Modifier.padding(16.dp))
                }
            }

            if (viewModel.saveSuccess) {
                Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer)) {
                    Text("Print settings saved successfully", color = MaterialTheme.colorScheme.onPrimaryContainer, modifier = Modifier.padding(16.dp))
                }
            }

            Button(onClick = { viewModel.savePrintSettings() }, modifier = Modifier.fillMaxWidth(), colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)) {
                Icon(Icons.Default.Save, contentDescription = null)
                Spacer(modifier = Modifier.width(8.dp))
                Text("Save Print Settings")
            }
            Spacer(modifier = Modifier.height(16.dp))
        }
    }
}

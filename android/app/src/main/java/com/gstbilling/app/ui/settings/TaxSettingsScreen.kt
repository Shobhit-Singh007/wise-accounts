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
fun TaxSettingsScreen(
    onBack: () -> Unit,
    viewModel: SubSettingsViewModel = hiltViewModel()
) {
    val gstRates = listOf("0%", "5%", "12%", "18%", "28%")
    val taxDisplayOptions = listOf("Exclusive", "Inclusive", "Both")
    var gstRateDropdownExpanded by remember { mutableStateOf(false) }
    var taxDisplayDropdownExpanded by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        viewModel.clearMessages()
        viewModel.loadTaxSettings()
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
                title = { Text("Tax Settings") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    IconButton(onClick = { viewModel.saveTaxSettings() }) {
                        Icon(Icons.Default.Save, contentDescription = "Save")
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
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            if (viewModel.isLoading && !viewModel.saveSuccess) {
                CircularProgressIndicator(modifier = Modifier.fillMaxWidth().wrapContentWidth())
            }

            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f)
                )
            ) {
                Column(
                    modifier = Modifier.fillMaxWidth().padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Text("GST Configuration", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
                    ExposedDropdownMenuBox(expanded = gstRateDropdownExpanded, onExpandedChange = { gstRateDropdownExpanded = !gstRateDropdownExpanded }) {
                        OutlinedTextField(value = viewModel.defaultGstRate, onValueChange = {}, label = { Text("Default GST Rate") }, modifier = Modifier.fillMaxWidth().menuAnchor(), readOnly = true, trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = gstRateDropdownExpanded) })
                        ExposedDropdownMenu(expanded = gstRateDropdownExpanded, onDismissRequest = { gstRateDropdownExpanded = false }) {
                            gstRates.forEach { rate ->
                                DropdownMenuItem(text = { Text(rate) }, onClick = { viewModel.onDefaultGstRateChange(rate); gstRateDropdownExpanded = false })
                            }
                        }
                    }
                }
            }

            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f))
            ) {
                Column(modifier = Modifier.fillMaxWidth().padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Tax Components", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) { Text("CGST Enabled", style = MaterialTheme.typography.bodyLarge); Switch(checked = viewModel.cgstEnabled, onCheckedChange = { viewModel.onCgstEnabledChange(it) }) }
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) { Text("SGST Enabled", style = MaterialTheme.typography.bodyLarge); Switch(checked = viewModel.sgstEnabled, onCheckedChange = { viewModel.onSgstEnabledChange(it) }) }
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) { Text("IGST Enabled", style = MaterialTheme.typography.bodyLarge); Switch(checked = viewModel.igstEnabled, onCheckedChange = { viewModel.onIgstEnabledChange(it) }) }
                }
            }

            Card(modifier = Modifier.fillMaxWidth(), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f))) {
                Column(modifier = Modifier.fillMaxWidth().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text("Display & Codes", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
                    ExposedDropdownMenuBox(expanded = taxDisplayDropdownExpanded, onExpandedChange = { taxDisplayDropdownExpanded = !taxDisplayDropdownExpanded }) {
                        OutlinedTextField(value = viewModel.taxDisplay, onValueChange = {}, label = { Text("Tax Display") }, modifier = Modifier.fillMaxWidth().menuAnchor(), readOnly = true, trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = taxDisplayDropdownExpanded) })
                        ExposedDropdownMenu(expanded = taxDisplayDropdownExpanded, onDismissRequest = { taxDisplayDropdownExpanded = false }) {
                            taxDisplayOptions.forEach { option ->
                                DropdownMenuItem(text = { Text(option) }, onClick = { viewModel.onTaxDisplayChange(option); taxDisplayDropdownExpanded = false })
                            }
                        }
                    }
                    OutlinedTextField(value = viewModel.hsnCode, onValueChange = { viewModel.onHsnCodeChange(it) }, label = { Text("HSN/SAC Code") }, modifier = Modifier.fillMaxWidth(), singleLine = true)
                }
            }

            viewModel.errorMessage?.let { error ->
                Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.errorContainer)) {
                    Text(text = error, color = MaterialTheme.colorScheme.onErrorContainer, modifier = Modifier.padding(16.dp))
                }
            }

            viewModel.saveSuccess.let { success ->
                if (success) {
                    Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer)) {
                        Text("Tax settings saved successfully", color = MaterialTheme.colorScheme.onPrimaryContainer, modifier = Modifier.padding(16.dp))
                    }
                }
            }

            Button(onClick = { viewModel.saveTaxSettings() }, modifier = Modifier.fillMaxWidth(), colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)) {
                Icon(Icons.Default.Save, contentDescription = null)
                Spacer(modifier = Modifier.width(8.dp))
                Text("Save Tax Settings")
            }
            Spacer(modifier = Modifier.height(16.dp))
        }
    }
}

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

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TaxSettingsScreen(
    onBack: () -> Unit
) {
    var defaultGstRate by remember { mutableStateOf("18%") }
    var cgstEnabled by remember { mutableStateOf(true) }
    var sgstEnabled by remember { mutableStateOf(true) }
    var igstEnabled by remember { mutableStateOf(true) }
    var taxDisplay by remember { mutableStateOf("Exclusive") }
    var hsnCode by remember { mutableStateOf("") }
    var showSavedToast by remember { mutableStateOf(false) }
    var gstRateDropdownExpanded by remember { mutableStateOf(false) }
    var taxDisplayDropdownExpanded by remember { mutableStateOf(false) }
    val gstRates = listOf("0%", "5%", "12%", "18%", "28%")
    val taxDisplayOptions = listOf("Exclusive", "Inclusive", "Both")

    if (showSavedToast) {
        Snackbar(
            modifier = Modifier.padding(16.dp),
            dismissAction = {
                TextButton(onClick = { showSavedToast = false }) {
                    Text("OK")
                }
            }
        ) {
            Text("Tax settings saved successfully")
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
                    IconButton(onClick = { showSavedToast = true }) {
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
                    Text(
                        "GST Configuration",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.primary
                    )

                    ExposedDropdownMenuBox(
                        expanded = gstRateDropdownExpanded,
                        onExpandedChange = { gstRateDropdownExpanded = !gstRateDropdownExpanded }
                    ) {
                        OutlinedTextField(
                            value = defaultGstRate,
                            onValueChange = {},
                            label = { Text("Default GST Rate") },
                            modifier = Modifier
                                .fillMaxWidth()
                                .menuAnchor(),
                            readOnly = true,
                            trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = gstRateDropdownExpanded) }
                        )
                        ExposedDropdownMenu(
                            expanded = gstRateDropdownExpanded,
                            onDismissRequest = { gstRateDropdownExpanded = false }
                        ) {
                            gstRates.forEach { rate ->
                                DropdownMenuItem(
                                    text = { Text(rate) },
                                    onClick = {
                                        defaultGstRate = rate
                                        gstRateDropdownExpanded = false
                                    }
                                )
                            }
                        }
                    }
                }
            }

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
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Text(
                        "Tax Components",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.primary
                    )

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text("CGST Enabled", style = MaterialTheme.typography.bodyLarge)
                        Switch(checked = cgstEnabled, onCheckedChange = { cgstEnabled = it })
                    }

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text("SGST Enabled", style = MaterialTheme.typography.bodyLarge)
                        Switch(checked = sgstEnabled, onCheckedChange = { sgstEnabled = it })
                    }

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text("IGST Enabled", style = MaterialTheme.typography.bodyLarge)
                        Switch(checked = igstEnabled, onCheckedChange = { igstEnabled = it })
                    }
                }
            }

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
                    Text(
                        "Display & Codes",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.primary
                    )

                    ExposedDropdownMenuBox(
                        expanded = taxDisplayDropdownExpanded,
                        onExpandedChange = { taxDisplayDropdownExpanded = !taxDisplayDropdownExpanded }
                    ) {
                        OutlinedTextField(
                            value = taxDisplay,
                            onValueChange = {},
                            label = { Text("Tax Display") },
                            modifier = Modifier
                                .fillMaxWidth()
                                .menuAnchor(),
                            readOnly = true,
                            trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = taxDisplayDropdownExpanded) }
                        )
                        ExposedDropdownMenu(
                            expanded = taxDisplayDropdownExpanded,
                            onDismissRequest = { taxDisplayDropdownExpanded = false }
                        ) {
                            taxDisplayOptions.forEach { option ->
                                DropdownMenuItem(
                                    text = { Text(option) },
                                    onClick = {
                                        taxDisplay = option
                                        taxDisplayDropdownExpanded = false
                                    }
                                )
                            }
                        }
                    }

                    OutlinedTextField(
                        value = hsnCode,
                        onValueChange = { hsnCode = it },
                        label = { Text("HSN/SAC Code") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true
                    )
                }
            }

            Button(
                onClick = { showSavedToast = true },
                modifier = Modifier.fillMaxWidth(),
                colors = ButtonDefaults.buttonColors(
                    containerColor = MaterialTheme.colorScheme.primary
                )
            ) {
                Icon(Icons.Default.Save, contentDescription = null)
                Spacer(modifier = Modifier.width(8.dp))
                Text("Save Tax Settings")
            }

            Spacer(modifier = Modifier.height(16.dp))
        }
    }
}

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
fun PrintSettingsScreen(
    onBack: () -> Unit
) {
    var bluetoothEnabled by remember { mutableStateOf(false) }
    var autoPrint by remember { mutableStateOf(false) }
    var printCopies by remember { mutableStateOf("1") }
    var paperSize by remember { mutableStateOf("A4") }
    var printLogo by remember { mutableStateOf(false) }
    var showSavedToast by remember { mutableStateOf(false) }
    var copiesDropdownExpanded by remember { mutableStateOf(false) }
    var paperSizeDropdownExpanded by remember { mutableStateOf(false) }
    val copyOptions = listOf("1", "2", "3")
    val paperSizeOptions = listOf("A4", "A5", "Thermal 80mm", "Thermal 58mm")

    if (showSavedToast) {
        Snackbar(
            modifier = Modifier.padding(16.dp),
            dismissAction = {
                TextButton(onClick = { showSavedToast = false }) {
                    Text("OK")
                }
            }
        ) {
            Text("Print settings saved successfully")
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
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Text(
                        "Printer",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.primary
                    )

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text("Bluetooth Printer Enabled", style = MaterialTheme.typography.bodyLarge)
                        Switch(checked = bluetoothEnabled, onCheckedChange = { bluetoothEnabled = it })
                    }

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text("Auto Print after Invoice", style = MaterialTheme.typography.bodyLarge)
                        Switch(checked = autoPrint, onCheckedChange = { autoPrint = it })
                    }

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text("Print Logo on Receipt", style = MaterialTheme.typography.bodyLarge)
                        Switch(checked = printLogo, onCheckedChange = { printLogo = it })
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
                        "Print Options",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.primary
                    )

                    ExposedDropdownMenuBox(
                        expanded = copiesDropdownExpanded,
                        onExpandedChange = { copiesDropdownExpanded = !copiesDropdownExpanded }
                    ) {
                        OutlinedTextField(
                            value = printCopies,
                            onValueChange = {},
                            label = { Text("Print Copies") },
                            modifier = Modifier
                                .fillMaxWidth()
                                .menuAnchor(),
                            readOnly = true,
                            trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = copiesDropdownExpanded) }
                        )
                        ExposedDropdownMenu(
                            expanded = copiesDropdownExpanded,
                            onDismissRequest = { copiesDropdownExpanded = false }
                        ) {
                            copyOptions.forEach { copy ->
                                DropdownMenuItem(
                                    text = { Text(copy) },
                                    onClick = {
                                        printCopies = copy
                                        copiesDropdownExpanded = false
                                    }
                                )
                            }
                        }
                    }

                    ExposedDropdownMenuBox(
                        expanded = paperSizeDropdownExpanded,
                        onExpandedChange = { paperSizeDropdownExpanded = !paperSizeDropdownExpanded }
                    ) {
                        OutlinedTextField(
                            value = paperSize,
                            onValueChange = {},
                            label = { Text("Paper Size") },
                            modifier = Modifier
                                .fillMaxWidth()
                                .menuAnchor(),
                            readOnly = true,
                            trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = paperSizeDropdownExpanded) }
                        )
                        ExposedDropdownMenu(
                            expanded = paperSizeDropdownExpanded,
                            onDismissRequest = { paperSizeDropdownExpanded = false }
                        ) {
                            paperSizeOptions.forEach { size ->
                                DropdownMenuItem(
                                    text = { Text(size) },
                                    onClick = {
                                        paperSize = size
                                        paperSizeDropdownExpanded = false
                                    }
                                )
                            }
                        }
                    }
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
                Text("Save Print Settings")
            }

            Spacer(modifier = Modifier.height(16.dp))
        }
    }
}

package com.gstbilling.app.ui.settings

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Save
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BusinessProfileScreen(
    onBack: () -> Unit,
    viewModel: SubSettingsViewModel = hiltViewModel()
) {
    var dropdownExpanded by remember { mutableStateOf(false) }
    val businessTypes = listOf("Regular", "Composition", "Unregistered", "Consumer")

    LaunchedEffect(Unit) {
        viewModel.clearMessages()
        viewModel.loadBusinessProfile()
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
                title = { Text("Business Profile") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    IconButton(onClick = { viewModel.saveBusinessProfile() }) {
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
                Column(modifier = Modifier.fillMaxWidth().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text("Business Information", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
                    OutlinedTextField(value = viewModel.businessName, onValueChange = { viewModel.onBusinessNameChange(it) }, label = { Text("Business Name") }, modifier = Modifier.fillMaxWidth(), singleLine = true)
                    OutlinedTextField(value = viewModel.ownerName, onValueChange = { viewModel.onOwnerNameChange(it) }, label = { Text("Owner Name") }, modifier = Modifier.fillMaxWidth(), singleLine = true)
                    OutlinedTextField(value = viewModel.phone, onValueChange = { viewModel.onPhoneChange(it) }, label = { Text("Phone") }, modifier = Modifier.fillMaxWidth(), singleLine = true)
                    OutlinedTextField(value = viewModel.email, onValueChange = { viewModel.onEmailChange(it) }, label = { Text("Email") }, modifier = Modifier.fillMaxWidth(), singleLine = true)
                }
            }

            Card(modifier = Modifier.fillMaxWidth(), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f))) {
                Column(modifier = Modifier.fillMaxWidth().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text("Address", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
                    OutlinedTextField(value = viewModel.address, onValueChange = { viewModel.onAddressChange(it) }, label = { Text("Address") }, modifier = Modifier.fillMaxWidth(), minLines = 2)
                    OutlinedTextField(value = viewModel.city, onValueChange = { viewModel.onCityChange(it) }, label = { Text("City") }, modifier = Modifier.fillMaxWidth(), singleLine = true)
                    OutlinedTextField(value = viewModel.state, onValueChange = { viewModel.onStateChange(it) }, label = { Text("State") }, modifier = Modifier.fillMaxWidth(), singleLine = true)
                }
            }

            Card(modifier = Modifier.fillMaxWidth(), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f))) {
                Column(modifier = Modifier.fillMaxWidth().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text("Tax Information", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
                    OutlinedTextField(
                        value = viewModel.gstin,
                        onValueChange = { viewModel.onGstinChange(it) },
                        label = { Text("GSTIN") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                        trailingIcon = {
                            IconButton(
                                onClick = { viewModel.lookupGstin(viewModel.gstin) },
                                enabled = viewModel.gstin.length >= 15 && !viewModel.isGstinLookupLoading
                            ) {
                                if (viewModel.isGstinLookupLoading) {
                                    CircularProgressIndicator(modifier = Modifier.size(20.dp), strokeWidth = 2.dp)
                                } else {
                                    Icon(Icons.Default.Search, contentDescription = "Lookup GSTIN")
                                }
                            }
                        },
                        supportingText = { Text("GST Identification Number") }
                    )
                    ExposedDropdownMenuBox(expanded = dropdownExpanded, onExpandedChange = { dropdownExpanded = !dropdownExpanded }) {
                        OutlinedTextField(value = viewModel.businessType, onValueChange = {}, label = { Text("Business Type") }, modifier = Modifier.fillMaxWidth().menuAnchor(), readOnly = true, trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = dropdownExpanded) })
                        ExposedDropdownMenu(expanded = dropdownExpanded, onDismissRequest = { dropdownExpanded = false }) {
                            businessTypes.forEach { type ->
                                DropdownMenuItem(text = { Text(type) }, onClick = { viewModel.onBusinessTypeChange(type); dropdownExpanded = false })
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
                    Text("Profile saved successfully", color = MaterialTheme.colorScheme.onPrimaryContainer, modifier = Modifier.padding(16.dp))
                }
            }

            Button(onClick = { viewModel.saveBusinessProfile() }, modifier = Modifier.fillMaxWidth(), colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)) {
                Icon(Icons.Default.Save, contentDescription = null)
                Spacer(modifier = Modifier.width(8.dp))
                Text("Save Profile")
            }
            Spacer(modifier = Modifier.height(16.dp))
        }
    }
}

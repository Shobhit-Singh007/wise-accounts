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
fun InvoiceTemplateScreen(
    onBack: () -> Unit,
    viewModel: SubSettingsViewModel = hiltViewModel()
) {
    LaunchedEffect(Unit) {
        viewModel.clearMessages()
        viewModel.loadInvoiceSettings()
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
                title = { Text("Invoice Template") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    IconButton(onClick = { viewModel.saveInvoiceTemplate() }) {
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
                    Text("Numbering", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
                    OutlinedTextField(value = viewModel.invoicePrefix, onValueChange = { viewModel.onInvoicePrefixChange(it) }, label = { Text("Invoice Prefix") }, modifier = Modifier.fillMaxWidth(), singleLine = true)
                    OutlinedTextField(value = viewModel.invoiceStartNumber, onValueChange = { viewModel.onInvoiceStartNumberChange(it) }, label = { Text("Invoice Starting Number") }, modifier = Modifier.fillMaxWidth(), singleLine = true)
                }
            }

            Card(modifier = Modifier.fillMaxWidth(), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f))) {
                Column(modifier = Modifier.fillMaxWidth().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text("Content", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
                    OutlinedTextField(value = viewModel.termsAndConditions, onValueChange = { viewModel.onTermsChange(it) }, label = { Text("Terms & Conditions") }, modifier = Modifier.fillMaxWidth(), minLines = 3)
                    OutlinedTextField(value = viewModel.notes, onValueChange = { viewModel.onNotesChange(it) }, label = { Text("Notes") }, modifier = Modifier.fillMaxWidth(), minLines = 2)
                }
            }

            Card(modifier = Modifier.fillMaxWidth(), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f))) {
                Column(modifier = Modifier.fillMaxWidth().padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Display Options", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) { Text("Show GSTIN on Invoice", style = MaterialTheme.typography.bodyLarge); Switch(checked = viewModel.showGstin, onCheckedChange = { viewModel.onShowGstinChange(it) }) }
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) { Text("Show Customer GSTIN", style = MaterialTheme.typography.bodyLarge); Switch(checked = viewModel.showCustomerGstin, onCheckedChange = { viewModel.onShowCustomerGstinChange(it) }) }
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) { Text("Show Bank Details", style = MaterialTheme.typography.bodyLarge); Switch(checked = viewModel.showBankDetails, onCheckedChange = { viewModel.onShowBankDetailsChange(it) }) }
                }
            }

            if (viewModel.showBankDetails) {
                Card(modifier = Modifier.fillMaxWidth(), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f))) {
                    Column(modifier = Modifier.fillMaxWidth().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        Text("Bank Details", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
                        OutlinedTextField(value = viewModel.bankName, onValueChange = { viewModel.onBankNameChange(it) }, label = { Text("Bank Name") }, modifier = Modifier.fillMaxWidth(), singleLine = true)
                        OutlinedTextField(value = viewModel.accountNumber, onValueChange = { viewModel.onAccountNumberChange(it) }, label = { Text("Account Number") }, modifier = Modifier.fillMaxWidth(), singleLine = true)
                        OutlinedTextField(value = viewModel.ifscCode, onValueChange = { viewModel.onIfscCodeChange(it) }, label = { Text("IFSC Code") }, modifier = Modifier.fillMaxWidth(), singleLine = true)
                        OutlinedTextField(value = viewModel.branch, onValueChange = { viewModel.onBranchChange(it) }, label = { Text("Branch") }, modifier = Modifier.fillMaxWidth(), singleLine = true)
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
                    Text("Invoice template saved successfully", color = MaterialTheme.colorScheme.onPrimaryContainer, modifier = Modifier.padding(16.dp))
                }
            }

            Button(onClick = { viewModel.saveInvoiceTemplate() }, modifier = Modifier.fillMaxWidth(), colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)) {
                Icon(Icons.Default.Save, contentDescription = null)
                Spacer(modifier = Modifier.width(8.dp))
                Text("Save Template")
            }
            Spacer(modifier = Modifier.height(16.dp))
        }
    }
}

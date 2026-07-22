package com.gstbilling.app.ui.settings

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.Image
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import com.gstbilling.app.R
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.gstbilling.app.data.repository.AuthRepository
import com.gstbilling.app.data.repository.BusinessRepository
import com.gstbilling.app.util.AppResult
import com.gstbilling.app.util.SessionManager
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class SettingsViewModel @Inject constructor(
    private val authRepository: AuthRepository,
    private val businessRepository: BusinessRepository,
    private val sessionManager: SessionManager
) : ViewModel() {

    var businessName by mutableStateOf("")
    var userName by mutableStateOf("")
    var phone by mutableStateOf("")
    var isLoading by mutableStateOf(false)

    init {
        viewModelScope.launch {
            businessName = sessionManager.getBusinessName() ?: ""
        }
    }

    fun logout(onLogout: () -> Unit) {
        viewModelScope.launch {
            authRepository.logout()
            onLogout()
        }
    }

    fun changePassword(oldPassword: String, newPassword: String, onResult: (Boolean, String) -> Unit) {
        viewModelScope.launch {
            when (val result = authRepository.changePassword(oldPassword, newPassword)) {
                is AppResult.Success -> onResult(true, "Password changed successfully!")
                is AppResult.Error -> onResult(false, result.message ?: "Failed to change password")
                is AppResult.Loading -> {}
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(
    onBack: () -> Unit,
    onLogout: () -> Unit,
    onNavigateToStaff: () -> Unit = {},
    onNavigateToWarehouses: () -> Unit = {},
    onNavigateToSuppliers: () -> Unit = {},
    onNavigateToLowStock: () -> Unit = {},
    onNavigateToPurchaseOrders: () -> Unit = {},
    onNavigateToDataImport: () -> Unit = {},
    onNavigateToExportData: () -> Unit = {},
    onNavigateToBusinessList: () -> Unit = {},
    onNavigateToBusinessProfile: () -> Unit = {},
    onNavigateToTaxSettings: () -> Unit = {},
    onNavigateToInvoiceTemplate: () -> Unit = {},
    onNavigateToPaymentMethods: () -> Unit = {},
    onNavigateToPrintSettings: () -> Unit = {},
    onNavigateToSyncData: () -> Unit = {},
    onNavigateToBackup: () -> Unit = {},
    onNavigateToApiCredentials: () -> Unit = {},
    viewModel: SettingsViewModel = hiltViewModel()
) {
    var showLogoutDialog by remember { mutableStateOf(false) }
    var showChangePwdDialog by remember { mutableStateOf(false) }
    var oldPwd by remember { mutableStateOf("") }
    var newPwd by remember { mutableStateOf("") }
    var confirmPwd by remember { mutableStateOf("") }
    var pwdSaving by remember { mutableStateOf(false) }
    var pwdMsg by remember { mutableStateOf("") }

    if (showLogoutDialog) {
        AlertDialog(
            onDismissRequest = { showLogoutDialog = false },
            title = { Text("Logout") },
            text = { Text("Are you sure you want to logout?") },
            confirmButton = {
                TextButton(onClick = {
                    showLogoutDialog = false
                    viewModel.logout(onLogout)
                }) {
                    Text("Logout", color = MaterialTheme.colorScheme.error)
                }
            },
            dismissButton = {
                TextButton(onClick = { showLogoutDialog = false }) {
                    Text("Cancel")
                }
            }
        )
    }

    if (showChangePwdDialog) {
        AlertDialog(
            onDismissRequest = { showChangePwdDialog = false },
            title = { Text("Change Password") },
            text = {
                Column {
                    OutlinedTextField(value = oldPwd, onValueChange = { oldPwd = it }, label = { Text("Current Password") }, visualTransformation = PasswordVisualTransformation(), singleLine = true, modifier = Modifier.fillMaxWidth())
                    Spacer(modifier = Modifier.height(8.dp))
                    OutlinedTextField(value = newPwd, onValueChange = { newPwd = it }, label = { Text("New Password") }, visualTransformation = PasswordVisualTransformation(), singleLine = true, modifier = Modifier.fillMaxWidth())
                    Spacer(modifier = Modifier.height(8.dp))
                    OutlinedTextField(value = confirmPwd, onValueChange = { confirmPwd = it }, label = { Text("Confirm New Password") }, visualTransformation = PasswordVisualTransformation(), singleLine = true, modifier = Modifier.fillMaxWidth())
                    if (pwdMsg.isNotEmpty()) {
                        Text(pwdMsg, color = if (pwdMsg.contains("success")) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(top = 8.dp))
                    }
                }
            },
            confirmButton = {
                    Button(
                        onClick = {
                            if (oldPwd.isBlank() || newPwd.length < 8 || newPwd != confirmPwd) return@Button
                            pwdSaving = true; pwdMsg = ""
                            viewModel.changePassword(oldPwd, newPwd) { success, msg ->
                                pwdMsg = msg
                                if (success) { oldPwd = ""; newPwd = ""; confirmPwd = "" }
                                pwdSaving = false
                            }
                        },
                        enabled = !pwdSaving && oldPwd.isNotBlank() && newPwd.length >= 8 && newPwd == confirmPwd
                    ) {
                    if (pwdSaving) CircularProgressIndicator(modifier = Modifier.size(20.dp), strokeWidth = 2.dp)
                    else Text("Save")
                }
            },
            dismissButton = { TextButton(onClick = { showChangePwdDialog = false; pwdMsg = "" }) { Text("Cancel") } }
        )
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Settings") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        }
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.primaryContainer
                    )
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(20.dp)
                            .clickable { onNavigateToBusinessList() },
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Image(
                            painter = painterResource(id = R.drawable.splash_logo),
                            contentDescription = "Wise Accounts Logo",
                            modifier = Modifier.size(48.dp)
                        )
                        Spacer(modifier = Modifier.width(16.dp))
                        Column {
                            Text(
                                text = viewModel.businessName,
                                style = MaterialTheme.typography.titleLarge,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.onPrimaryContainer
                            )
                        }
                    }
                }
            }

            item {
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    "General",
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.primary
                )
            }

            item {
                SettingsItem(
                    title = "Business Profile",
                    subtitle = "Edit your business details",
                    icon = Icons.Default.Store,
                    onClick = onNavigateToBusinessProfile
                )
            }

            item {
                SettingsItem(
                    title = "Switch Business",
                    subtitle = "Select or create a different business",
                    icon = Icons.Default.SwapHoriz,
                    onClick = onNavigateToBusinessList
                )
            }

            item {
                SettingsItem(
                    title = "Warehouses",
                    subtitle = "Manage warehouse locations",
                    icon = Icons.Default.Warehouse,
                    onClick = onNavigateToWarehouses
                )
            }

            item {
                SettingsItem(
                    title = "Staff Management",
                    subtitle = "Invite and manage your team",
                    icon = Icons.Default.Groups,
                    onClick = onNavigateToStaff
                )
            }

            item {
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    "Security",
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.primary
                )
            }

            item {
                SettingsItem(
                    title = "Change Password",
                    subtitle = "Update your account password",
                    icon = Icons.Default.Lock,
                    onClick = { showChangePwdDialog = true }
                )
            }

            item {
                SettingsItem(
                    title = "Tax Settings",
                    subtitle = "Configure GST and tax rates",
                    icon = Icons.Default.Receipt,
                    onClick = onNavigateToTaxSettings
                )
            }

            item {
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    "Preferences",
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.primary
                )
            }

            item {
                SettingsItem(
                    title = "Invoice Template",
                    subtitle = "Customize invoice format",
                    icon = Icons.Default.Description,
                    onClick = onNavigateToInvoiceTemplate
                )
            }

            item {
                SettingsItem(
                    title = "Payment Methods",
                    subtitle = "UPI, Razorpay, Cash, etc.",
                    icon = Icons.Default.Payment,
                    onClick = onNavigateToPaymentMethods
                )
            }

            item {
                SettingsItem(
                    title = "Print Settings",
                    subtitle = "Bluetooth printer configuration",
                    icon = Icons.Default.Print,
                    onClick = onNavigateToPrintSettings
                )
            }

            item {
                SettingsItem(
                    title = "API Credentials",
                    subtitle = "Razorpay, e-Invoice, E-Way Bill",
                    icon = Icons.Default.Key,
                    onClick = onNavigateToApiCredentials
                )
            }

            item {
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    "Data",
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.primary
                )
            }

            item {
                SettingsItem(
                    title = "Import Data",
                    subtitle = "Import CSV/Excel from Khatabook, GoGST",
                    icon = Icons.Default.FileUpload,
                    onClick = onNavigateToDataImport
                )
            }

            item {
                SettingsItem(
                    title = "Export Data",
                    subtitle = "Export customers, products, invoices as CSV",
                    icon = Icons.Default.FileDownload,
                    onClick = onNavigateToExportData
                )
            }

            item {
                SettingsItem(
                    title = "Sync Data",
                    subtitle = "Sync offline data with server",
                    icon = Icons.Default.Sync,
                    onClick = onNavigateToSyncData
                )
            }

            item {
                SettingsItem(
                    title = "Backup",
                    subtitle = "Backup your data to cloud",
                    icon = Icons.Default.CloudUpload,
                    onClick = onNavigateToBackup
                )
            }

            item {
                Spacer(modifier = Modifier.height(16.dp))
                OutlinedButton(
                    onClick = { showLogoutDialog = true },
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.outlinedButtonColors(
                        contentColor = MaterialTheme.colorScheme.error
                    )
                ) {
                    Icon(Icons.Default.Logout, contentDescription = null)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Logout")
                }
            }

            item {
                Spacer(modifier = Modifier.height(16.dp))
                Text(
                    text = "Version 1.0.0",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.fillMaxWidth(),
                    textAlign = androidx.compose.ui.text.style.TextAlign.Center
                )
                Spacer(modifier = Modifier.height(32.dp))
            }
        }
    }
}

@Composable
fun SettingsItem(
    title: String,
    subtitle: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    onClick: () -> Unit
) {
    Card(
        onClick = onClick,
        modifier = Modifier.fillMaxWidth()
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
                tint = MaterialTheme.colorScheme.primary,
                modifier = Modifier.size(24.dp)
            )
            Spacer(modifier = Modifier.width(16.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = title,
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = subtitle,
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

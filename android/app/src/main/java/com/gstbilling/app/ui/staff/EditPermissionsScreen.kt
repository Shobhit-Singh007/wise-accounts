package com.gstbilling.app.ui.staff

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.gstbilling.app.data.remote.api.StaffMember
import com.gstbilling.app.data.remote.api.UpdatePermissionsRequest
import com.gstbilling.app.data.repository.StaffRepository
import com.gstbilling.app.util.AppResult
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import javax.inject.Inject

private val PERMISSION_GROUPS = mapOf(
    "Dashboard" to listOf("dashboard.view"),
    "Customers" to listOf("customers.view", "customers.create", "customers.edit", "customers.delete"),
    "Products" to listOf("products.view", "products.create", "products.edit", "products.delete"),
    "Invoices" to listOf("invoices.view", "invoices.create", "invoices.edit", "invoices.delete", "invoices.cancel"),
    "Payments" to listOf("payments.view", "payments.create", "payments.delete"),
    "Reports" to listOf("reports.view", "reports.export"),
    "Settings" to listOf("settings.view", "settings.edit"),
    "Staff" to listOf("staff.view", "staff.invite", "staff.edit", "staff.remove"),
    "Warehouses" to listOf("warehouses.view", "warehouses.create", "warehouses.edit", "warehouses.delete")
)

private val PRESET_PERMISSIONS = mapOf(
    "owner" to PERMISSION_GROUPS.values.flatten().toList(),
    "admin" to PERMISSION_GROUPS.values.flatten().filter { it != "staff.remove" && it != "settings.edit" },
    "manager" to listOf(
        "customers.view", "customers.create", "customers.edit",
        "products.view", "products.create", "products.edit",
        "invoices.view", "invoices.create", "invoices.edit", "invoices.cancel",
        "payments.view", "payments.create",
        "reports.view",
        "warehouses.view", "warehouses.create", "warehouses.edit"
    ),
    "accountant" to listOf(
        "invoices.view", "invoices.create",
        "payments.view", "payments.create",
        "reports.view", "reports.export",
        "customers.view"
    ),
    "sales" to listOf(
        "invoices.view", "invoices.create",
        "customers.view", "customers.create"
    ),
    "viewer" to PERMISSION_GROUPS.keys.map { "${it.lowercase().replaceFirstChar { c -> c }}.view".let { perm ->
        PERMISSION_GROUPS.values.flatten().first { it.endsWith(".view") && it.startsWith(perm.split(".")[0]) }
    } }
)

private fun getViewerPreset(): List<String> {
    return listOf(
        "dashboard.view",
        "customers.view",
        "products.view",
        "invoices.view",
        "payments.view",
        "reports.view",
        "staff.view",
        "warehouses.view"
    )
}

@HiltViewModel
class EditPermissionsViewModel @Inject constructor(
    private val staffRepository: StaffRepository
) : ViewModel() {

    var staffMember by mutableStateOf<StaffMember?>(null)
    var selectedPermissions by mutableStateOf<Set<String>>(emptySet())
    var isLoading by mutableStateOf(false)
    var isSaving by mutableStateOf(false)
    var errorMessage by mutableStateOf<String?>(null)
    var saveSuccess by mutableStateOf(false)

    fun loadStaff(userId: String) {
        viewModelScope.launch {
            isLoading = true
            when (val result = staffRepository.getStaff()) {
                is AppResult.Success -> {
                    staffMember = result.data.find { it.userId == userId }
                    selectedPermissions = staffMember?.permissions?.toSet() ?: emptySet()
                    isLoading = false
                }
                is AppResult.Error -> {
                    errorMessage = result.message
                    isLoading = false
                }
                is AppResult.Loading -> {}
            }
        }
    }

    fun togglePermission(permission: String) {
        selectedPermissions = if (permission in selectedPermissions) {
            selectedPermissions - permission
        } else {
            selectedPermissions + permission
        }
    }

    fun toggleAllGroup(groupPermissions: List<String>, allSelected: Boolean) {
        selectedPermissions = if (allSelected) {
            selectedPermissions - groupPermissions.toSet()
        } else {
            selectedPermissions + groupPermissions.toSet()
        }
    }

    fun applyPreset(presetKey: String) {
        selectedPermissions = when (presetKey) {
            "owner" -> PRESET_PERMISSIONS["owner"]?.toSet() ?: emptySet()
            "admin" -> PRESET_PERMISSIONS["admin"]?.toSet() ?: emptySet()
            "manager" -> PRESET_PERMISSIONS["manager"]?.toSet() ?: emptySet()
            "accountant" -> PRESET_PERMISSIONS["accountant"]?.toSet() ?: emptySet()
            "sales" -> PRESET_PERMISSIONS["sales"]?.toSet() ?: emptySet()
            "viewer" -> getViewerPreset().toSet()
            else -> selectedPermissions
        }
    }

    fun savePermissions(userId: String) {
        viewModelScope.launch {
            isSaving = true
            errorMessage = null
            val request = UpdatePermissionsRequest(
                permissions = selectedPermissions.toList()
            )
            when (val result = staffRepository.updatePermissions(userId, request)) {
                is AppResult.Success -> {
                    saveSuccess = true
                    isSaving = false
                }
                is AppResult.Error -> {
                    errorMessage = result.message
                    isSaving = false
                }
                is AppResult.Loading -> {}
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EditPermissionsScreen(
    userId: String,
    currentName: String,
    onBack: () -> Unit,
    viewModel: EditPermissionsViewModel = hiltViewModel()
) {
    LaunchedEffect(userId) {
        viewModel.loadStaff(userId)
    }

    LaunchedEffect(viewModel.saveSuccess) {
        if (viewModel.saveSuccess) {
            onBack()
        }
    }

    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(viewModel.errorMessage) {
        viewModel.errorMessage?.let {
            snackbarHostState.showSnackbar(it)
            viewModel.errorMessage = null
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Edit Permissions") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    TextButton(
                        onClick = { viewModel.savePermissions(userId) },
                        enabled = !viewModel.isSaving
                    ) {
                        if (viewModel.isSaving) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(20.dp),
                                strokeWidth = 2.dp,
                                color = MaterialTheme.colorScheme.primary
                            )
                        } else {
                            Text("Save", fontWeight = FontWeight.Bold)
                        }
                    }
                }
            )
        },
        snackbarHost = { SnackbarHost(snackbarHostState) }
    ) { padding ->
        if (viewModel.isLoading) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator()
            }
        } else {
            val member = viewModel.staffMember
            if (member == null) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding),
                    contentAlignment = Alignment.Center
                ) {
                    Text("Staff member not found")
                }
            } else {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding)
                        .verticalScroll(rememberScrollState())
                ) {
                    // Staff info header
                    Surface(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        shape = MaterialTheme.shapes.medium,
                        color = MaterialTheme.colorScheme.primaryContainer
                    ) {
                        Row(
                            modifier = Modifier.padding(16.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Surface(
                                modifier = Modifier.size(48.dp),
                                shape = MaterialTheme.shapes.extraLarge,
                                color = MaterialTheme.colorScheme.primary
                            ) {
                                Box(contentAlignment = Alignment.Center) {
                                    Text(
                                        text = member.name.take(1).uppercase(),
                                        style = MaterialTheme.typography.titleLarge,
                                        fontWeight = FontWeight.Bold,
                                        color = MaterialTheme.colorScheme.onPrimary
                                    )
                                }
                            }
                            Spacer(modifier = Modifier.width(12.dp))
                            Column {
                                Text(
                                    text = member.name.ifBlank { "Unknown" },
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.Bold,
                                    color = MaterialTheme.colorScheme.onPrimaryContainer
                                )
                                Text(
                                    text = "${viewModel.selectedPermissions.size} permissions selected",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = 0.7f)
                                )
                            }
                        }
                    }

                    // Preset buttons
                    Text(
                        "Quick Presets",
                        modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.primary
                    )

                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        listOf("admin", "manager", "accountant", "sales", "viewer").forEach { preset ->
                            FilterChip(
                                selected = false,
                                onClick = { viewModel.applyPreset(preset) },
                                label = { Text(preset.replaceFirstChar { it.uppercase() }) }
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    // Permission groups
                    PERMISSION_GROUPS.forEach { (group, permissions) ->
                        val allSelected = permissions.all { it in viewModel.selectedPermissions }
                        val someSelected = permissions.any { it in viewModel.selectedPermissions }

                        Card(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 16.dp, vertical = 4.dp)
                        ) {
                            Column {
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(horizontal = 12.dp, vertical = 4.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Checkbox(
                                        checked = allSelected,
                                        onCheckedChange = { viewModel.toggleAllGroup(permissions, allSelected) }
                                    )
                                    Text(
                                        text = group,
                                        modifier = Modifier.weight(1f),
                                        style = MaterialTheme.typography.titleSmall,
                                        fontWeight = FontWeight.Bold
                                    )
                                    if (someSelected && !allSelected) {
                                        Text(
                                            text = "${permissions.count { it in viewModel.selectedPermissions }}/${permissions.size}",
                                            style = MaterialTheme.typography.labelSmall,
                                            color = MaterialTheme.colorScheme.primary
                                        )
                                    }
                                }

                                permissions.forEach { permission ->
                                    val action = permission.split(".").last().replaceFirstChar { it.uppercase() }
                                    Row(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .padding(start = 36.dp, top = 2.dp, end = 12.dp, bottom = 2.dp),
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Checkbox(
                                            checked = permission in viewModel.selectedPermissions,
                                            onCheckedChange = { viewModel.togglePermission(permission) }
                                        )
                                        Text(
                                            text = action,
                                            style = MaterialTheme.typography.bodyMedium
                                        )
                                    }
                                }
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(32.dp))
                }
            }
        }
    }
}

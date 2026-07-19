package com.gstbilling.app.ui.inventory

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
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
import com.gstbilling.app.data.remote.api.ApiService
import com.gstbilling.app.data.remote.api.Supplier
import com.gstbilling.app.util.AppResult
import com.gstbilling.app.util.SessionManager
import com.gstbilling.app.util.safeApiCall
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class SupplierViewModel @Inject constructor(
    private val apiService: ApiService,
    private val sessionManager: SessionManager
) : ViewModel() {

    var suppliers by mutableStateOf<List<Supplier>>(emptyList())
        private set
    var isLoading by mutableStateOf(false)
    var errorMessage by mutableStateOf<String?>(null)
    var showAddDialog by mutableStateOf(false)

    // Add dialog fields
    var newName by mutableStateOf("")
    var newPhone by mutableStateOf("")
    var newEmail by mutableStateOf("")
    var newGstin by mutableStateOf("")
    var newAddress by mutableStateOf("")
    var isSaving by mutableStateOf(false)

    var editingSupplier by mutableStateOf<Supplier?>(null)
    var showDeleteDialog by mutableStateOf(false)
    var deletingSupplier by mutableStateOf<Supplier?>(null)

    private var businessId = ""

    init {
        viewModelScope.launch {
            businessId = sessionManager.getBusinessId() ?: ""
            if (businessId.isNotEmpty()) {
                loadSuppliers()
            }
        }
    }

    fun loadSuppliers() {
        isLoading = true
        errorMessage = null
        viewModelScope.launch {
            val result = safeApiCall {
                val response = apiService.getSuppliers(businessId)
                if (response.isSuccessful) {
                    response.body()?.data ?: emptyList()
                } else {
                    throw Exception(response.errorBody()?.string() ?: "Failed to load suppliers")
                }
            }
            when (result) {
                is AppResult.Success -> suppliers = result.data
                is AppResult.Error -> errorMessage = result.message
                is AppResult.Loading -> {}
            }
            isLoading = false
        }
    }

    fun saveSupplier(onDone: () -> Unit) {
        if (newName.isBlank()) {
            errorMessage = "Supplier name is required"
            return
        }
        isSaving = true
        errorMessage = null
        viewModelScope.launch {
            val supplier = Supplier(
                name = newName.trim(),
                phone = newPhone.trim().ifBlank { null },
                email = newEmail.trim().ifBlank { null },
                gstin = newGstin.trim().ifBlank { null },
                address = newAddress.trim().ifBlank { null },
                businessId = businessId
            )
            val result = safeApiCall {
                val response = if (editingSupplier != null) {
                    apiService.updateSupplier(businessId, editingSupplier!!.id, supplier)
                } else {
                    apiService.createSupplier(businessId, supplier)
                }
                if (response.isSuccessful) {
                    response.body()?.data
                } else {
                    throw Exception(response.errorBody()?.string() ?: "Failed to save supplier")
                }
            }
            isSaving = false
            when (result) {
                is AppResult.Success -> {
                    newName = ""
                    newPhone = ""
                    newEmail = ""
                    newGstin = ""
                    newAddress = ""
                    editingSupplier = null
                    showAddDialog = false
                    loadSuppliers()
                    onDone()
                }
                is AppResult.Error -> errorMessage = result.message
                is AppResult.Loading -> {}
            }
        }
    }

    fun editSupplier(supplier: Supplier) {
        editingSupplier = supplier
        newName = supplier.name
        newPhone = supplier.phone ?: ""
        newEmail = supplier.email ?: ""
        newGstin = supplier.gstin ?: ""
        newAddress = supplier.address ?: ""
        showAddDialog = true
    }

    fun deleteSupplier() {
        val supplier = deletingSupplier ?: return
        viewModelScope.launch {
            val result = safeApiCall {
                val response = apiService.deleteSupplier(businessId, supplier.id)
                if (response.isSuccessful) {
                    Unit
                } else {
                    throw Exception(response.errorBody()?.string() ?: "Failed to delete supplier")
                }
            }
            when (result) {
                is AppResult.Success -> {
                    deletingSupplier = null
                    showDeleteDialog = false
                    loadSuppliers()
                }
                is AppResult.Error -> errorMessage = result.message
                is AppResult.Loading -> {}
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SupplierManagementScreen(
    onBack: () -> Unit,
    viewModel: SupplierViewModel = hiltViewModel()
) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Suppliers") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    IconButton(onClick = { viewModel.loadSuppliers() }) {
                        Icon(Icons.Default.Refresh, contentDescription = "Refresh")
                    }
                }
            )
        },
        floatingActionButton = {
            FloatingActionButton(onClick = { viewModel.showAddDialog = true }) {
                Icon(Icons.Default.Add, contentDescription = "Add Supplier")
            }
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            if (viewModel.isLoading) {
                LinearProgressIndicator(modifier = Modifier.fillMaxWidth())
            }

            viewModel.errorMessage?.let { error ->
                Card(
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.errorContainer
                    ),
                    modifier = Modifier.fillMaxWidth().padding(16.dp)
                ) {
                    Text(
                        text = error,
                        color = MaterialTheme.colorScheme.onErrorContainer,
                        modifier = Modifier.padding(16.dp)
                    )
                }
            }

            if (viewModel.suppliers.isEmpty() && !viewModel.isLoading) {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(
                            Icons.Default.Business,
                            contentDescription = null,
                            modifier = Modifier.size(64.dp),
                            tint = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Spacer(modifier = Modifier.height(16.dp))
                        Text(
                            "No suppliers found",
                            style = MaterialTheme.typography.bodyLarge,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            "Add your first supplier",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            } else {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    items(viewModel.suppliers, key = { it.id }) { supplier ->
                        SupplierItem(
                            supplier = supplier,
                            onEdit = { viewModel.editSupplier(supplier) },
                            onDelete = {
                                viewModel.deletingSupplier = supplier
                                viewModel.showDeleteDialog = true
                            }
                        )
                    }
                }
            }
        }

        if (viewModel.showAddDialog) {
            AlertDialog(
                onDismissRequest = {
                    viewModel.showAddDialog = false
                    viewModel.editingSupplier = null
                    viewModel.errorMessage = null
                },
                title = { Text(if (viewModel.editingSupplier != null) "Edit Supplier" else "Add Supplier") },
                text = {
                    Column(
                        modifier = Modifier.heightIn(max = 400.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        OutlinedTextField(
                            value = viewModel.newName,
                            onValueChange = { viewModel.newName = it },
                            label = { Text("Name *") },
                            leadingIcon = { Icon(Icons.Default.Business, contentDescription = null) },
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth()
                        )
                        OutlinedTextField(
                            value = viewModel.newPhone,
                            onValueChange = { viewModel.newPhone = it },
                            label = { Text("Phone") },
                            leadingIcon = { Icon(Icons.Default.Phone, contentDescription = null) },
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth()
                        )
                        OutlinedTextField(
                            value = viewModel.newEmail,
                            onValueChange = { viewModel.newEmail = it },
                            label = { Text("Email") },
                            leadingIcon = { Icon(Icons.Default.Email, contentDescription = null) },
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth()
                        )
                        OutlinedTextField(
                            value = viewModel.newGstin,
                            onValueChange = { viewModel.newGstin = it },
                            label = { Text("GSTIN") },
                            leadingIcon = { Icon(Icons.Default.Numbers, contentDescription = null) },
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth()
                        )
                        OutlinedTextField(
                            value = viewModel.newAddress,
                            onValueChange = { viewModel.newAddress = it },
                            label = { Text("Address") },
                            leadingIcon = { Icon(Icons.Default.LocationOn, contentDescription = null) },
                            maxLines = 2,
                            modifier = Modifier.fillMaxWidth()
                        )
                        viewModel.errorMessage?.let {
                            Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
                        }
                    }
                },
                confirmButton = {
                    TextButton(
                        onClick = { viewModel.saveSupplier { } },
                        enabled = !viewModel.isSaving
                    ) {
                        if (viewModel.isSaving) {
                            CircularProgressIndicator(modifier = Modifier.size(16.dp), strokeWidth = 2.dp)
                        } else {
                            Text("Save")
                        }
                    }
                },
                dismissButton = {
                    TextButton(onClick = {
                        viewModel.showAddDialog = false
                        viewModel.errorMessage = null
                    }) {
                        Text("Cancel")
                    }
                }
            )
        }

        if (viewModel.showDeleteDialog) {
            AlertDialog(
                onDismissRequest = { viewModel.showDeleteDialog = false; viewModel.deletingSupplier = null },
                title = { Text("Delete Supplier") },
                text = { Text("Are you sure you want to delete ${viewModel.deletingSupplier?.name ?: "this supplier"}?") },
                confirmButton = {
                    TextButton(onClick = { viewModel.deleteSupplier() }) {
                        Text("Delete", color = MaterialTheme.colorScheme.error)
                    }
                },
                dismissButton = {
                    TextButton(onClick = { viewModel.showDeleteDialog = false; viewModel.deletingSupplier = null }) {
                        Text("Cancel")
                    }
                }
            )
        }
    }
}

@Composable
private fun SupplierItem(
    supplier: Supplier,
    onEdit: () -> Unit,
    onDelete: () -> Unit
) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(start = 16.dp, top = 8.dp, bottom = 8.dp, end = 4.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                Icons.Default.Business,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.primary,
                modifier = Modifier.size(40.dp)
            )
            Spacer(modifier = Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = supplier.name,
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold
                )
                if (supplier.phone != null) {
                    Text(
                        text = supplier.phone!!,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
                if (supplier.email != null) {
                    Text(
                        text = supplier.email!!,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
                if (supplier.gstin != null) {
                    Text(
                        text = "GSTIN: ${supplier.gstin}",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.tertiary
                    )
                }
            }
            IconButton(onClick = onEdit) {
                Icon(Icons.Default.Edit, contentDescription = "Edit", tint = MaterialTheme.colorScheme.primary)
            }
            IconButton(onClick = onDelete) {
                Icon(Icons.Default.Delete, contentDescription = "Delete", tint = MaterialTheme.colorScheme.error)
            }
        }
    }
}

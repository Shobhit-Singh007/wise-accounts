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
import com.gstbilling.app.data.remote.api.Warehouse
import com.gstbilling.app.util.AppResult
import com.gstbilling.app.util.SessionManager
import com.gstbilling.app.util.safeApiCall
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class WarehouseViewModel @Inject constructor(
    private val apiService: ApiService,
    private val sessionManager: SessionManager
) : ViewModel() {

    var warehouses by mutableStateOf<List<Warehouse>>(emptyList())
        private set
    var isLoading by mutableStateOf(false)
    var errorMessage by mutableStateOf<String?>(null)
    var showAddDialog by mutableStateOf(false)

    // Add dialog fields
    var newName by mutableStateOf("")
    var newAddress by mutableStateOf("")
    var newCity by mutableStateOf("")
    var newState by mutableStateOf("")
    var isSaving by mutableStateOf(false)

    private var businessId = 0L

    init {
        viewModelScope.launch {
            businessId = sessionManager.getBusinessId() ?: 0L
            if (businessId != 0L) {
                loadWarehouses()
            }
        }
    }

    fun loadWarehouses() {
        isLoading = true
        errorMessage = null
        viewModelScope.launch {
            val result = safeApiCall {
                val response = apiService.getWarehouses(businessId)
                if (response.isSuccessful) {
                    response.body()?.data ?: emptyList()
                } else {
                    throw Exception(response.errorBody()?.string() ?: "Failed to load warehouses")
                }
            }
            when (result) {
                is AppResult.Success -> warehouses = result.data
                is AppResult.Error -> errorMessage = result.message
                is AppResult.Loading -> {}
            }
            isLoading = false
        }
    }

    fun saveWarehouse(onDone: () -> Unit) {
        if (newName.isBlank()) {
            errorMessage = "Warehouse name is required"
            return
        }
        isSaving = true
        errorMessage = null
        viewModelScope.launch {
            val fullAddress = listOfNotNull(
                newName.trim(),
                newAddress.trim().ifBlank { null },
                newCity.trim().ifBlank { null },
                newState.trim().ifBlank { null }
            ).joinToString(", ")
            val warehouse = Warehouse(
                name = newName.trim(),
                address = newAddress.trim().ifBlank { null },
                business_id = businessId
            )
            val result = safeApiCall {
                val response = apiService.createWarehouse(businessId, warehouse)
                if (response.isSuccessful) {
                    response.body()?.data
                } else {
                    throw Exception(response.errorBody()?.string() ?: "Failed to create warehouse")
                }
            }
            isSaving = false
            when (result) {
                is AppResult.Success -> {
                    newName = ""
                    newAddress = ""
                    newCity = ""
                    newState = ""
                    showAddDialog = false
                    loadWarehouses()
                    onDone()
                }
                is AppResult.Error -> errorMessage = result.message
                is AppResult.Loading -> {}
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun WarehouseManagementScreen(
    onBack: () -> Unit,
    viewModel: WarehouseViewModel = hiltViewModel()
) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Warehouses") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    IconButton(onClick = { viewModel.loadWarehouses() }) {
                        Icon(Icons.Default.Refresh, contentDescription = "Refresh")
                    }
                }
            )
        },
        floatingActionButton = {
            FloatingActionButton(onClick = { viewModel.showAddDialog = true }) {
                Icon(Icons.Default.Add, contentDescription = "Add Warehouse")
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

            if (viewModel.warehouses.isEmpty() && !viewModel.isLoading) {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(
                            Icons.Default.Warehouse,
                            contentDescription = null,
                            modifier = Modifier.size(64.dp),
                            tint = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Spacer(modifier = Modifier.height(16.dp))
                        Text(
                            "No warehouses found",
                            style = MaterialTheme.typography.bodyLarge,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            "Add your first warehouse",
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
                    items(viewModel.warehouses, key = { it.id }) { warehouse ->
                        WarehouseItem(warehouse = warehouse)
                    }
                }
            }
        }

        if (viewModel.showAddDialog) {
            AlertDialog(
                onDismissRequest = {
                    viewModel.showAddDialog = false
                    viewModel.errorMessage = null
                },
                title = { Text("Add Warehouse") },
                text = {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        OutlinedTextField(
                            value = viewModel.newName,
                            onValueChange = { viewModel.newName = it },
                            label = { Text("Name *") },
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth()
                        )
                        OutlinedTextField(
                            value = viewModel.newAddress,
                            onValueChange = { viewModel.newAddress = it },
                            label = { Text("Address") },
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth()
                        )
                        OutlinedTextField(
                            value = viewModel.newCity,
                            onValueChange = { viewModel.newCity = it },
                            label = { Text("City") },
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth()
                        )
                        OutlinedTextField(
                            value = viewModel.newState,
                            onValueChange = { viewModel.newState = it },
                            label = { Text("State") },
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth()
                        )
                        viewModel.errorMessage?.let {
                            Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
                        }
                    }
                },
                confirmButton = {
                    TextButton(
                        onClick = { viewModel.saveWarehouse { } },
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
    }
}

@Composable
private fun WarehouseItem(warehouse: Warehouse) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                Icons.Default.Warehouse,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.secondary,
                modifier = Modifier.size(40.dp)
            )
            Spacer(modifier = Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = warehouse.name,
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold
                )
                if (warehouse.address != null) {
                    Text(
                        text = warehouse.address!!,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }
    }
}

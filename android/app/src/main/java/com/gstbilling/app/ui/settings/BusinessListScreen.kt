package com.gstbilling.app.ui.settings

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
import com.gstbilling.app.data.remote.api.Business
import com.gstbilling.app.data.remote.api.CreateBusinessRequest
import com.gstbilling.app.util.AppResult
import com.gstbilling.app.util.SessionManager
import com.gstbilling.app.util.safeApiCall
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class BusinessListViewModel @Inject constructor(
    private val apiService: ApiService,
    private val sessionManager: SessionManager
) : ViewModel() {

    var businesses by mutableStateOf<List<Business>>(emptyList())
        private set
    var isLoading by mutableStateOf(false)
    var errorMessage by mutableStateOf<String?>(null)
    var currentBusinessId by mutableStateOf("")

    var showCreateDialog by mutableStateOf(false)
    var showInviteDialog by mutableStateOf(false)
    var inviteToken by mutableStateOf("")
    var isAcceptingInvite by mutableStateOf(false)
    var inviteError by mutableStateOf<String?>(null)
    var inviteMessage by mutableStateOf<String?>(null)
    var newBusinessName by mutableStateOf("")
    var newBusinessGstin by mutableStateOf("")
    var newBusinessAddress by mutableStateOf("")
    var newBusinessCity by mutableStateOf("")
    var newBusinessState by mutableStateOf("")
    var newBusinessPhone by mutableStateOf("")
    var isCreating by mutableStateOf(false)
    var createError by mutableStateOf<String?>(null)

    init {
        viewModelScope.launch {
            currentBusinessId = sessionManager.getBusinessId() ?: ""
            loadBusinesses()
        }
    }

    fun loadBusinesses() {
        isLoading = true
        errorMessage = null
        viewModelScope.launch {
            val result = safeApiCall {
                val response = apiService.getBusinesses()
                if (response.isSuccessful) response.body()?.data ?: emptyList()
                else throw Exception(response.errorBody()?.string() ?: "Failed to load businesses")
            }
            when (result) {
                is AppResult.Success -> businesses = result.data
                is AppResult.Error -> errorMessage = result.message
                is AppResult.Loading -> {}
            }
            isLoading = false
        }
    }

    fun switchBusiness(business: Business, onDone: () -> Unit) {
        viewModelScope.launch {
            sessionManager.switchBusiness(business.id, business.name)
            onDone()
        }
    }

    fun acceptInvite(onDone: () -> Unit) {
        if (inviteToken.isBlank()) {
            inviteError = "Enter the invite token"
            return
        }
        isAcceptingInvite = true
        inviteError = null
        viewModelScope.launch {
            val result = safeApiCall {
                val response = apiService.acceptInvite(inviteToken.trim())
                if (response.isSuccessful) response.body()?.data
                else throw Exception(response.errorBody()?.string() ?: "Failed to accept invite")
            }
            isAcceptingInvite = false
            when (result) {
                is AppResult.Success -> {
                    inviteMessage = result.data?.message ?: "Invite accepted!"
                    inviteToken = ""
                    showInviteDialog = false
                    loadBusinesses()
                    result.data?.business?.let { switchBusiness(Business(id = it.id, name = it.name), onDone) }
                }
                is AppResult.Error -> inviteError = result.message
                is AppResult.Loading -> {}
            }
        }
    }

    fun createBusiness(onDone: () -> Unit) {
        if (newBusinessName.isBlank()) {
            createError = "Business name is required"
            return
        }
        isCreating = true
        createError = null
        viewModelScope.launch {
            val request = CreateBusinessRequest(
                name = newBusinessName.trim(),
                phone = newBusinessPhone.trim().ifEmpty { "placeholder" },
                gstin = newBusinessGstin.trim().ifBlank { null },
                address = newBusinessAddress.trim().ifBlank { null },
                city = newBusinessCity.trim().ifBlank { null },
                state = newBusinessState.trim().ifBlank { null }
            )
            val result = safeApiCall {
                val response = apiService.createBusiness(request)
                if (response.isSuccessful) response.body()?.data
                else throw Exception(response.errorBody()?.string() ?: "Failed to create business")
            }
            isCreating = false
            when (result) {
                is AppResult.Success -> {
                    newBusinessName = ""
                    newBusinessGstin = ""
                    newBusinessAddress = ""
                    newBusinessCity = ""
                    newBusinessState = ""
                    newBusinessPhone = ""
                    showCreateDialog = false
                    loadBusinesses()
                    result.data?.let { switchBusiness(it, onDone) }
                }
                is AppResult.Error -> createError = result.message
                is AppResult.Loading -> {}
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BusinessListScreen(
    onBack: () -> Unit,
    onBusinessSwitched: () -> Unit,
    viewModel: BusinessListViewModel = hiltViewModel()
) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Switch Business") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    IconButton(onClick = { viewModel.showInviteDialog = true }) {
                        Icon(Icons.Default.ForwardToInbox, contentDescription = "Accept Invite")
                    }
                    IconButton(onClick = { viewModel.showCreateDialog = true }) {
                        Icon(Icons.Default.Add, contentDescription = "Add Business")
                    }
                }
            )
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
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.errorContainer),
                    modifier = Modifier.fillMaxWidth().padding(16.dp)
                ) {
                    Text(
                        text = error,
                        color = MaterialTheme.colorScheme.onErrorContainer,
                        modifier = Modifier.padding(16.dp)
                    )
                }
            }

            if (viewModel.businesses.isEmpty() && !viewModel.isLoading) {
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
                            "No businesses found",
                            style = MaterialTheme.typography.bodyLarge,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            "Tap + to create a business",
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
                    items(viewModel.businesses, key = { it.id }) { business ->
                        Card(
                            onClick = {
                                if (business.id != viewModel.currentBusinessId) {
                                    viewModel.switchBusiness(business) {
                                        onBusinessSwitched()
                                    }
                                }
                            },
                            modifier = Modifier.fillMaxWidth(),
                            colors = CardDefaults.cardColors(
                                containerColor = if (business.id == viewModel.currentBusinessId)
                                    MaterialTheme.colorScheme.primaryContainer
                                else MaterialTheme.colorScheme.surface
                            )
                        ) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(16.dp),
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
                                        text = business.name,
                                        style = MaterialTheme.typography.titleSmall,
                                        fontWeight = FontWeight.Bold
                                    )
                                    if (business.gstin != null) {
                                        Text(
                                            text = "GSTIN: ${business.gstin}",
                                            style = MaterialTheme.typography.bodySmall,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant
                                        )
                                    }
                                }
                                if (business.id == viewModel.currentBusinessId) {
                                    Icon(
                                        Icons.Default.CheckCircle,
                                        contentDescription = "Active",
                                        tint = MaterialTheme.colorScheme.primary
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }

        if (viewModel.showCreateDialog) {
            AlertDialog(
                onDismissRequest = { viewModel.showCreateDialog = false; viewModel.createError = null },
                title = { Text("Create Business") },
                text = {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        OutlinedTextField(
                            value = viewModel.newBusinessName,
                            onValueChange = { viewModel.newBusinessName = it },
                            label = { Text("Business Name *") },
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth()
                        )
                        OutlinedTextField(
                            value = viewModel.newBusinessGstin,
                            onValueChange = { viewModel.newBusinessGstin = it },
                            label = { Text("GSTIN") },
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth()
                        )
                        OutlinedTextField(
                            value = viewModel.newBusinessPhone,
                            onValueChange = { viewModel.newBusinessPhone = it },
                            label = { Text("Phone") },
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth()
                        )
                        OutlinedTextField(
                            value = viewModel.newBusinessAddress,
                            onValueChange = { viewModel.newBusinessAddress = it },
                            label = { Text("Address") },
                            maxLines = 2,
                            modifier = Modifier.fillMaxWidth()
                        )
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            OutlinedTextField(
                                value = viewModel.newBusinessCity,
                                onValueChange = { viewModel.newBusinessCity = it },
                                label = { Text("City") },
                                singleLine = true,
                                modifier = Modifier.weight(1f)
                            )
                            OutlinedTextField(
                                value = viewModel.newBusinessState,
                                onValueChange = { viewModel.newBusinessState = it },
                                label = { Text("State") },
                                singleLine = true,
                                modifier = Modifier.weight(1f)
                            )
                        }
                        viewModel.createError?.let {
                            Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
                        }
                    }
                },
                confirmButton = {
                    TextButton(
                        onClick = { viewModel.createBusiness { onBusinessSwitched() } },
                        enabled = !viewModel.isCreating
                    ) {
                        if (viewModel.isCreating) {
                            CircularProgressIndicator(modifier = Modifier.size(16.dp), strokeWidth = 2.dp)
                        } else {
                            Text("Create")
                        }
                    }
                },
                dismissButton = {
                    TextButton(onClick = { viewModel.showCreateDialog = false; viewModel.createError = null }) {
                        Text("Cancel")
                    }
                }
            )
        }

        if (viewModel.showInviteDialog) {
            AlertDialog(
                onDismissRequest = { viewModel.showInviteDialog = false; viewModel.inviteError = null; viewModel.inviteToken = "" },
                title = { Text("Accept Invite") },
                text = {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text(
                            "Enter the invite token you received via SMS or email",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        OutlinedTextField(
                            value = viewModel.inviteToken,
                            onValueChange = { viewModel.inviteToken = it },
                            label = { Text("Invite Token *") },
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth()
                        )
                        viewModel.inviteError?.let {
                            Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
                        }
                    }
                },
                confirmButton = {
                    TextButton(
                        onClick = { viewModel.acceptInvite { onBusinessSwitched() } },
                        enabled = !viewModel.isAcceptingInvite
                    ) {
                        if (viewModel.isAcceptingInvite) {
                            CircularProgressIndicator(modifier = Modifier.size(16.dp), strokeWidth = 2.dp)
                        } else {
                            Text("Accept")
                        }
                    }
                },
                dismissButton = {
                    TextButton(onClick = { viewModel.showInviteDialog = false; viewModel.inviteError = null; viewModel.inviteToken = "" }) {
                        Text("Cancel")
                    }
                }
            )
        }
    }
}

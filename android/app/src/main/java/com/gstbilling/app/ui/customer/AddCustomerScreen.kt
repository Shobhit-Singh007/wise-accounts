package com.gstbilling.app.ui.customer

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.gstbilling.app.data.remote.api.Customer
import com.gstbilling.app.data.repository.CustomerRepository
import com.gstbilling.app.util.AppResult
import com.gstbilling.app.util.SessionManager
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class AddCustomerViewModel @Inject constructor(
    private val customerRepository: CustomerRepository,
    private val sessionManager: SessionManager,
    private val apiService: com.gstbilling.app.data.remote.api.ApiService
) : ViewModel() {

    var name by mutableStateOf("")
    var phone by mutableStateOf("")
    var email by mutableStateOf("")
    var gstin by mutableStateOf("")
    var address by mutableStateOf("")
    var city by mutableStateOf("")
    var state by mutableStateOf("")
    var pincode by mutableStateOf("")
    var openingBalance by mutableStateOf("")
    var creditLimit by mutableStateOf("")
    var isLoading by mutableStateOf(false)
    var errorMessage by mutableStateOf<String?>(null)
    var isEditMode by mutableStateOf(false)
    var isLookupLoading by mutableStateOf(false)
    private var customerId: String = ""

    fun lookupGstin(gstin: String) {
        if (gstin.length < 15) return
        isLookupLoading = true
        viewModelScope.launch {
            try {
                val businessId = sessionManager.getBusinessId() ?: ""
                val response = apiService.lookupGstin(businessId.toString(), gstin)
                if (response.isSuccessful) {
                    val data = response.body()?.data
                    if (data != null && data["error"] == null) {
                        if (name.isBlank()) name = data["tradeName"] as? String ?: data["name"] as? String ?: ""
                        if (address.isBlank()) address = data["address"] as? String ?: ""
                        if (city.isBlank()) city = data["city"] as? String ?: ""
                        if (state.isBlank()) state = data["state"] as? String ?: ""
                        if (pincode.isBlank()) pincode = data["pincode"] as? String ?: ""
                    }
                }
            } catch (_: Exception) { }
            isLookupLoading = false
        }
    }

    fun loadCustomer(id: String) {
        viewModelScope.launch {
            val entity = customerRepository.getCustomerById(id.hashCode().toLong())
            if (entity != null) {
                customerId = entity.id.toString()
                name = entity.name
                phone = entity.phone ?: ""
                email = entity.email ?: ""
                gstin = entity.gstin ?: ""
                address = entity.address ?: ""
                city = entity.city ?: ""
                state = entity.state ?: ""
                pincode = entity.pincode ?: ""
                openingBalance = entity.openingBalance.toString()
                creditLimit = entity.creditLimit.toString()
                isEditMode = true
            }
        }
    }

    fun save(onSuccess: () -> Unit) {
        if (name.isBlank()) {
            errorMessage = "Customer name is required"
            return
        }
        isLoading = true
        errorMessage = null
        viewModelScope.launch {
            val businessId = sessionManager.getBusinessId() ?: ""
            val customer = Customer(
                id = if (isEditMode) customerId else "",
                name = name,
                phone = phone.ifBlank { null },
                email = email.ifBlank { null },
                gstin = gstin.ifBlank { null },
                address = address.ifBlank { null },
                city = city.ifBlank { null },
                state = state.ifBlank { null },
                pincode = pincode.ifBlank { null },
                openingBalance = openingBalance.toDoubleOrNull() ?: 0.0,
                creditLimit = creditLimit.toDoubleOrNull() ?: 0.0,
                businessId = businessId
            )
            val result = if (isEditMode) {
                customerRepository.updateCustomer(customerId, customer)
            } else {
                customerRepository.createCustomer(customer)
            }
            isLoading = false
            when (result) {
                is AppResult.Success -> onSuccess()
                is AppResult.Error -> errorMessage = result.message
                is AppResult.Loading -> { }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AddCustomerScreen(
    customerId: String?,
    onBack: () -> Unit,
    viewModel: AddCustomerViewModel = hiltViewModel()
) {
    LaunchedEffect(customerId) {
        if (customerId != null) {
            viewModel.loadCustomer(customerId)
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(if (viewModel.isEditMode) "Edit Customer" else "Add Customer") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(horizontal = 16.dp)
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Spacer(modifier = Modifier.height(4.dp))

            OutlinedTextField(
                value = viewModel.name,
                onValueChange = { viewModel.name = it },
                label = { Text("Customer Name *") },
                leadingIcon = { Icon(Icons.Default.Person, contentDescription = null) },
                singleLine = true,
                modifier = Modifier.fillMaxWidth()
            )

            OutlinedTextField(
                value = viewModel.phone,
                onValueChange = { viewModel.phone = it },
                label = { Text("Phone Number") },
                leadingIcon = { Icon(Icons.Default.Phone, contentDescription = null) },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone, imeAction = ImeAction.Next),
                singleLine = true,
                modifier = Modifier.fillMaxWidth()
            )

            OutlinedTextField(
                value = viewModel.email,
                onValueChange = { viewModel.email = it },
                label = { Text("Email") },
                leadingIcon = { Icon(Icons.Default.Email, contentDescription = null) },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email, imeAction = ImeAction.Next),
                singleLine = true,
                modifier = Modifier.fillMaxWidth()
            )

            OutlinedTextField(
                value = viewModel.gstin,
                onValueChange = { viewModel.gstin = it.uppercase() },
                label = { Text("GSTIN") },
                leadingIcon = { Icon(Icons.Default.Description, contentDescription = null) },
                trailingIcon = {
                    IconButton(
                        onClick = { viewModel.lookupGstin(viewModel.gstin) },
                        enabled = viewModel.gstin.length >= 15 && !viewModel.isLookupLoading
                    ) {
                        if (viewModel.isLookupLoading) {
                            CircularProgressIndicator(modifier = Modifier.size(20.dp), strokeWidth = 2.dp)
                        } else {
                            Icon(Icons.Default.Search, contentDescription = "Lookup GSTIN")
                        }
                    }
                },
                singleLine = true,
                modifier = Modifier.fillMaxWidth()
            )

            OutlinedTextField(
                value = viewModel.address,
                onValueChange = { viewModel.address = it },
                label = { Text("Address") },
                leadingIcon = { Icon(Icons.Default.Home, contentDescription = null) },
                minLines = 2,
                modifier = Modifier.fillMaxWidth()
            )

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                OutlinedTextField(
                    value = viewModel.city,
                    onValueChange = { viewModel.city = it },
                    label = { Text("City") },
                    modifier = Modifier.weight(1f),
                    singleLine = true
                )
                OutlinedTextField(
                    value = viewModel.state,
                    onValueChange = { viewModel.state = it },
                    label = { Text("State") },
                    modifier = Modifier.weight(1f),
                    singleLine = true
                )
            }

            OutlinedTextField(
                value = viewModel.pincode,
                onValueChange = { viewModel.pincode = it },
                label = { Text("Pincode") },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number, imeAction = ImeAction.Next),
                singleLine = true,
                modifier = Modifier.fillMaxWidth()
            )

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                OutlinedTextField(
                    value = viewModel.openingBalance,
                    onValueChange = { viewModel.openingBalance = it },
                    label = { Text("Opening Balance") },
                    leadingIcon = { Text("₹", style = MaterialTheme.typography.bodyLarge) },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                    modifier = Modifier.weight(1f),
                    singleLine = true
                )
                OutlinedTextField(
                    value = viewModel.creditLimit,
                    onValueChange = { viewModel.creditLimit = it },
                    label = { Text("Credit Limit") },
                    leadingIcon = { Text("₹", style = MaterialTheme.typography.bodyLarge) },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                    modifier = Modifier.weight(1f),
                    singleLine = true
                )
            }

            viewModel.errorMessage?.let { error ->
                Text(
                    text = error,
                    color = MaterialTheme.colorScheme.error,
                    style = MaterialTheme.typography.bodySmall
                )
            }

            Spacer(modifier = Modifier.height(8.dp))

            Button(
                onClick = { viewModel.save(onBack) },
                enabled = !viewModel.isLoading,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(50.dp)
            ) {
                if (viewModel.isLoading) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(24.dp),
                        color = MaterialTheme.colorScheme.onPrimary,
                        strokeWidth = 2.dp
                    )
                } else {
                    Text(if (viewModel.isEditMode) "Update Customer" else "Save Customer")
                }
            }

            Spacer(modifier = Modifier.height(32.dp))
        }
    }
}

package com.gstbilling.app.ui.staff

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.gstbilling.app.data.remote.api.InviteStaffRequest
import com.gstbilling.app.data.remote.api.StaffInvite
import com.gstbilling.app.data.remote.api.StaffMember
import com.gstbilling.app.data.remote.api.UpdatePermissionsRequest
import com.gstbilling.app.data.repository.StaffRepository
import com.gstbilling.app.util.AppResult
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import javax.inject.Inject

private val ROLE_COLORS = mapOf(
    "OWNER" to Color(0xFF1565C0),
    "ADMIN" to Color(0xFF7B1FA2),
    "MANAGER" to Color(0xFF2E7D32),
    "ACCOUNTANT" to Color(0xFFE65100),
    "SALES" to Color(0xFF00838F),
    "BUSINESS_VIEWER" to Color(0xFF546E7A),
    "BUSINESS_EDITOR" to Color(0xFF546E7A)
)

private val ROLE_LABELS = mapOf(
    "OWNER" to "Owner",
    "ADMIN" to "Admin",
    "MANAGER" to "Manager",
    "ACCOUNTANT" to "Accountant",
    "SALES" to "Sales",
    "BUSINESS_VIEWER" to "Viewer",
    "BUSINESS_EDITOR" to "Editor"
)

private val ROLE_PRESETS = listOf(
    "admin" to "Admin",
    "manager" to "Manager",
    "accountant" to "Accountant",
    "sales" to "Sales",
    "viewer" to "Viewer"
)

@HiltViewModel
class StaffViewModel @Inject constructor(
    private val staffRepository: StaffRepository
) : ViewModel() {

    var staffMembers by mutableStateOf<List<StaffMember>>(emptyList())
    var pendingInvites by mutableStateOf<List<StaffInvite>>(emptyList())
    var isLoading by mutableStateOf(false)
    var errorMessage by mutableStateOf<String?>(null)
    var successMessage by mutableStateOf<String?>(null)

    init {
        loadStaff()
    }

    fun loadStaff() {
        viewModelScope.launch {
            isLoading = true
            errorMessage = null
            when (val result = staffRepository.getStaff()) {
                is AppResult.Success -> {
                    staffMembers = result.data
                    isLoading = false
                }
                is AppResult.Error -> {
                    errorMessage = result.message
                    isLoading = false
                }
                is AppResult.Loading -> {}
            }
            when (val result = staffRepository.getStaffInvites()) {
                is AppResult.Success -> pendingInvites = result.data
                else -> {}
            }
        }
    }

    fun inviteStaff(name: String, phone: String, email: String?, preset: String?) {
        viewModelScope.launch {
            isLoading = true
            errorMessage = null
            val request = InviteStaffRequest(
                phone = phone,
                email = email?.ifBlank { null },
                name = name.ifBlank { null },
                rolePreset = preset
            )
            when (val result = staffRepository.inviteStaff(request)) {
                is AppResult.Success -> {
                    successMessage = "Invitation sent to $phone"
                    isLoading = false
                    loadStaff()
                }
                is AppResult.Error -> {
                    errorMessage = result.message
                    isLoading = false
                }
                is AppResult.Loading -> {}
            }
        }
    }

    fun removeStaff(userId: String, name: String) {
        viewModelScope.launch {
            isLoading = true
            when (val result = staffRepository.removeStaff(userId)) {
                is AppResult.Success -> {
                    successMessage = "$name removed from staff"
                    isLoading = false
                    loadStaff()
                }
                is AppResult.Error -> {
                    errorMessage = result.message
                    isLoading = false
                }
                is AppResult.Loading -> {}
            }
        }
    }

    fun cancelInvite(inviteId: String, phone: String) {
        viewModelScope.launch {
            when (val result = staffRepository.cancelInvite(inviteId)) {
                is AppResult.Success -> {
                    successMessage = "Invite to $phone cancelled"
                    loadStaff()
                }
                is AppResult.Error -> {
                    errorMessage = result.message
                }
                is AppResult.Loading -> {}
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun StaffScreen(
    onBack: () -> Unit,
    onEditPermissions: (userId: String, currentName: String) -> Unit,
    viewModel: StaffViewModel = hiltViewModel()
) {
    var selectedTab by remember { mutableIntStateOf(0) }
    var showInviteDialog by remember { mutableStateOf(false) }
    var showRemoveDialog by remember { mutableStateOf<Pair<String, String>?>(null) }

    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(viewModel.successMessage) {
        viewModel.successMessage?.let {
            snackbarHostState.showSnackbar(it)
            viewModel.successMessage = null
        }
    }

    LaunchedEffect(viewModel.errorMessage) {
        viewModel.errorMessage?.let {
            snackbarHostState.showSnackbar(it)
            viewModel.errorMessage = null
        }
    }

    if (showInviteDialog) {
        InviteStaffDialog(
            onDismiss = { showInviteDialog = false },
            onInvite = { name, phone, email, preset ->
                showInviteDialog = false
                viewModel.inviteStaff(name, phone, email, preset)
            }
        )
    }

    showRemoveDialog?.let { (userId, name) ->
        AlertDialog(
            onDismissRequest = { showRemoveDialog = null },
            title = { Text("Remove Staff") },
            text = { Text("Are you sure you want to remove $name from your staff?") },
            confirmButton = {
                TextButton(
                    onClick = {
                        showRemoveDialog = null
                        viewModel.removeStaff(userId, name)
                    },
                    colors = ButtonDefaults.textButtonColors(contentColor = MaterialTheme.colorScheme.error)
                ) {
                    Text("Remove")
                }
            },
            dismissButton = {
                TextButton(onClick = { showRemoveDialog = null }) {
                    Text("Cancel")
                }
            }
        )
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Staff Management") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    if (selectedTab == 0) {
                        IconButton(onClick = { showInviteDialog = true }) {
                            Icon(Icons.Default.PersonAdd, contentDescription = "Invite Staff")
                        }
                    }
                }
            )
        },
        snackbarHost = { SnackbarHost(snackbarHostState) },
        floatingActionButton = {
            if (selectedTab == 0) {
                FloatingActionButton(onClick = { showInviteDialog = true }) {
                    Icon(Icons.Default.PersonAdd, contentDescription = "Invite Staff")
                }
            }
        }
    ) { padding ->
        Column(modifier = Modifier.padding(padding)) {
            TabRow(selectedTabIndex = selectedTab) {
                Tab(
                    selected = selectedTab == 0,
                    onClick = { selectedTab = 0 },
                    text = { Text("Active Staff (${viewModel.staffMembers.size})") }
                )
                Tab(
                    selected = selectedTab == 1,
                    onClick = { selectedTab = 1 },
                    text = { Text("Pending Invites (${viewModel.pendingInvites.size})") }
                )
            }

            if (viewModel.isLoading && viewModel.staffMembers.isEmpty()) {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator()
                }
            } else {
                when (selectedTab) {
                    0 -> StaffList(
                        staff = viewModel.staffMembers,
                        onEditPermissions = onEditPermissions,
                        onRemove = { userId, name -> showRemoveDialog = userId to name }
                    )
                    1 -> PendingInvitesList(
                        invites = viewModel.pendingInvites,
                        onCancel = { inviteId, phone -> viewModel.cancelInvite(inviteId, phone) }
                    )
                }
            }
        }
    }
}

@Composable
private fun StaffList(
    staff: List<StaffMember>,
    onEditPermissions: (userId: String, currentName: String) -> Unit,
    onRemove: (userId: String, name: String) -> Unit
) {
    if (staff.isEmpty()) {
        Box(
            modifier = Modifier.fillMaxSize(),
            contentAlignment = Alignment.Center
        ) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Icon(
                    Icons.Default.Groups,
                    contentDescription = null,
                    modifier = Modifier.size(64.dp),
                    tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.4f)
                )
                Spacer(modifier = Modifier.height(16.dp))
                Text(
                    "No staff members yet",
                    style = MaterialTheme.typography.titleMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    "Invite your first team member",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.6f)
                )
            }
        }
        return
    }

    LazyColumn(
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        items(staff, key = { it.userId }) { member ->
            StaffCard(
                member = member,
                onEditPermissions = { onEditPermissions(member.userId, member.name) },
                onRemove = if (member.role != "OWNER") {
                    { onRemove(member.userId, member.name) }
                } else null
            )
        }
    }
}

@Composable
private fun StaffCard(
    member: StaffMember,
    onEditPermissions: () -> Unit,
    onRemove: (() -> Unit)?
) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Surface(
                    modifier = Modifier.size(44.dp),
                    shape = MaterialTheme.shapes.extraLarge,
                    color = MaterialTheme.colorScheme.primaryContainer
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Text(
                            text = member.name.take(1).uppercase(),
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onPrimaryContainer
                        )
                    }
                }

                Spacer(modifier = Modifier.width(12.dp))

                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = member.name.ifBlank { "Unknown" },
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = member.phone,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }

                Surface(
                    shape = MaterialTheme.shapes.small,
                    color = ROLE_COLORS[member.role]?.copy(alpha = 0.12f)
                        ?: MaterialTheme.colorScheme.surfaceVariant
                ) {
                    Text(
                        text = ROLE_LABELS[member.role] ?: member.role,
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                        style = MaterialTheme.typography.labelSmall,
                        fontWeight = FontWeight.Bold,
                        color = ROLE_COLORS[member.role] ?: MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            if (member.permissions.isNotEmpty() && member.role != "OWNER") {
                Spacer(modifier = Modifier.height(10.dp))
                Text(
                    text = "Permissions",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    fontWeight = FontWeight.Bold
                )
                Spacer(modifier = Modifier.height(4.dp))
                FlowRow(
                    horizontalArrangement = Arrangement.spacedBy(4.dp),
                    verticalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    member.permissions.take(5).forEach { perm ->
                        Surface(
                            shape = MaterialTheme.shapes.extraSmall,
                            color = MaterialTheme.colorScheme.secondaryContainer
                        ) {
                            Text(
                                text = perm,
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSecondaryContainer
                            )
                        }
                    }
                    if (member.permissions.size > 5) {
                        Surface(
                            shape = MaterialTheme.shapes.extraSmall,
                            color = MaterialTheme.colorScheme.tertiaryContainer
                        ) {
                            Text(
                                text = "+${member.permissions.size - 5} more",
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onTertiaryContainer
                            )
                        }
                    }
                }
            }

            if (onRemove != null || onEditPermissions != Unit) {
                Spacer(modifier = Modifier.height(8.dp))
                Row(modifier = Modifier.fillMaxWidth()) {
                    TextButton(onClick = onEditPermissions) {
                        Icon(Icons.Default.Edit, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Permissions")
                    }
                    Spacer(modifier = Modifier.weight(1f))
                    if (onRemove != null) {
                        TextButton(
                            onClick = onRemove,
                            colors = ButtonDefaults.textButtonColors(contentColor = MaterialTheme.colorScheme.error)
                        ) {
                            Icon(Icons.Default.RemoveCircleOutline, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("Remove")
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun PendingInvitesList(
    invites: List<StaffInvite>,
    onCancel: (inviteId: String, phone: String) -> Unit
) {
    if (invites.isEmpty()) {
        Box(
            modifier = Modifier.fillMaxSize(),
            contentAlignment = Alignment.Center
        ) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Icon(
                    Icons.Default.MailOutline,
                    contentDescription = null,
                    modifier = Modifier.size(64.dp),
                    tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.4f)
                )
                Spacer(modifier = Modifier.height(16.dp))
                Text(
                    "No pending invites",
                    style = MaterialTheme.typography.titleMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    "Invitations will appear here until accepted",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.6f)
                )
            }
        }
        return
    }

    LazyColumn(
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        items(invites, key = { it.id }) { invite ->
            InviteCard(invite = invite, onCancel = { onCancel(invite.id, invite.phone) })
        }
    }
}

@Composable
private fun InviteCard(invite: StaffInvite, onCancel: () -> Unit) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Surface(
                modifier = Modifier.size(44.dp),
                shape = MaterialTheme.shapes.extraLarge,
                color = MaterialTheme.colorScheme.tertiaryContainer
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(
                        Icons.Default.MailOutline,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.onTertiaryContainer
                    )
                }
            }

            Spacer(modifier = Modifier.width(12.dp))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = invite.name ?: invite.phone,
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = invite.phone,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Text(
                    text = "Expires ${invite.expiresAt.take(10)}",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.6f)
                )
            }

            Surface(
                shape = MaterialTheme.shapes.small,
                color = MaterialTheme.colorScheme.errorContainer
            ) {
                Text(
                    text = ROLE_LABELS[invite.role] ?: invite.role,
                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                    style = MaterialTheme.typography.labelSmall,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onErrorContainer
                )
            }

            Spacer(modifier = Modifier.width(8.dp))

            IconButton(onClick = onCancel) {
                Icon(
                    Icons.Default.Close,
                    contentDescription = "Cancel invite",
                    tint = MaterialTheme.colorScheme.error,
                    modifier = Modifier.size(20.dp)
                )
            }
        }
    }
}

@Composable
private fun InviteStaffDialog(
    onDismiss: () -> Unit,
    onInvite: (name: String, phone: String, email: String?, preset: String?) -> Unit
) {
    var name by remember { mutableStateOf("") }
    var phone by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var selectedPreset by remember { mutableStateOf<String?>("viewer") }
    var phoneError by remember { mutableStateOf<String?>(null) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Default.PersonAdd, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                Spacer(modifier = Modifier.width(8.dp))
                Text("Invite Staff")
            }
        },
        text = {
            Column(
                modifier = Modifier.verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = { Text("Name") },
                    leadingIcon = { Icon(Icons.Default.Person, contentDescription = null) },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )

                OutlinedTextField(
                    value = phone,
                    onValueChange = { phone = it.filter { c -> c.isDigit() }; phoneError = null },
                    label = { Text("Phone *") },
                    leadingIcon = { Icon(Icons.Default.Phone, contentDescription = null) },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    isError = phoneError != null,
                    supportingText = phoneError?.let { { Text(it) } },
                    keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = KeyboardType.Phone)
                )

                OutlinedTextField(
                    value = email,
                    onValueChange = { email = it },
                    label = { Text("Email (optional)") },
                    leadingIcon = { Icon(Icons.Default.Email, contentDescription = null) },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = KeyboardType.Email)
                )

                Text(
                    "Role Preset",
                    style = MaterialTheme.typography.labelLarge,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.primary
                )

                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    ROLE_PRESETS.forEach { (key, label) ->
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .selectable(
                                    selected = selectedPreset == key,
                                    onClick = { selectedPreset = key }
                                )
                                .padding(vertical = 4.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            RadioButton(
                                selected = selectedPreset == key,
                                onClick = null
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(label, style = MaterialTheme.typography.bodyMedium)
                        }
                    }
                }
            }
        },
        confirmButton = {
            TextButton(
                onClick = {
                    if (phone.isBlank()) {
                        phoneError = "Phone is required"
                        return@TextButton
                    }
                    onInvite(name, phone, email, selectedPreset)
                }
            ) {
                Text("Send Invite")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Cancel")
            }
        }
    )
}

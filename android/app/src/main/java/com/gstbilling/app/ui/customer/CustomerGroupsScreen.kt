package com.gstbilling.app.ui.customer

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

data class CustomerGroup(
    val id: String,
    val name: String,
    val customerCount: Int,
    val description: String = "",
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CustomerGroupsScreen(
    onBack: () -> Unit,
    onGroupClick: (String) -> Unit
) {
    var groups by remember { mutableStateOf(listOf<CustomerGroup>()) }
    var showAddDialog by remember { mutableStateOf(false) }
    var editingGroup by remember { mutableStateOf<CustomerGroup?>(null) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Customer Groups") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, "Back")
                    }
                }
            )
        },
        floatingActionButton = {
            FloatingActionButton(onClick = { showAddDialog = true }) {
                Icon(Icons.Default.Add, "Add Group")
            }
        }
    ) { padding ->
        if (groups.isEmpty()) {
            Box(
                modifier = Modifier.fillMaxSize().padding(padding),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(Icons.Default.Groups, null, modifier = Modifier.size(64.dp), tint = MaterialTheme.colorScheme.outline)
                    Spacer(modifier = Modifier.height(8.dp))
                    Text("No customer groups", style = MaterialTheme.typography.bodyLarge, color = MaterialTheme.colorScheme.outline)
                    Spacer(modifier = Modifier.height(8.dp))
                    FilledTonalButton(onClick = { showAddDialog = true }) {
                        Text("Create Group")
                    }
                }
            }
        } else {
            LazyColumn(
                modifier = Modifier.fillMaxSize().padding(padding),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(groups) { group ->
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        onClick = { onGroupClick(group.id) }
                    ) {
                        Row(
                            modifier = Modifier.padding(16.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Surface(
                                modifier = Modifier.size(40.dp),
                                shape = MaterialTheme.shapes.small,
                                color = MaterialTheme.colorScheme.primaryContainer
                            ) {
                                Box(contentAlignment = Alignment.Center) {
                                    Text(
                                        group.name.first().toString(),
                                        style = MaterialTheme.typography.titleMedium,
                                        color = MaterialTheme.colorScheme.onPrimaryContainer
                                    )
                                }
                            }
                            Spacer(modifier = Modifier.width(12.dp))
                            Column(modifier = Modifier.weight(1f)) {
                                Text(group.name, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                                Text("${group.customerCount} customers", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                if (group.description.isNotEmpty()) {
                                    Text(group.description, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.outline)
                                }
                            }
                            IconButton(onClick = { editingGroup = group }) {
                                Icon(Icons.Default.Edit, "Edit", tint = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                        }
                    }
                }
            }
        }
    }

    if (showAddDialog) {
        GroupDialog(
            group = null,
            onDismiss = { showAddDialog = false },
            onSave = { name, desc ->
                groups = groups + CustomerGroup(
                    id = System.currentTimeMillis().toString(),
                    name = name,
                    customerCount = 0,
                    description = desc
                )
                showAddDialog = false
            }
        )
    }

    editingGroup?.let { group ->
        GroupDialog(
            group = group,
            onDismiss = { editingGroup = null },
            onSave = { name, desc ->
                groups = groups.map { if (it.id == group.id) it.copy(name = name, description = desc) else it }
                editingGroup = null
            }
        )
    }
}

@Composable
private fun GroupDialog(
    group: CustomerGroup?,
    onDismiss: () -> Unit,
    onSave: (String, String) -> Unit
) {
    var name by remember { mutableStateOf(group?.name ?: "") }
    var description by remember { mutableStateOf(group?.description ?: "") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(if (group == null) "Create Group" else "Edit Group") },
        text = {
            Column {
                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = { Text("Group Name") },
                    modifier = Modifier.fillMaxWidth()
                )
                Spacer(modifier = Modifier.height(8.dp))
                OutlinedTextField(
                    value = description,
                    onValueChange = { description = it },
                    label = { Text("Description (optional)") },
                    modifier = Modifier.fillMaxWidth()
                )
            }
        },
        confirmButton = {
            TextButton(
                onClick = { onSave(name, description) },
                enabled = name.isNotBlank()
            ) { Text("Save") }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Cancel") }
        }
    )
}

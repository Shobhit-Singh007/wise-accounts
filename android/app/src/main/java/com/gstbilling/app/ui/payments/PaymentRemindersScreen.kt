package com.gstbilling.app.ui.payments

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp

data class PaymentReminder(
    val id: String,
    val customerName: String,
    val invoiceNo: String,
    val amount: Double,
    val daysOverdue: Int,
    val lastReminderDate: String?,
    val phone: String,
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PaymentRemindersScreen(
    onBack: () -> Unit,
    onSendReminder: (PaymentReminder) -> Unit
) {
    var reminders by remember { mutableStateOf(listOf<PaymentReminder>()) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Payment Reminders") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, "Back")
                    }
                },
                actions = {
                    TextButton(onClick = { /* Send all */ }) {
                        Text("Send All", color = MaterialTheme.colorScheme.primary)
                    }
                }
            )
        }
    ) { padding ->
        if (reminders.isEmpty()) {
            Box(
                modifier = Modifier.fillMaxSize().padding(padding),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(Icons.Default.Notifications, null, modifier = Modifier.size(64.dp), tint = MaterialTheme.colorScheme.outline)
                    Spacer(modifier = Modifier.height(8.dp))
                    Text("No pending reminders", style = MaterialTheme.typography.bodyLarge, color = MaterialTheme.colorScheme.outline)
                }
            }
        } else {
            LazyColumn(
                modifier = Modifier.fillMaxSize().padding(padding),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(reminders) { reminder ->
                    ReminderCard(reminder, onSendReminder)
                }
            }
        }
    }
}

@Composable
private fun ReminderCard(
    reminder: PaymentReminder,
    onSendReminder: (PaymentReminder) -> Unit
) {
    val urgencyColor = when {
        reminder.daysOverdue > 30 -> Color(0xFFC62828)
        reminder.daysOverdue > 7 -> Color(0xFFF57F17)
        else -> Color(0xFF1565C0)
    }

    Card(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(reminder.customerName, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    Text("Invoice: ${reminder.invoiceNo}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                Surface(
                    color = urgencyColor,
                    shape = MaterialTheme.shapes.small
                ) {
                    Text(
                        "${reminder.daysOverdue}d overdue",
                        color = Color.White,
                        style = MaterialTheme.typography.labelSmall,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp)
                    )
                }
            }
            Spacer(modifier = Modifier.height(8.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    "₹${String.format("%.2f", reminder.amount)}",
                    style = MaterialTheme.typography.titleLarge,
                    color = urgencyColor,
                    fontWeight = FontWeight.Bold
                )
                Row {
                    if (reminder.lastReminderDate != null) {
                        Text(
                            "Last: ${reminder.lastReminderDate}",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.outline,
                            modifier = Modifier.padding(end = 8.dp)
                        )
                    }
                    FilledTonalButton(onClick = { onSendReminder(reminder) }) {
                        Icon(Icons.Default.Send, null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Remind")
                    }
                }
            }
        }
    }
}

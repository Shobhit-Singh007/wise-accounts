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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import java.text.SimpleDateFormat
import java.util.*

data class BatchInfo(
    val id: String,
    val productName: String,
    val batchNumber: String,
    val quantity: Int,
    val manufacturingDate: String?,
    val expiryDate: String?,
    val costPrice: Double,
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BatchExpiryScreen(
    onBack: () -> Unit
) {
    var batches by remember { mutableStateOf(listOf<BatchInfo>()) }
    var showExpiringOnly by remember { mutableStateOf(false) }

    val expiringBatches = batches.filter { batch ->
        batch.expiryDate?.let {
            try {
                val sdf = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
                val expiry = sdf.parse(it)
                val daysLeft = ((expiry?.time ?: 0L) - System.currentTimeMillis()) / (1000 * 60 * 60 * 24)
                daysLeft in 0..30
            } catch (e: Exception) { false }
        } ?: false
    }

    val displayedBatches = if (showExpiringOnly) expiringBatches else batches

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Batch & Expiry Tracking") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, "Back")
                    }
                },
                actions = {
                    FilterChip(
                        selected = showExpiringOnly,
                        onClick = { showExpiringOnly = !showExpiringOnly },
                        label = { Text("Expiring Soon") },
                        leadingIcon = if (showExpiringOnly) {
                            { Icon(Icons.Default.Check, null, modifier = Modifier.size(18.dp)) }
                        } else null
                    )
                }
            )
        }
    ) { padding ->
        if (displayedBatches.isEmpty()) {
            Box(
                modifier = Modifier.fillMaxSize().padding(padding),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(Icons.Default.Inventory2, null, modifier = Modifier.size(64.dp), tint = MaterialTheme.colorScheme.outline)
                    Spacer(modifier = Modifier.height(8.dp))
                    Text("No batches found", style = MaterialTheme.typography.bodyLarge, color = MaterialTheme.colorScheme.outline)
                }
            }
        } else {
            LazyColumn(
                modifier = Modifier.fillMaxSize().padding(padding),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(displayedBatches) { batch ->
                    BatchCard(batch)
                }
            }
        }
    }
}

@Composable
private fun BatchCard(batch: BatchInfo) {
    val isExpiringSoon = batch.expiryDate?.let {
        try {
            val sdf = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
            val expiry = sdf.parse(it)
            val daysLeft = ((expiry?.time ?: 0L) - System.currentTimeMillis()) / (1000 * 60 * 60 * 24)
            daysLeft in 0..30
        } catch (e: Exception) { false }
    } ?: false

    val isExpired = batch.expiryDate?.let {
        try {
            val sdf = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
            val expiry = sdf.parse(it)
            (expiry?.time ?: 0L) < System.currentTimeMillis()
        } catch (e: Exception) { false }
    } ?: false

    val cardColor = when {
        isExpired -> MaterialTheme.colorScheme.errorContainer.copy(alpha = 0.3f)
        isExpiringSoon -> Color(0xFFFFF3E0)
        else -> MaterialTheme.colorScheme.surfaceVariant
    }

    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = cardColor)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(batch.productName, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                if (isExpired || isExpiringSoon) {
                    Surface(
                        color = if (isExpired) MaterialTheme.colorScheme.error else Color(0xFFF57F17),
                        shape = MaterialTheme.shapes.small
                    ) {
                        Text(
                            if (isExpired) "EXPIRED" else "EXPIRING SOON",
                            color = Color.White,
                            style = MaterialTheme.typography.labelSmall,
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp)
                        )
                    }
                }
            }
            Spacer(modifier = Modifier.height(4.dp))
            Text("Batch: ${batch.batchNumber}", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text("Qty: ${batch.quantity}", style = MaterialTheme.typography.bodyMedium)
                Text("Cost: ₹${String.format("%.2f", batch.costPrice)}", style = MaterialTheme.typography.bodyMedium)
            }
            if (batch.expiryDate != null) {
                Text("Expiry: $batch.expiryDate", style = MaterialTheme.typography.bodySmall, color = if (isExpired) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurfaceVariant)
            }
            if (batch.manufacturingDate != null) {
                Text("Mfg: $batch.manufacturingDate", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
    }
}

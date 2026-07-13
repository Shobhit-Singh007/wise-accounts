package com.gstbilling.app.ui.notifications

import androidx.compose.animation.animateColorAsState
import androidx.compose.foundation.background
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
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.gstbilling.app.data.remote.api.ApiService
import com.gstbilling.app.data.remote.api.AppNotification
import com.gstbilling.app.util.AppResult
import com.gstbilling.app.util.SessionManager
import com.gstbilling.app.util.safeApiCall
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.*
import java.util.concurrent.TimeUnit
import javax.inject.Inject

@HiltViewModel
class NotificationsViewModel @Inject constructor(
    private val apiService: ApiService,
    private val sessionManager: SessionManager
) : ViewModel() {

    var notifications by mutableStateOf<List<AppNotification>>(emptyList())
    var isLoading by mutableStateOf(false)
    var isRefreshing by mutableStateOf(false)
    var errorMessage by mutableStateOf<String?>(null)
    var unreadCount by mutableStateOf(0)

    init {
        loadNotifications()
    }

    fun loadNotifications() {
        viewModelScope.launch {
            isLoading = true
            errorMessage = null
            val businessId = sessionManager.getBusinessId()
            if (businessId != null) {
                when (val result = safeApiCall {
                    apiService.getNotifications(businessId).body()?.data
                }) {
                    is AppResult.Success -> {
                        notifications = result.data ?: emptyList()
                        unreadCount = notifications.count { !it.is_read }
                    }
                    is AppResult.Error -> {
                        errorMessage = result.message
                    }
                    is AppResult.Loading -> {}
                }
            }
            isLoading = false
            isRefreshing = false
        }
    }

    fun refresh() {
        isRefreshing = true
        loadNotifications()
    }

    fun markAsRead(notification: AppNotification) {
        if (notification.is_read) return
        viewModelScope.launch {
            val businessId = sessionManager.getBusinessId() ?: return@launch
            when (val result = safeApiCall { apiService.markNotificationRead(notification.id) }) {
                is AppResult.Success -> {
                    notifications = notifications.map {
                        if (it.id == notification.id) it.copy(is_read = true) else it
                    }
                    unreadCount = notifications.count { !it.is_read }
                }
                is AppResult.Error -> {}
                is AppResult.Loading -> {}
            }
        }
    }

    fun markAllAsRead() {
        viewModelScope.launch {
            val businessId = sessionManager.getBusinessId() ?: return@launch
            when (val result = safeApiCall { apiService.markAllNotificationsRead(businessId) }) {
                is AppResult.Success -> {
                    notifications = notifications.map { it.copy(is_read = true) }
                    unreadCount = 0
                }
                is AppResult.Error -> {}
                is AppResult.Loading -> {}
            }
        }
    }

    fun deleteNotification(notification: AppNotification) {
        viewModelScope.launch {
            when (val result = safeApiCall { apiService.deleteNotification(notification.id) }) {
                is AppResult.Success -> {
                    notifications = notifications.filter { it.id != notification.id }
                    unreadCount = notifications.count { !it.is_read }
                }
                is AppResult.Error -> {}
                is AppResult.Loading -> {}
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NotificationsScreen(
    onBack: () -> Unit,
    viewModel: NotificationsViewModel = hiltViewModel()
) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text("Notifications")
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    if (viewModel.unreadCount > 0) {
                        TextButton(onClick = { viewModel.markAllAsRead() }) {
                            Text(
                                "Mark all read",
                                style = MaterialTheme.typography.labelMedium,
                                color = MaterialTheme.colorScheme.primary
                            )
                        }
                    }
                    IconButton(onClick = { viewModel.refresh() }) {
                        Icon(Icons.Default.Refresh, contentDescription = "Refresh")
                    }
                }
            )
        }
    ) { padding ->
        when {
            viewModel.isLoading && !viewModel.isRefreshing -> {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator()
                }
            }
            viewModel.errorMessage != null -> {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(
                            Icons.Default.ErrorOutline,
                            contentDescription = null,
                            modifier = Modifier.size(64.dp),
                            tint = MaterialTheme.colorScheme.error
                        )
                        Spacer(modifier = Modifier.height(12.dp))
                        Text(
                            text = viewModel.errorMessage ?: "Error",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.error
                        )
                        Spacer(modifier = Modifier.height(12.dp))
                        Button(onClick = { viewModel.loadNotifications() }) {
                            Text("Retry")
                        }
                    }
                }
            }
            else -> {
                val notifications = viewModel.notifications
                if (notifications.isEmpty()) {
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Icon(
                                Icons.Default.NotificationsOff,
                                contentDescription = null,
                                modifier = Modifier.size(64.dp),
                                tint = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                            Spacer(modifier = Modifier.height(12.dp))
                            Text(
                                text = "No notifications",
                                style = MaterialTheme.typography.titleMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                text = "You're all caught up!",
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                } else {
                    if (viewModel.unreadCount > 0) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 16.dp, vertical = 8.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Surface(
                                color = MaterialTheme.colorScheme.errorContainer,
                                shape = MaterialTheme.shapes.small
                            ) {
                                Text(
                                    text = "${viewModel.unreadCount} unread",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = MaterialTheme.colorScheme.onErrorContainer,
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                                )
                            }
                        }
                    }

                    LazyColumn(
                        modifier = Modifier.padding(padding),
                        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        items(
                            items = notifications,
                            key = { it.id }
                        ) { notification ->
                            val dismissState = rememberSwipeToDismissBoxState(
                                confirmValueChange = { value ->
                                    if (value == SwipeToDismissBoxValue.EndToStart) {
                                        viewModel.deleteNotification(notification)
                                        true
                                    } else false
                                }
                            )

                            SwipeToDismissBox(
                                state = dismissState,
                                backgroundContent = {
                                    val color by animateColorAsState(
                                        when (dismissState.targetValue) {
                                            SwipeToDismissBoxValue.EndToStart -> MaterialTheme.colorScheme.errorContainer
                                            else -> Color.Transparent
                                        },
                                        label = "bg"
                                    )
                                    Box(
                                        modifier = Modifier
                                            .fillMaxSize()
                                            .background(color)
                                            .padding(horizontal = 20.dp),
                                        contentAlignment = Alignment.CenterEnd
                                    ) {
                                        if (dismissState.targetValue == SwipeToDismissBoxValue.EndToStart) {
                                            Icon(
                                                Icons.Default.Delete,
                                                contentDescription = "Delete",
                                                tint = MaterialTheme.colorScheme.onErrorContainer
                                            )
                                        }
                                    }
                                },
                                enableDismissFromStartToEnd = false
                            ) {
                                NotificationItem(
                                    notification = notification,
                                    onClick = { viewModel.markAsRead(notification) }
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun NotificationItem(
    notification: AppNotification,
    onClick: () -> Unit
) {
    val containerColor = if (!notification.is_read)
        MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.3f)
    else
        MaterialTheme.colorScheme.surface

    Card(
        modifier = Modifier.fillMaxWidth(),
        onClick = onClick,
        colors = CardDefaults.cardColors(containerColor = containerColor)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            verticalAlignment = Alignment.Top
        ) {
            NotificationTypeIcon(type = notification.type)
            Spacer(modifier = Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = notification.title,
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = if (!notification.is_read) FontWeight.Bold else FontWeight.Medium,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.weight(1f)
                    )
                    if (!notification.is_read) {
                        Spacer(modifier = Modifier.width(8.dp))
                        Surface(
                            color = MaterialTheme.colorScheme.primary,
                            shape = MaterialTheme.shapes.extraSmall
                        ) {
                            Box(
                                modifier = Modifier.size(8.dp)
                            )
                        }
                    }
                }
                Spacer(modifier = Modifier.height(2.dp))
                Text(
                    text = notification.message,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = formatRelativeTime(notification.created_at),
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f)
                )
            }
        }
    }
}

@Composable
private fun NotificationTypeIcon(type: String) {
    val (icon, color) = when (type) {
        "payment_received" -> Icons.Default.Payment to Color(0xFF2E7D32)
        "payment_reminder" -> Icons.Default.Reminder to MaterialTheme.colorScheme.primary
        "low_stock" -> Icons.Default.Warning to Color(0xFFF57C00)
        "invoice_created" -> Icons.Default.Receipt to MaterialTheme.colorScheme.primary
        "invoice_overdue" -> Icons.Default.Error to MaterialTheme.colorScheme.error
        "credit_note" -> Icons.Default.Undo to MaterialTheme.colorScheme.tertiary
        "new_customer" -> Icons.Default.PersonAdd to MaterialTheme.colorScheme.tertiary
        "system" -> Icons.Default.Info to MaterialTheme.colorScheme.onSurfaceVariant
        else -> Icons.Default.Notifications to MaterialTheme.colorScheme.onSurfaceVariant
    }

    Surface(
        color = color.copy(alpha = 0.12f),
        shape = MaterialTheme.shapes.small,
        modifier = Modifier.size(36.dp)
    ) {
        Box(contentAlignment = Alignment.Center) {
            Icon(
                imageVector = icon,
                contentDescription = type,
                tint = color,
                modifier = Modifier.size(20.dp)
            )
        }
    }
}

private fun formatRelativeTime(dateString: String?): String {
    if (dateString == null) return ""
    return try {
        val formats = listOf(
            SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).apply { timeZone = TimeZone.getTimeZone("UTC") },
            SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US).apply { timeZone = TimeZone.getTimeZone("UTC") },
            SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.US)
        )
        val date = formats.firstNotNullOfOrNull { try { it.parse(dateString) } catch (_: Exception) { null } }
            ?: return dateString

        val now = Date()
        val diff = now.time - date.time

        when {
            diff < TimeUnit.MINUTES.toMillis(1) -> "Just now"
            diff < TimeUnit.HOURS.toMillis(1) -> "${TimeUnit.MILLISECONDS.toMinutes(diff)} min ago"
            diff < TimeUnit.DAYS.toMillis(1) -> "${TimeUnit.MILLISECONDS.toHours(diff)} hours ago"
            diff < TimeUnit.DAYS.toMillis(2) -> "Yesterday"
            diff < TimeUnit.DAYS.toMillis(7) -> "${TimeUnit.MILLISECONDS.toDays(diff)} days ago"
            else -> {
                val sdf = SimpleDateFormat("dd MMM", Locale.US)
                sdf.format(date)
            }
        }
    } catch (_: Exception) {
        dateString
    }
}

package com.gstbilling.app.ui.notifications

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.gstbilling.app.data.remote.api.ApiService
import com.gstbilling.app.util.AppResult
import com.gstbilling.app.util.SessionManager
import com.gstbilling.app.util.safeApiCall
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import javax.inject.Inject

class NotificationBellHelper @Inject constructor(
    private val apiService: ApiService,
    private val sessionManager: SessionManager
) {
    suspend fun fetchUnreadCount(): Int {
        val businessId = sessionManager.getBusinessId() ?: return 0
        return when (val result = safeApiCall {
            apiService.getNotificationCount(businessId, limit = 1).body()?.data?.unread_count
        }) {
            is AppResult.Success -> result.data ?: 0
            else -> 0
        }
    }
}

@Composable
fun NotificationBell(
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    unreadCount: Int = 0
) {
    Box(modifier = modifier) {
        IconButton(onClick = onClick) {
            Icon(
                imageVector = Icons.Default.Notifications,
                contentDescription = "Notifications",
                modifier = Modifier.size(24.dp)
            )
        }
        if (unreadCount > 0) {
            Surface(
                modifier = Modifier
                    .align(Alignment.TopEnd)
                    .size(18.dp),
                color = MaterialTheme.colorScheme.error,
                shape = MaterialTheme.shapes.extraSmall
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Text(
                        text = if (unreadCount > 99) "99+" else "$unreadCount",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onError,
                        maxLines = 1
                    )
                }
            }
        }
    }
}

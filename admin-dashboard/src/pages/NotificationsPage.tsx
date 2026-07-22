import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Button, IconButton, Paper, List, ListItem, ListItemText,
  ListItemIcon, Alert, CircularProgress, Chip, Divider,
} from '@mui/material';
import {
  Notifications as NotifIcon, Payment as PaymentIcon, Warning as WarningIcon,
  Info as InfoIcon, Inventory as InventoryIcon, MarkEmailRead as ReadIcon,
  DoneAll as DoneAllIcon,
} from '@mui/icons-material';
import { notificationsApi, type Notification } from '../api/notifications';
import { useBusiness } from '../context/BusinessContext';

const typeIcons: Record<string, React.ReactNode> = {
  PAYMENT_RECEIVED: <PaymentIcon color="success" />,
  PAYMENT_OVERDUE: <WarningIcon color="error" />,
  LOW_STOCK: <InventoryIcon color="warning" />,
  STAFF_INVITE: <NotifIcon color="primary" />,
};
const typeColors: Record<string, string> = {
  PAYMENT_RECEIVED: '#e8f5e9', PAYMENT_OVERDUE: '#ffebee',
  LOW_STOCK: '#fff3e0', STAFF_INVITE: '#e3f2fd',
};

export default function NotificationsPage() {
  const { currentBusinessId } = useBusiness();
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);

  const fetch = useCallback(async () => {
    if (!currentBusinessId) return;
    setLoading(true);
    try {
      const { data } = await notificationsApi.getAll(currentBusinessId, { page: page + 1, limit: 50 });
      setNotifs(data.data || []);
    } catch { }
    setLoading(false);
  }, [currentBusinessId, page]);

  useEffect(() => { fetch(); }, [fetch]);

  const handleMarkRead = async (id: string) => {
    if (!currentBusinessId) return;
    await notificationsApi.markRead(currentBusinessId, id);
    setNotifs((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
  };

  const handleMarkAllRead = async () => {
    if (!currentBusinessId) return;
    await notificationsApi.markAllRead(currentBusinessId);
    setNotifs((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const unreadCount = notifs.filter((n) => !n.isRead).length;

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <NotifIcon color="primary" />
        <Typography variant="h4" sx={{ flex: 1 }}>Notifications {unreadCount > 0 && <Chip label={`${unreadCount} unread`} color="primary" size="small" />}</Typography>
        {unreadCount > 0 && <Button size="small" startIcon={<DoneAllIcon />} onClick={handleMarkAllRead}>Mark All Read</Button>}
      </Box>
      {loading ? <CircularProgress /> : notifs.length === 0 ? <Alert severity="info">No notifications</Alert> : (
        <Paper>
          <List>
            {notifs.map((n, i) => (
              <Box key={n.id}>
                {i > 0 && <Divider />}
                <ListItem sx={{ bgcolor: n.isRead ? 'transparent' : (typeColors[n.type] || '#f5f5f5'), cursor: 'pointer' }} onClick={() => !n.isRead && handleMarkRead(n.id)} secondaryAction={!n.isRead && <IconButton size="small" onClick={() => handleMarkRead(n.id)}><ReadIcon fontSize="small" /></IconButton>}>
                  <ListItemIcon>{typeIcons[n.type] || <InfoIcon />}</ListItemIcon>
                  <ListItemText primary={n.title} secondary={`${n.message} — ${new Date(n.createdAt).toLocaleDateString()}`} primaryTypographyProps={{ fontWeight: n.isRead ? 400 : 600 }} />
                </ListItem>
              </Box>
            ))}
          </List>
        </Paper>
      )}
    </Box>
  );
}

import { Outlet } from 'react-router-dom';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  Badge,
  Tooltip,
  Divider,
  Select,
  FormControl,
  InputLabel,
  Popover,
  List,
  ListItemButton,
  ListItemText,
  Button,
  CircularProgress,
  Chip,
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  AccountCircle,
  Receipt,
  Business as BusinessIcon,
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon,
  MarkEmailRead as MarkAllReadIcon,
} from '@mui/icons-material';
import { useState, useEffect, useCallback } from 'react';
import Sidebar from './Sidebar';
import { useAuth } from '../context/AuthContext';
import { useBusiness } from '../context/BusinessContext';
import { useSidebar } from '../context/SidebarContext';
import { useColorMode } from '../context/ColorModeContext';
import { notificationsApi, type Notification } from '../api/notifications';

export default function Layout() {
  const { user, logout } = useAuth();
  const { businesses, currentBusinessId, setCurrentBusinessId } = useBusiness();
  useSidebar();
  const { mode, toggleMode } = useColorMode();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [notifAnchor, setNotifAnchor] = useState<null | HTMLElement>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifLoading, setNotifLoading] = useState(false);

  const fetchUnreadCount = useCallback(async () => {
    if (!currentBusinessId) return;
    try {
      const { data } = await notificationsApi.unreadCount(currentBusinessId);
      setUnreadCount(data.count || 0);
    } catch { /* silent */ }
  }, [currentBusinessId]);

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 60000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  const handleNotifOpen = async (e: React.MouseEvent<HTMLElement>) => {
    setNotifAnchor(e.currentTarget);
    if (!currentBusinessId) return;
    setNotifLoading(true);
    try {
      const { data } = await notificationsApi.getAll(currentBusinessId, { limit: 20 });
      setNotifications(data.data || []);
    } catch { /* silent */ }
    setNotifLoading(false);
  };

  const handleNotifClose = () => setNotifAnchor(null);

  const handleMarkRead = async (notif: Notification) => {
    if (!currentBusinessId || notif.isRead) return;
    try {
      await notificationsApi.markRead(currentBusinessId, notif.id);
      setNotifications((prev) => prev.map((n) => n.id === notif.id ? { ...n, isRead: true } : n));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch { /* silent */ }
  };

  const handleMarkAllRead = async () => {
    if (!currentBusinessId) return;
    try {
      await notificationsApi.markAllRead(currentBusinessId);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch { /* silent */ }
  };

  const notifOpen = Boolean(notifAnchor);

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <Sidebar />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
        }}
      >
        <AppBar
          position="sticky"
          elevation={0}
          sx={{
            bgcolor: 'background.paper',
            borderBottom: '1px solid',
            borderColor: 'divider',
            color: 'text.primary',
          }}
        >
          <Toolbar>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexGrow: 1 }}>
              <Receipt sx={{ color: '#1a237e', display: { md: 'none' } }} />
              <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '0.95rem', color: 'text.secondary' }}>
                Welcome, <Box component="span" sx={{ color: '#1a237e' }}>{user?.name || 'User'}</Box>
              </Typography>
            </Box>
            {businesses.length > 0 && (
              <FormControl size="small" sx={{ minWidth: 200, mr: 2 }}>
                <InputLabel id="business-select-label">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <BusinessIcon sx={{ fontSize: 16 }} />
                    Business
                  </Box>
                </InputLabel>
                <Select
                  labelId="business-select-label"
                  value={currentBusinessId || ''}
                  label="Business"
                  onChange={(e) => setCurrentBusinessId(e.target.value || null)}
                >
                  {businesses.map((biz) => (
                    <MenuItem key={biz.id} value={biz.id}>
                      {biz.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
            <Tooltip title={`Switch to ${mode === 'light' ? 'dark' : 'light'} mode`}>
              <IconButton sx={{ mr: 1 }} onClick={toggleMode}>
                {mode === 'light' ? <DarkModeIcon /> : <LightModeIcon />}
              </IconButton>
            </Tooltip>
            <Tooltip title="Notifications">
              <IconButton sx={{ mr: 1 }} onClick={handleNotifOpen}>
                <Badge badgeContent={unreadCount} color="error">
                  <NotificationsIcon />
                </Badge>
              </IconButton>
            </Tooltip>
            <Popover
              open={notifOpen}
              anchorEl={notifAnchor}
              onClose={handleNotifClose}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
              PaperProps={{ sx: { width: 380, maxHeight: 480 } }}
            >
              <Box sx={{ px: 2, py: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="subtitle1" fontWeight={600}>Notifications</Typography>
                {unreadCount > 0 && (
                  <Button size="small" startIcon={<MarkAllReadIcon />} onClick={handleMarkAllRead}>
                    Mark all read
                  </Button>
                )}
              </Box>
              <Divider />
              {notifLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress size={24} />
                </Box>
              ) : notifications.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                  No notifications
                </Typography>
              ) : (
                <List sx={{ py: 0, maxHeight: 400, overflow: 'auto' }}>
                  {notifications.map((notif) => (
                    <ListItemButton
                      key={notif.id}
                      onClick={() => handleMarkRead(notif)}
                      sx={{
                        bgcolor: notif.isRead ? 'transparent' : 'action.hover',
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                      }}
                    >
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2" fontWeight={notif.isRead ? 400 : 600} noWrap sx={{ flex: 1 }}>
                              {notif.title}
                            </Typography>
                            {!notif.isRead && <Chip label="New" size="small" color="primary" sx={{ height: 20, fontSize: 10 }} />}
                          </Box>
                        }
                        secondary={
                          <>
                            <Typography variant="caption" color="text.secondary" display="block" noWrap>
                              {notif.message}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {new Date(notif.createdAt).toLocaleDateString('en-IN')}
                            </Typography>
                          </>
                        }
                      />
                    </ListItemButton>
                  ))}
                </List>
              )}
            </Popover>
            <IconButton onClick={(e) => setAnchorEl(e.currentTarget)}>
              <Avatar sx={{ width: 34, height: 34, bgcolor: '#1a237e' }}>
                {user?.name?.charAt(0)?.toUpperCase() || <AccountCircle />}
              </Avatar>
            </IconButton>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={() => setAnchorEl(null)}
            >
              <MenuItem disabled sx={{ opacity: 0.7 }}>
                {user?.phone}
              </MenuItem>
              <MenuItem onClick={() => { setAnchorEl(null); logout(); }}>
                Logout
              </MenuItem>
            </Menu>
          </Toolbar>
        </AppBar>
        <Box sx={{ flexGrow: 1, p: 3 }}>
          <Outlet />
        </Box>
        <Box
          sx={{
            py: 2,
            px: 3,
            borderTop: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 1,
          }}
        >
          <Typography variant="caption" color="text.secondary">
            &copy; {new Date().getFullYear()} Wise Accounts. All rights reserved.
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Typography
              variant="caption"
              component="a"
              href="https://wiseaccounts.com"
              target="_blank"
              sx={{ color: '#1a237e', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
            >
              Website
            </Typography>
            <Typography
              variant="caption"
              sx={{ color: 'text.secondary', cursor: 'default' }}
            >
              v1.0.0
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

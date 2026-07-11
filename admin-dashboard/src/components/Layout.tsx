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
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  AccountCircle,
  Receipt,
  Business as BusinessIcon,
} from '@mui/icons-material';
import { useState } from 'react';
import Sidebar from './Sidebar';
import { useAuth } from '../context/AuthContext';
import { useBusiness } from '../context/BusinessContext';
import { useSidebar } from '../context/SidebarContext';

export default function Layout() {
  const { user, logout } = useAuth();
  const { businesses, currentBusinessId, setCurrentBusinessId } = useBusiness();
  const { collapsed } = useSidebar();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const drawerWidth = collapsed ? 72 : 260;

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#f5f5f5' }}>
      <Sidebar />
      <Box
        sx={{
          flexGrow: 1,
          ml: `${drawerWidth}px`,
          transition: 'margin-left 0.2s ease',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <AppBar
          position="sticky"
          elevation={0}
          sx={{
            bgcolor: 'white',
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
            <Tooltip title="Notifications">
              <IconButton sx={{ mr: 1 }}>
                <Badge badgeContent={3} color="error">
                  <NotificationsIcon />
                </Badge>
              </IconButton>
            </Tooltip>
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
            bgcolor: 'white',
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

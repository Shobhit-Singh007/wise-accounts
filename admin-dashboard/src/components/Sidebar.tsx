import { useNavigate, useLocation } from 'react-router-dom';
import {
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  IconButton,
  Divider,
  Box,
  Typography,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Business as BusinessIcon,
  People as PeopleIcon,
  Inventory as InventoryIcon,
  Receipt as ReceiptIcon,
  Payment as PaymentIcon,
  Assessment as AssessmentIcon,
  Settings as SettingsIcon,
  Group as GroupIcon,
  ChevronLeft,
  ChevronRight,
} from '@mui/icons-material';
import { useSidebar } from '../context/SidebarContext';

const DRAWER_WIDTH = 260;
const DRAWER_COLLAPSED = 72;

const navItems = [
  { label: 'Dashboard', icon: <DashboardIcon />, path: '/' },
  { label: 'Businesses', icon: <BusinessIcon />, path: '/businesses' },
  { label: 'Customers', icon: <PeopleIcon />, path: '/customers' },
  { label: 'Products', icon: <InventoryIcon />, path: '/products' },
  { label: 'Invoices', icon: <ReceiptIcon />, path: '/invoices' },
  { label: 'Payments', icon: <PaymentIcon />, path: '/payments' },
  { label: 'Staff', icon: <GroupIcon />, path: '/staff' },
  { label: 'Reports', icon: <AssessmentIcon />, path: '/reports' },
  { label: 'Settings', icon: <SettingsIcon />, path: '/settings' },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { collapsed, toggle } = useSidebar();
  const width = collapsed ? DRAWER_COLLAPSED : DRAWER_WIDTH;

  return (
    <Drawer
      variant="permanent"
      sx={{
        width,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width,
          boxSizing: 'border-box',
          bgcolor: '#1a237e',
          color: 'white',
          borderRight: 'none',
          transition: 'width 0.2s ease',
          overflowX: 'hidden',
        },
      }}
    >
      <Toolbar
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          px: collapsed ? 0 : 2,
          minHeight: '64px !important',
        }}
      >
        {!collapsed && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ReceiptIcon sx={{ color: '#ff8f00' }} />
            <Typography variant="h6" noWrap sx={{ fontWeight: 700, fontSize: '1.1rem' }}>
              Wise Accounts
            </Typography>
          </Box>
        )}
        {collapsed && (
          <ReceiptIcon sx={{ color: '#ff8f00' }} />
        )}
        <IconButton
          onClick={toggle}
          sx={{ color: 'rgba(255,255,255,0.7)', '&:hover': { color: 'white' } }}
          size="small"
        >
          {collapsed ? <ChevronRight /> : <ChevronLeft />}
        </IconButton>
      </Toolbar>
      <Divider sx={{ borderColor: 'rgba(255,255,255,0.12)' }} />
      <List sx={{ px: collapsed ? 0.5 : 1, py: 1 }}>
        {navItems.map((item) => {
          const active = location.pathname === item.path;
          return (
            <ListItemButton
              key={item.path}
              onClick={() => navigate(item.path)}
              sx={{
                borderRadius: 2,
                mb: 0.5,
                justifyContent: collapsed ? 'center' : 'flex-start',
                px: collapsed ? 1 : 2,
                py: 1.2,
                bgcolor: active ? 'rgba(255,255,255,0.12)' : 'transparent',
                '&:hover': {
                  bgcolor: 'rgba(255,255,255,0.08)',
                },
              }}
            >
              <ListItemIcon
                sx={{
                  color: active ? '#ff8f00' : 'rgba(255,255,255,0.7)',
                  minWidth: collapsed ? 0 : 40,
                  justifyContent: 'center',
                }}
              >
                {item.icon}
              </ListItemIcon>
              {!collapsed && (
                <ListItemText
                  primary={item.label}
                  sx={{
                    '& .MuiListItemText-primary': {
                      fontSize: '0.9rem',
                      fontWeight: active ? 600 : 400,
                    },
                  }}
                />
              )}
            </ListItemButton>
          );
        })}
      </List>
    </Drawer>
  );
}

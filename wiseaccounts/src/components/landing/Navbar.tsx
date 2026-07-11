import { useState, useEffect } from 'react'
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom'
import AppBar from '@mui/material/AppBar'
import Toolbar from '@mui/material/Toolbar'
import Button from '@mui/material/Button'
import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import IconButton from '@mui/material/IconButton'
import Drawer from '@mui/material/Drawer'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemText from '@mui/material/ListItemText'
import Divider from '@mui/material/Divider'
import Typography from '@mui/material/Typography'
import MenuIcon from '@mui/icons-material/Menu'
import CloseIcon from '@mui/icons-material/Close'

const navItems = [
  { label: 'Home', path: '/' },
  { label: 'Features', path: '/features' },
  { label: 'Pricing', path: '/pricing' },
  { label: 'About', path: '/about' },
  { label: 'Contact', path: '/contact' },
]

function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const isHome = location.pathname === '/'

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleNavClick = (path: string) => {
    setMobileOpen(false)
    if (path === '/') {
      if (isHome) {
        window.scrollTo({ top: 0, behavior: 'smooth' })
      } else {
        navigate('/')
      }
    } else {
      navigate(path)
    }
  }

  const handleGetStarted = () => {
    navigate('/pricing')
  }

  const drawer = (
    <Box sx={{ textAlign: 'center' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1.5 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main' }}>
          Wise Accounts
        </Typography>
        <IconButton onClick={() => setMobileOpen(false)}>
          <CloseIcon />
        </IconButton>
      </Box>
      <Divider />
      <List>
        {navItems.map((item) => (
          <ListItem key={item.label} disablePadding>
            <ListItemButton
              onClick={() => handleNavClick(item.path)}
              selected={location.pathname === item.path}
              sx={{
                textAlign: 'center',
                '&.Mui-selected': { backgroundColor: 'primary.light', color: '#fff' },
              }}
            >
              <ListItemText primary={item.label} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      <Box sx={{ px: 2, py: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Button variant="outlined" fullWidth onClick={() => handleNavClick('/contact')}>
          Login
        </Button>
        <Button variant="contained" fullWidth onClick={handleGetStarted}>
          Get Started Free
        </Button>
      </Box>
    </Box>
  )

  return (
    <>
      <AppBar
        position="fixed"
        sx={{
          backgroundColor: scrolled ? 'rgba(255,255,255,0.98)' : 'transparent',
          backdropFilter: scrolled ? 'blur(8px)' : 'none',
          transition: 'all 0.3s ease',
          boxShadow: scrolled ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
        }}
      >
        <Container maxWidth="lg">
          <Toolbar disableGutters sx={{ minHeight: { xs: 64, md: 72 } }}>
            <Typography
              variant="h5"
              component={RouterLink}
              to="/"
              sx={{
                fontWeight: 800,
                color: scrolled || !isHome ? 'primary.main' : '#fff',
                textDecoration: 'none',
                letterSpacing: '-0.5px',
                mr: 'auto',
              }}
            >
              Wise Accounts
            </Typography>

            <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 1 }}>
              {navItems.map((item) => (
                <Button
                  key={item.label}
                  onClick={() => handleNavClick(item.path)}
                  sx={{
                    color: scrolled || !isHome ? 'text.primary' : '#fff',
                    fontWeight: location.pathname === item.path ? 700 : 500,
                    position: 'relative',
                    '&::after': location.pathname === item.path ? {
                      content: '""',
                      position: 'absolute',
                      bottom: 4,
                      left: 16,
                      right: 16,
                      height: 2,
                      backgroundColor: 'primary.main',
                      borderRadius: 1,
                    } : {},
                  }}
                >
                  {item.label}
                </Button>
              ))}
            </Box>

            <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 1.5, ml: 3 }}>
              <Button
                variant="outlined"
                sx={{
                  borderColor: scrolled || !isHome ? 'primary.main' : '#fff',
                  color: scrolled || !isHome ? 'primary.main' : '#fff',
                  '&:hover': {
                    borderColor: scrolled || !isHome ? 'primary.dark' : '#e0e0e0',
                    backgroundColor: scrolled || !isHome ? 'rgba(26,35,126,0.04)' : 'rgba(255,255,255,0.1)',
                  },
                }}
              >
                Login
              </Button>
              <Button variant="contained" onClick={handleGetStarted}>
                Get Started Free
              </Button>
            </Box>

            <IconButton
              sx={{ display: { xs: 'flex', md: 'none' }, color: scrolled || !isHome ? 'primary.main' : '#fff' }}
              onClick={() => setMobileOpen(true)}
            >
              <MenuIcon />
            </IconButton>
          </Toolbar>
        </Container>
      </AppBar>

      <Drawer
        anchor="right"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        slotProps={{ backdrop: { invisible: true }, paper: { sx: { width: 280 } } }}
      >
        {drawer}
      </Drawer>
    </>
  )
}

export default Navbar

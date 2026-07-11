import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import Link from '@mui/material/Link'
import Stack from '@mui/material/Stack'
import { Link as RouterLink } from 'react-router-dom'
import FacebookIcon from '@mui/icons-material/Facebook'
import PublicIcon from '@mui/icons-material/Public'
import InstagramIcon from '@mui/icons-material/Instagram'
import LanguageIcon from '@mui/icons-material/Language'

const featureLinks = [
  { label: 'GST Invoice', path: '/features' },
  { label: 'Delivery Challan', path: '/features' },
  { label: 'Quotation', path: '/features' },
  { label: 'Purchase Order', path: '/features' },
]

const resourceLinks = [
  { label: 'About Us', path: '/about' },
  { label: 'Blog', path: '#' },
  { label: 'Support', path: '/contact' },
  { label: 'FAQ', path: '#' },
  { label: 'Partners', path: '/contact' },
]

function Footer() {
  return (
    <Box sx={{ backgroundColor: '#0d1442', color: 'rgba(255,255,255,0.8)' }}>
      <Container maxWidth="lg">
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '2fr 1fr 1fr 1fr' },
            gap: 4,
            py: { xs: 6, md: 8 },
          }}
        >
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800, color: '#fff', mb: 2, letterSpacing: '-0.5px' }}>
              Wise Accounts
            </Typography>
            <Typography variant="body2" sx={{ mb: 2, lineHeight: 1.7, maxWidth: 300 }}>
              Lifetime free GST billing & accounting software trusted by 10,000+ businesses across India.
            </Typography>
            <Stack direction="row" spacing={0.5}>
              <IconButton sx={{ color: 'rgba(255,255,255,0.6)', '&:hover': { color: '#fff' } }}>
                <FacebookIcon />
              </IconButton>
              <IconButton sx={{ color: 'rgba(255,255,255,0.6)', '&:hover': { color: '#fff' } }}>
                <PublicIcon />
              </IconButton>
              <IconButton sx={{ color: 'rgba(255,255,255,0.6)', '&:hover': { color: '#fff' } }}>
                <InstagramIcon />
              </IconButton>
              <IconButton sx={{ color: 'rgba(255,255,255,0.6)', '&:hover': { color: '#fff' } }}>
                <LanguageIcon />
              </IconButton>
            </Stack>
          </Box>

          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#fff', mb: 2 }}>
              Features
            </Typography>
            <Stack spacing={1}>
              {featureLinks.map((link) => (
                <Link
                  key={link.label}
                  component={RouterLink}
                  to={link.path}
                  underline="hover"
                  sx={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', '&:hover': { color: '#fff' } }}
                >
                  {link.label}
                </Link>
              ))}
            </Stack>
          </Box>

          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#fff', mb: 2 }}>
              Resources
            </Typography>
            <Stack spacing={1}>
              {resourceLinks.map((link) => (
                <Link
                  key={link.label}
                  component={RouterLink}
                  to={link.path}
                  underline="hover"
                  sx={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', '&:hover': { color: '#fff' } }}
                >
                  {link.label}
                </Link>
              ))}
            </Stack>
          </Box>

          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#fff', mb: 2 }}>
              Contact
            </Typography>
            <Stack spacing={1}>
              <Typography variant="body2" sx={{ fontSize: '0.9rem' }}>
                +91 1800-123-4567
              </Typography>
              <Typography variant="body2" sx={{ fontSize: '0.9rem' }}>
                support@wiseaccounts.in
              </Typography>
              <Typography variant="body2" sx={{ fontSize: '0.9rem', mt: 2 }}>
                Wise Accounts Pvt. Ltd.
              </Typography>
              <Typography variant="body2" sx={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)' }}>
                Bangalore, Karnataka, India
              </Typography>
            </Stack>
          </Box>
        </Box>

        <Box
          sx={{
            borderTop: '1px solid rgba(255,255,255,0.1)',
            py: 3,
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>
            &copy; {new Date().getFullYear()} Wise Accounts. All rights reserved.
          </Typography>
          <Stack direction="row" spacing={3}>
            <Link
              href="#"
              underline="hover"
              sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', '&:hover': { color: '#fff' } }}
            >
              Privacy Policy
            </Link>
            <Link
              href="#"
              underline="hover"
              sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', '&:hover': { color: '#fff' } }}
            >
              Terms of Service
            </Link>
          </Stack>
        </Box>
      </Container>
    </Box>
  )
}

export default Footer

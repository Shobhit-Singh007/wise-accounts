import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import Typography from '@mui/material/Typography'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Button from '@mui/material/Button'
import { Link as RouterLink } from 'react-router-dom'
import DescriptionIcon from '@mui/icons-material/Description'
import InventoryIcon from '@mui/icons-material/Inventory'
import LocalShippingIcon from '@mui/icons-material/LocalShipping'
import PeopleIcon from '@mui/icons-material/People'
import SearchIcon from '@mui/icons-material/Search'
import PaymentsIcon from '@mui/icons-material/Payments'
import QrCodeIcon from '@mui/icons-material/QrCode'
import ShareIcon from '@mui/icons-material/Share'

const features = [
  { icon: <DescriptionIcon sx={{ fontSize: 32 }} />, title: 'Professional Invoice', description: 'Create GST-compliant professional invoices in seconds' },
  { icon: <InventoryIcon sx={{ fontSize: 32 }} />, title: 'Inventory Management', description: 'Smart inventory with real-time tracking and low stock alerts' },
  { icon: <LocalShippingIcon sx={{ fontSize: 32 }} />, title: 'E-Way Bill & E-Invoice', description: 'Generate E-Way bills & E-Invoices in 1 click' },
  { icon: <PeopleIcon sx={{ fontSize: 32 }} />, title: 'Staff Accounts', description: 'Manage your team with role-based access' },
  { icon: <SearchIcon sx={{ fontSize: 32 }} />, title: 'Auto Fill with GSTIN', description: 'Get customer details instantly with GSTIN' },
  { icon: <PaymentsIcon sx={{ fontSize: 32 }} />, title: 'Payment Tracking', description: 'Track pending payments and send reminders' },
  { icon: <QrCodeIcon sx={{ fontSize: 32 }} />, title: 'UPI QR on Invoice', description: 'Print UPI QR on invoices for faster payments' },
  { icon: <ShareIcon sx={{ fontSize: 32 }} />, title: 'Quick Share', description: 'Share invoices on WhatsApp, email, or SMS' },
]

function FeaturesSection() {
  return (
    <Box sx={{ py: { xs: 8, md: 12 }, backgroundColor: 'background.default' }}>
      <Container maxWidth="lg">
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <Typography
            variant="overline"
            sx={{ color: 'primary.main', fontWeight: 600, letterSpacing: 2 }}
          >
            FEATURES
          </Typography>
          <Typography variant="h3" sx={{ fontSize: { xs: '1.8rem', md: '2.5rem' }, fontWeight: 700, mt: 1, mb: 2 }}>
            Features of GST Billing & Accounting Software
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 600, mx: 'auto', fontSize: '1.05rem' }}>
            Everything you need to manage your business finances in one place
          </Typography>
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr 1fr' },
            gap: 3,
          }}
        >
          {features.map((feature) => (
            <Card
              key={feature.title}
              sx={{
                textAlign: 'center',
                py: 3,
                px: 2,
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-6px)',
                  boxShadow: '0 12px 40px rgba(26,35,126,0.1)',
                  borderColor: 'primary.main',
                },
                border: '1px solid',
                borderColor: 'grey.200',
              }}
              elevation={0}
            >
              <CardContent>
                <Box
                  sx={{
                    width: 64,
                    height: 64,
                    borderRadius: 2,
                    backgroundColor: 'rgba(26,35,126,0.06)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mx: 'auto',
                    mb: 2,
                    color: 'primary.main',
                  }}
                >
                  {feature.icon}
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, fontSize: '1.05rem' }}>
                  {feature.title}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                  {feature.description}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 5 }}>
          <Button
            component={RouterLink}
            to="/features"
            variant="outlined"
            size="large"
            sx={{ px: 4 }}
          >
            View All Features
          </Button>
        </Box>
      </Container>
    </Box>
  )
}

export default FeaturesSection

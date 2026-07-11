import Navbar from '../components/landing/Navbar'
import Footer from '../components/landing/Footer'
import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import Typography from '@mui/material/Typography'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import DescriptionIcon from '@mui/icons-material/Description'
import InventoryIcon from '@mui/icons-material/Inventory'
import LocalShippingIcon from '@mui/icons-material/LocalShipping'
import PeopleIcon from '@mui/icons-material/People'
import SearchIcon from '@mui/icons-material/Search'
import PaymentsIcon from '@mui/icons-material/Payments'
import QrCodeIcon from '@mui/icons-material/QrCode'
import ShareIcon from '@mui/icons-material/Share'
import AssessmentIcon from '@mui/icons-material/Assessment'
import ReceiptIcon from '@mui/icons-material/Receipt'
import StoreIcon from '@mui/icons-material/Store'

const features = [
  {
    icon: <DescriptionIcon sx={{ fontSize: 40 }} />,
    title: 'Professional Invoice',
    description: 'Create GST-compliant professional invoices in seconds with our intuitive invoice builder. Customize templates, add your logo, and generate invoices that look professional.',
    details: ['GST compliant invoice formats', 'Custom templates with branding', 'Auto-calculate taxes', 'Bulk invoice generation', 'Download as PDF'],
  },
  {
    icon: <InventoryIcon sx={{ fontSize: 40 }} />,
    title: 'Inventory Management',
    description: 'Smart inventory with real-time tracking, low stock alerts, and comprehensive stock reports to keep your business running smoothly.',
    details: ['Real-time stock tracking', 'Low stock alerts via email/SMS', 'Stock transfer management', 'Inventory reports', 'Barcode support'],
  },
  {
    icon: <LocalShippingIcon sx={{ fontSize: 40 }} />,
    title: 'E-Way Bill & E-Invoice',
    description: 'Generate E-Way bills and E-Invoices with a single click. Fully compliant with government regulations and automatic validation.',
    details: ['One-click E-Way bill generation', 'E-Invoice IRN generation', 'Automatic validation', 'Part A & Part B integration', 'Bulk generation'],
  },
  {
    icon: <PeopleIcon sx={{ fontSize: 40 }} />,
    title: 'Staff Accounts',
    description: 'Manage your team with role-based access control. Assign permissions and track activities of your staff members.',
    details: ['Role-based access control', 'Activity logs', 'Multi-user support', 'Permission management', 'Team collaboration'],
  },
  {
    icon: <SearchIcon sx={{ fontSize: 40 }} />,
    title: 'Auto Fill with GSTIN',
    description: 'Get customer details instantly by entering their GSTIN. Our system automatically fetches and fills business information.',
    details: ['Instant GSTIN lookup', 'Auto-fill business details', 'GSTIN verification', 'Customer database', 'Error-free data entry'],
  },
  {
    icon: <PaymentsIcon sx={{ fontSize: 40 }} />,
    title: 'Payment Tracking',
    description: 'Track pending payments, send automatic reminders to customers, and get real-time updates on your receivables.',
    details: ['Pending payment dashboard', 'Automatic payment reminders', 'Payment status tracking', 'Receivables reports', 'Payment reconciliation'],
  },
  {
    icon: <QrCodeIcon sx={{ fontSize: 40 }} />,
    title: 'UPI QR on Invoice',
    description: 'Print UPI QR codes on your invoices to enable instant payments from customers using any UPI app.',
    details: ['UPI QR code generation', 'Multiple UPI IDs support', 'Instant payment collection', 'Payment confirmation', 'No transaction fees'],
  },
  {
    icon: <ShareIcon sx={{ fontSize: 40 }} />,
    title: 'Quick Share',
    description: 'Share invoices directly on WhatsApp, email, or SMS with a single click. Make it easy for customers to receive their bills.',
    details: ['WhatsApp sharing', 'Email integration', 'SMS delivery', 'Bulk sharing', 'Share history tracking'],
  },
  {
    icon: <AssessmentIcon sx={{ fontSize: 40 }} />,
    title: 'GST Reports',
    description: 'Generate comprehensive GST reports for filing returns. Get GSTR-1, GSTR-3B, and other reports with detailed analysis.',
    details: ['GSTR-1 preparation', 'GSTR-3B summary', 'HSN-wise summary', 'Tax liability reports', 'Input tax credit tracking'],
  },
  {
    icon: <ReceiptIcon sx={{ fontSize: 40 }} />,
    title: 'Purchase Management',
    description: 'Record and manage all your purchases. Track expenses, manage vendors, and get insights into your spending patterns.',
    details: ['Purchase invoice recording', 'Vendor management', 'Expense tracking', 'Purchase reports', 'Bills payable tracking'],
  },
  {
    icon: <StoreIcon sx={{ fontSize: 40 }} />,
    title: 'Multi-Business Support',
    description: 'Manage multiple businesses from a single account. Switch between businesses seamlessly and keep data separate.',
    details: ['Multiple business profiles', 'Separate GSTIN for each', 'Unified dashboard', 'Cross-business reports', 'Role management'],
  },
  {
    icon: <AssessmentIcon sx={{ fontSize: 40 }} />,
    title: 'Analytics & Insights',
    description: 'Get powerful analytics and business insights with interactive charts and detailed reports to make data-driven decisions.',
    details: ['Sales analytics', 'Profit & loss reports', 'Cash flow analysis', 'Custom date range reports', 'Export to Excel/PDF'],
  },
]

function FeaturesPage() {
  return (
    <>
      <Navbar />
      <Box sx={{ pt: { xs: 10, md: 12 }, pb: { xs: 4, md: 6 }, backgroundColor: 'primary.main', color: '#fff' }}>
        <Container maxWidth="lg" sx={{ textAlign: 'center', py: { xs: 4, md: 6 } }}>
          <Typography variant="h3" sx={{ fontSize: { xs: '2rem', md: '3rem' }, fontWeight: 700, mb: 2 }}>
            All Features
          </Typography>
          <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.8)', maxWidth: 600, mx: 'auto', fontSize: '1.1rem' }}>
            Everything you need to manage your business finances, all in one place
          </Typography>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: { xs: 6, md: 10 } }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 4 }}>
          {features.map((feature) => (
            <Card
              key={feature.title}
              sx={{
                border: '1px solid',
                borderColor: 'grey.200',
                transition: 'all 0.3s ease',
                '&:hover': { borderColor: 'primary.light', boxShadow: '0 8px 30px rgba(26,35,126,0.06)' },
              }}
              elevation={0}
            >
              <CardContent sx={{ p: 4 }}>
                <Box sx={{ display: 'flex', gap: 2.5, alignItems: 'flex-start' }}>
                  <Box
                    sx={{
                      minWidth: 64,
                      width: 64,
                      height: 64,
                      borderRadius: 2,
                      backgroundColor: 'rgba(26,35,126,0.06)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'primary.main',
                    }}
                  >
                    {feature.icon}
                  </Box>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                      {feature.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2, lineHeight: 1.7 }}>
                      {feature.description}
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {feature.details.map((d) => (
                        <Box
                          key={d}
                          component="span"
                          sx={{
                            backgroundColor: 'rgba(26,35,126,0.04)',
                            color: 'primary.main',
                            borderRadius: 1,
                            px: 1.5,
                            py: 0.5,
                            fontSize: '0.8rem',
                            fontWeight: 500,
                          }}
                        >
                          {d}
                        </Box>
                      ))}
                    </Box>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      </Container>

      <Footer />
    </>
  )
}

export default FeaturesPage

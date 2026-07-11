import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import Typography from '@mui/material/Typography'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'

const items = [
  { title: 'Lifetime Free', description: 'Start using a lifetime free GST billing software with no hidden charges' },
  { title: 'Safe & Secure', description: 'Your business data is protected with bank-grade encryption and security' },
  { title: 'No Accounting Knowledge Required', description: 'Simple interface designed for everyone, no accounting background needed' },
  { title: 'Access Anytime Anywhere', description: 'Cloud-based platform accessible from any device, anywhere in India' },
  { title: 'Easy & Quick Invoicing', description: 'Create and send professional invoices in under 30 seconds' },
]

function WhyChooseSection() {
  return (
    <Box sx={{ py: { xs: 8, md: 12 }, backgroundColor: '#f0f2ff' }}>
      <Container maxWidth="lg">
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <Typography variant="h3" sx={{ fontSize: { xs: '1.8rem', md: '2.5rem' }, fontWeight: 700, mb: 2 }}>
            Why Choose Wise Accounts?
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 600, mx: 'auto', fontSize: '1.05rem' }}>
            The smart choice for Indian businesses looking for reliable GST software
          </Typography>
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(5, 1fr)' },
            gap: 3,
          }}
        >
          {items.map((item) => (
            <Card
              key={item.title}
              sx={{
                textAlign: 'center',
                py: 3,
                px: 2,
                border: '1px solid',
                borderColor: 'grey.200',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 8px 30px rgba(26,35,126,0.08)',
                },
              }}
              elevation={0}
            >
              <CardContent>
                <CheckCircleIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1.5 }} />
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, fontSize: '0.95rem' }}>
                  {item.title}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6, fontSize: '0.85rem' }}>
                  {item.description}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Box>
      </Container>
    </Box>
  )
}

export default WhyChooseSection

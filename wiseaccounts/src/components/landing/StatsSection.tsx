import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'

const stats = [
  { label: 'Quick Invoicing' },
  { label: 'Inventory' },
  { label: 'Payment Tracking' },
  { label: 'Phone Support' },
  { label: 'Mobile App' },
]

function StatsSection() {
  return (
    <Box sx={{ py: { xs: 8, md: 10 }, backgroundColor: 'primary.main', color: '#fff' }}>
      <Container maxWidth="lg" sx={{ textAlign: 'center' }}>
        <Typography variant="h4" sx={{ fontSize: { xs: '1.5rem', md: '2rem' }, fontWeight: 700, mb: 2 }}>
          Trusted by 10,000+ Business Owners Across India
        </Typography>
        <Typography
          variant="body1"
          sx={{ color: 'rgba(255,255,255,0.8)', mb: 4, maxWidth: 600, mx: 'auto', fontSize: '1.05rem' }}
        >
          Join thousands of businesses that have simplified their GST billing with us
        </Typography>

        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: 2,
            mb: 5,
          }}
        >
          {stats.map((s) => (
            <Chip
              key={s.label}
              label={s.label}
              icon={
                <Box component="span" sx={{ color: '#4caf50', fontWeight: 'bold', fontSize: 16 }}>&#10003;</Box>
              }
              sx={{
                backgroundColor: 'rgba(255,255,255,0.12)',
                color: '#fff',
                fontWeight: 500,
                fontSize: '0.95rem',
                py: 2.5,
                px: 1,
                borderRadius: 2,
                border: '1px solid rgba(255,255,255,0.15)',
                '& .MuiChip-icon': { ml: 1 },
              }}
            />
          ))}
        </Box>

        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 4,
          }}
        >
          {[1, 2, 3, 4, 5].map((i) => (
            <Box
              key={i}
              sx={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                backgroundColor: 'rgba(255,255,255,0.15)',
                border: '2px solid rgba(255,255,255,0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '0.9rem',
                color: 'rgba(255,255,255,0.7)',
              }}
            >
              {i}
            </Box>
          ))}
          <Typography sx={{ color: 'rgba(255,255,255,0.6)', ml: 1 }}>+ more</Typography>
        </Box>
      </Container>
    </Box>
  )
}

export default StatsSection

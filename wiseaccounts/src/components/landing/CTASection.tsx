import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import { useNavigate } from 'react-router-dom'

function CTASection() {
  const navigate = useNavigate()

  return (
    <Box
      sx={{
        py: { xs: 8, md: 10 },
        background: 'linear-gradient(135deg, #1a237e 0%, #283593 50%, #1565c0 100%)',
        textAlign: 'center',
      }}
    >
      <Container maxWidth="md">
        <Typography variant="h3" sx={{ fontSize: { xs: '1.8rem', md: '2.5rem' }, fontWeight: 700, color: '#fff', mb: 2 }}>
          Ready to Simplify Your Billing?
        </Typography>
        <Typography
          variant="body1"
          sx={{ color: 'rgba(255,255,255,0.8)', mb: 4, fontSize: '1.1rem', maxWidth: 500, mx: 'auto' }}
        >
          Join 10,000+ businesses already using Wise Accounts. Start your free account today.
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ justifyContent: 'center' }}>
          <Button
            variant="contained"
            size="large"
            onClick={() => navigate('/pricing')}
            sx={{
              backgroundColor: '#fff',
              color: 'primary.main',
              fontSize: '1.05rem',
              py: 1.5,
              px: 5,
              '&:hover': {
                backgroundColor: '#f0f0f0',
                boxShadow: '0 8px 25px rgba(0,0,0,0.2)',
              },
            }}
          >
            Create Free Account
          </Button>
          <Button
            variant="outlined"
            size="large"
            onClick={() => navigate('/contact')}
            sx={{
              borderColor: '#fff',
              color: '#fff',
              fontSize: '1.05rem',
              py: 1.5,
              px: 5,
              '&:hover': {
                borderColor: '#e0e0e0',
                backgroundColor: 'rgba(255,255,255,0.08)',
              },
            }}
          >
            Talk to Sales
          </Button>
        </Stack>
      </Container>
    </Box>
  )
}

export default CTASection

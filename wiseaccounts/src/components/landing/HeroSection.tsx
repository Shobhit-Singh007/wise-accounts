import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'

function HeroSection() {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        background: 'linear-gradient(135deg, #1a237e 0%, #283593 40%, #1565c0 70%, #1976d2 100%)',
        position: 'relative',
        overflow: 'hidden',
        pt: { xs: 10, md: 0 },
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          top: -200,
          right: -200,
          width: 600,
          height: 600,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.06) 0%, transparent 70%)',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          bottom: -100,
          left: -100,
          width: 400,
          height: 400,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.04) 0%, transparent 70%)',
        }}
      />

      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={{ xs: 6, md: 4 }}
          sx={{ alignItems: 'center' }}
        >
          <Box sx={{ flex: 1, textAlign: { xs: 'center', md: 'left' } }}>
            <Typography
              variant="h1"
              sx={{
                fontSize: { xs: '2.2rem', sm: '2.8rem', md: '3.5rem', lg: '4rem' },
                lineHeight: 1.15,
                color: '#fff',
                mb: 2.5,
                letterSpacing: '-1px',
              }}
            >
              Lifetime FREE GST Billing Software For Every Business
            </Typography>
            <Typography
              variant="h6"
              sx={{
                color: 'rgba(255,255,255,0.85)',
                fontWeight: 400,
                fontSize: { xs: '1rem', md: '1.2rem' },
                mb: 4,
                maxWidth: 560,
                mx: { xs: 'auto', md: 0 },
                lineHeight: 1.6,
              }}
            >
              100% Safe & Secure! Trusted by 10,000+ SMEs across India for GST invoicing, inventory management, and accounting.
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ justifyContent: { xs: 'center', md: 'flex-start' } }}>
              <Button
                variant="contained"
                size="large"
                sx={{
                  backgroundColor: '#fff',
                  color: 'primary.main',
                  fontSize: '1.05rem',
                  py: 1.5,
                  px: 4,
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
                sx={{
                  borderColor: '#fff',
                  color: '#fff',
                  fontSize: '1.05rem',
                  py: 1.5,
                  px: 4,
                  '&:hover': {
                    borderColor: '#e0e0e0',
                    backgroundColor: 'rgba(255,255,255,0.08)',
                  },
                }}
              >
                Watch Demo
              </Button>
            </Stack>
          </Box>

          <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <Box
              sx={{
                width: { xs: 280, sm: 360, md: 420 },
                height: { xs: 320, sm: 380, md: 440 },
                borderRadius: 4,
                background: 'linear-gradient(145deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.05) 100%)',
                border: '1px solid rgba(255,255,255,0.2)',
                backdropFilter: 'blur(10px)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <Box
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 40,
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  px: 2,
                  gap: 1,
                }}
              >
                <Box sx={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#ff5f57' }} />
                <Box sx={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#ffbd2e' }} />
                <Box sx={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#28c840' }} />
              </Box>
              <Box sx={{ textAlign: 'center', px: 3 }}>
                <Typography variant="h5" sx={{ color: '#fff', fontWeight: 600, mb: 1 }}>
                  Dashboard Preview
                </Typography>
                <Box
                  sx={{
                    width: 180,
                    height: 4,
                    backgroundColor: 'rgba(255,255,255,0.3)',
                    borderRadius: 2,
                    mx: 'auto',
                    mb: 2,
                  }}
                />
                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
                  <Box sx={{ width: 60, height: 40, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 1 }} />
                  <Box sx={{ width: 60, height: 40, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 1 }} />
                  <Box sx={{ width: 60, height: 40, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 1 }} />
                </Box>
                <Box sx={{ mt: 2, width: '80%', height: 6, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 2, mx: 'auto' }} />
                <Box sx={{ mt: 1, width: '60%', height: 6, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 2, mx: 'auto' }} />
              </Box>
            </Box>
          </Box>
        </Stack>
      </Container>
    </Box>
  )
}

export default HeroSection

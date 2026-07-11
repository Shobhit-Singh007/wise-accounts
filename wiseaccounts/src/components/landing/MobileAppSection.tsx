import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import AndroidIcon from '@mui/icons-material/Android'
import AppleIcon from '@mui/icons-material/Apple'

function MobileAppSection() {
  return (
    <Box sx={{ py: { xs: 8, md: 12 }, backgroundColor: '#f5f7ff' }}>
      <Container maxWidth="lg">
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={{ xs: 5, md: 8 }}
          sx={{ alignItems: 'center' }}
        >
          <Box sx={{ flex: 1, textAlign: { xs: 'center', md: 'left' } }}>
            <Typography variant="h3" sx={{ fontSize: { xs: '1.8rem', md: '2.5rem' }, fontWeight: 700, mb: 2 }}>
              Carry Your Business Wherever You Go
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3, fontSize: '1.05rem', lineHeight: 1.7, maxWidth: 520 }}>
              Access Wise Accounts from your mobile phone. Create invoices, manage inventory, and track payments on the go with our mobile app.
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ justifyContent: { xs: 'center', md: 'flex-start' } }}>
              <Button
                variant="contained"
                size="large"
                startIcon={<AndroidIcon />}
                sx={{ py: 1.5, px: 3, fontSize: '0.95rem' }}
              >
                Google Play
              </Button>
              <Button
                variant="outlined"
                size="large"
                startIcon={<AppleIcon />}
                sx={{ py: 1.5, px: 3, fontSize: '0.95rem' }}
              >
                App Store
              </Button>
            </Stack>
          </Box>

          <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
            <Box
              sx={{
                width: { xs: 200, sm: 240, md: 280 },
                height: { xs: 400, sm: 460, md: 520 },
                borderRadius: 4,
                background: 'linear-gradient(180deg, #1a237e 0%, #283593 50%, #1565c0 100%)',
                border: '4px solid rgba(255,255,255,0.8)',
                boxShadow: '0 20px 60px rgba(26,35,126,0.25)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
              }}
            >
              <Box
                sx={{
                  position: 'absolute',
                  top: 12,
                  width: 80,
                  height: 6,
                  backgroundColor: 'rgba(255,255,255,0.3)',
                  borderRadius: 3,
                }}
              />
              <Typography variant="h6" sx={{ color: '#fff', fontWeight: 600, opacity: 0.9 }}>
                Wise Accounts
              </Typography>
              <Box sx={{ width: 120, height: 3, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 2, my: 2 }} />
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 1,
                  px: 3,
                }}
              >
                {[1, 2, 3, 4].map((i) => (
                  <Box
                    key={i}
                    sx={{
                      width: '100%',
                      aspectRatio: '1',
                      backgroundColor: 'rgba(255,255,255,0.08)',
                      borderRadius: 1.5,
                    }}
                  />
                ))}
              </Box>
            </Box>
          </Box>
        </Stack>
      </Container>
    </Box>
  )
}

export default MobileAppSection

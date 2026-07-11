import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import Typography from '@mui/material/Typography'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardMedia from '@mui/material/CardMedia'
import Rating from '@mui/material/Rating'
import Stack from '@mui/material/Stack'

const testimonials = [
  {
    name: 'Prashant Jha',
    text: 'Best GST billing software I have used. It is completely free and has all features I need for my retail business. Highly recommended!',
    source: 'Google Play Store',
    rating: 5,
  },
  {
    name: 'Jaya Pradeep',
    text: 'Very user-friendly interface. My accounting team was able to start using it without any training. The inventory management feature is a game changer.',
    source: 'App Store',
    rating: 5,
  },
  {
    name: 'Rishabh',
    text: 'Switched from a paid software to Wise Accounts and I am impressed. Lifetime free with all essential features. E-way bill generation is seamless.',
    source: 'Google Play Store',
    rating: 5,
  },
  {
    name: 'Shyam Nagrani',
    text: 'Excellent customer support team. They helped me set up my entire GST billing system in just one day. The UPI QR on invoice feature is brilliant.',
    source: 'Google Play Store',
    rating: 5,
  },
  {
    name: 'Mitul Babbar',
    text: 'As a CA, I recommend Wise Accounts to all my clients. It is compliant with all GST regulations and the auto-fill with GSTIN saves so much time.',
    source: 'App Store',
    rating: 5,
  },
  {
    name: 'Pradip Dubaria',
    text: 'The quick share feature on WhatsApp makes it so easy to send invoices to customers. Payment tracking has helped me reduce pending payments significantly.',
    source: 'Google Play Store',
    rating: 5,
  },
]

function TestimonialsSection() {
  return (
    <Box sx={{ py: { xs: 8, md: 12 } }}>
      <Container maxWidth="lg">
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <Typography variant="h3" sx={{ fontSize: { xs: '1.8rem', md: '2.5rem' }, fontWeight: 700, mb: 2 }}>
            Why Businesses Love Wise Accounts
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 600, mx: 'auto', fontSize: '1.05rem' }}>
            Hear from our users across India who trust us for their GST billing needs
          </Typography>
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' },
            gap: 3,
          }}
        >
          {testimonials.map((t) => (
            <Card
              key={t.name}
              sx={{
                border: '1px solid',
                borderColor: 'grey.200',
                transition: 'all 0.3s ease',
                '&:hover': { borderColor: 'primary.light' },
              }}
              elevation={0}
            >
              <CardContent sx={{ p: 3 }}>
                <Rating value={t.rating} readOnly size="small" sx={{ mb: 1.5, color: '#f59e0b' }} />
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2, lineHeight: 1.7, fontStyle: 'italic' }}>
                  &ldquo;{t.text}&rdquo;
                </Typography>
                <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                  <CardMedia
                    component="div"
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      backgroundColor: 'primary.main',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      fontWeight: 700,
                      fontSize: '0.9rem',
                    }}
                  >
                    {t.name.charAt(0)}
                  </CardMedia>
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      {t.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {t.source}
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Box>
      </Container>
    </Box>
  )
}

export default TestimonialsSection

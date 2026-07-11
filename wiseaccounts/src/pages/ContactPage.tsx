import { useState } from 'react'
import Navbar from '../components/landing/Navbar'
import Footer from '../components/landing/Footer'
import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Stack from '@mui/material/Stack'
import PhoneIcon from '@mui/icons-material/Phone'
import EmailIcon from '@mui/icons-material/Email'
import LocationOnIcon from '@mui/icons-material/LocationOn'
import AccessTimeIcon from '@mui/icons-material/AccessTime'

function ContactPage() {
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', message: '' })

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [field]: e.target.value })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
  }

  return (
    <>
      <Navbar />
      <Box sx={{ pt: { xs: 10, md: 12 }, pb: { xs: 4, md: 6 }, backgroundColor: 'primary.main', color: '#fff' }}>
        <Container maxWidth="lg" sx={{ textAlign: 'center', py: { xs: 4, md: 6 } }}>
          <Typography variant="h3" sx={{ fontSize: { xs: '2rem', md: '3rem' }, fontWeight: 700, mb: 2 }}>
            Contact Us
          </Typography>
          <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.8)', maxWidth: 500, mx: 'auto', fontSize: '1.1rem' }}>
            Have questions? We are here to help. Reach out to our team.
          </Typography>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: { xs: 6, md: 10 } }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={6} sx={{ alignItems: 'flex-start' }}>
          <Box sx={{ flex: 1, width: '100%' }}>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 3 }}>
              Send us a message
            </Typography>
            <Box component="form" onSubmit={handleSubmit} noValidate>
              <Stack spacing={2.5}>
                <TextField
                  label="Your Name"
                  variant="outlined"
                  fullWidth
                  required
                  value={formData.name}
                  onChange={handleChange('name')}
                />
                <TextField
                  label="Email Address"
                  variant="outlined"
                  fullWidth
                  required
                  type="email"
                  value={formData.email}
                  onChange={handleChange('email')}
                />
                <TextField
                  label="Phone Number"
                  variant="outlined"
                  fullWidth
                  value={formData.phone}
                  onChange={handleChange('phone')}
                />
                <TextField
                  label="Message"
                  variant="outlined"
                  fullWidth
                  required
                  multiline
                  rows={4}
                  value={formData.message}
                  onChange={handleChange('message')}
                />
                <Button variant="contained" size="large" type="submit" sx={{ py: 1.5 }}>
                  Send Message
                </Button>
              </Stack>
            </Box>
          </Box>

          <Box sx={{ flex: 1, width: '100%' }}>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 3 }}>
              Get in touch
            </Typography>
            <Stack spacing={3}>
              <Card sx={{ border: '1px solid', borderColor: 'grey.200' }} elevation={0}>
                <CardContent sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                  <PhoneIcon sx={{ color: 'primary.main', fontSize: 28 }} />
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Phone</Typography>
                    <Typography variant="body2" color="text.secondary">+91 1800-123-4567</Typography>
                    <Typography variant="body2" color="text.secondary">Mon-Sat, 9AM-7PM</Typography>
                  </Box>
                </CardContent>
              </Card>
              <Card sx={{ border: '1px solid', borderColor: 'grey.200' }} elevation={0}>
                <CardContent sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                  <EmailIcon sx={{ color: 'primary.main', fontSize: 28 }} />
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Email</Typography>
                    <Typography variant="body2" color="text.secondary">support@wiseaccounts.in</Typography>
                    <Typography variant="body2" color="text.secondary">sales@wiseaccounts.in</Typography>
                  </Box>
                </CardContent>
              </Card>
              <Card sx={{ border: '1px solid', borderColor: 'grey.200' }} elevation={0}>
                <CardContent sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                  <LocationOnIcon sx={{ color: 'primary.main', fontSize: 28 }} />
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Office</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Wise Accounts Pvt. Ltd.<br />
                      Indiranagar, Bangalore<br />
                      Karnataka 560038, India
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
              <Card sx={{ border: '1px solid', borderColor: 'grey.200' }} elevation={0}>
                <CardContent sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                  <AccessTimeIcon sx={{ color: 'primary.main', fontSize: 28 }} />
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Business Hours</Typography>
                    <Typography variant="body2" color="text.secondary">Monday - Saturday: 9:00 AM - 7:00 PM</Typography>
                    <Typography variant="body2" color="text.secondary">Sunday: Closed</Typography>
                  </Box>
                </CardContent>
              </Card>
            </Stack>
          </Box>
        </Stack>
      </Container>

      <Footer />
    </>
  )
}

export default ContactPage

import { useState } from 'react'
import Navbar from '../components/landing/Navbar'
import Footer from '../components/landing/Footer'
import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import Typography from '@mui/material/Typography'
import Card from '@mui/material/Card'
import Stack from '@mui/material/Stack'
import RemoveRedEyeIcon from '@mui/icons-material/RemoveRedEye'
import GroupIcon from '@mui/icons-material/Group'
import ShowChartIcon from '@mui/icons-material/ShowChart'

function TeamMemberCard({ name, role, photo }: { name: string; role: string; photo: string }) {
  const [imgLoaded, setImgLoaded] = useState(false)

  return (
    <Card sx={{ textAlign: 'center', py: 4, px: 2, border: '1px solid', borderColor: 'grey.200', maxWidth: 280, mx: 'auto' }} elevation={0}>
      <Box
        sx={{
          width: 80,
          height: 80,
          borderRadius: '50%',
          backgroundColor: 'primary.main',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mx: 'auto',
          mb: 2,
          color: '#fff',
          fontWeight: 700,
          fontSize: '1.5rem',
          overflow: 'hidden',
        }}
      >
        <Box
          component="img"
          src={photo}
          alt={name}
          onLoad={() => setImgLoaded(true)}
          sx={{ width: '100%', height: '100%', objectFit: 'cover', display: imgLoaded ? 'block' : 'none' }}
        />
        {!imgLoaded && name.split(' ').map(n => n[0]).join('')}
      </Box>
      <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1rem' }}>
        {name}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {role}
      </Typography>
    </Card>
  )
}

function AboutPage() {
  return (
    <>
      <Navbar />
      <Box sx={{ pt: { xs: 10, md: 12 }, pb: { xs: 4, md: 6 }, backgroundColor: 'primary.main', color: '#fff' }}>
        <Container maxWidth="lg" sx={{ textAlign: 'center', py: { xs: 4, md: 6 } }}>
          <Typography variant="h3" sx={{ fontSize: { xs: '2rem', md: '3rem' }, fontWeight: 700, mb: 2 }}>
            About Wise Accounts
          </Typography>
          <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.8)', maxWidth: 600, mx: 'auto', fontSize: '1.1rem' }}>
            Making GST billing simple and accessible for every Indian business
          </Typography>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: { xs: 6, md: 10 } }}>
        <Stack spacing={{ xs: 6, md: 10 }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700, mb: 3, color: 'primary.main' }}>
              Our Story
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.8, mb: 2, fontSize: '1.05rem' }}>
              Wise Accounts was founded in 2020 with a simple mission: to make GST billing and accounting accessible to every business in India. We realized that most small and medium businesses were struggling with complex, expensive accounting software that required extensive training.
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.8, fontSize: '1.05rem' }}>
              Our team of CA professionals and software engineers came together to build a solution that is powerful yet simple, completely free yet enterprise-grade. Today, over 10,000 businesses across India trust Wise Accounts for their daily billing and accounting needs.
            </Typography>
          </Box>

          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700, mb: 2, color: 'primary.main', textAlign: 'center' }}>
              Our Mission & Vision
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center', maxWidth: 700, mx: 'auto', mb: 5, fontSize: '1.05rem' }}>
              To empower every Indian business with free, world-class GST billing software that simplifies compliance and drives growth.
            </Typography>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
                gap: 3,
              }}
            >
              <Card sx={{ textAlign: 'center', py: 4, px: 3, border: '1px solid', borderColor: 'grey.200' }} elevation={0}>
                <RemoveRedEyeIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                  Our Vision
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  To be India most trusted business platform, empowering millions of entrepreneurs with free and powerful financial tools.
                </Typography>
              </Card>
              <Card sx={{ textAlign: 'center', py: 4, px: 3, border: '1px solid', borderColor: 'grey.200' }} elevation={0}>
                <GroupIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                  Our Team
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  A passionate team of 50+ engineers, CAs, and customer support experts working tirelessly to serve you better.
                </Typography>
              </Card>
              <Card sx={{ textAlign: 'center', py: 4, px: 3, border: '1px solid', borderColor: 'grey.200' }} elevation={0}>
                <ShowChartIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                  Our Impact
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  10,000+ businesses served, 500,000+ invoices generated monthly, and 99% customer satisfaction rate.
                </Typography>
              </Card>
            </Box>
          </Box>

          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700, mb: 5, color: 'primary.main', textAlign: 'center' }}>
              Meet Our Leadership Team
            </Typography>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr' },
                gap: 3,
              }}
            >
              {[
                { name: 'Shobhit Singh', role: 'CEO & Founder', photo: '/shobhit-singh.jpg' },
              ].map((member) => (
                <TeamMemberCard key={member.name} name={member.name} role={member.role} photo={member.photo} />
              ))}
            </Box>
          </Box>
        </Stack>
      </Container>

      <Footer />
    </>
  )
}

export default AboutPage

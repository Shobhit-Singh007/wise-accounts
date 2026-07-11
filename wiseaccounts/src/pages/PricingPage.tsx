import Navbar from '../components/landing/Navbar'
import PricingSection from '../components/landing/PricingSection'
import Footer from '../components/landing/Footer'
import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import Typography from '@mui/material/Typography'
import Accordion from '@mui/material/Accordion'
import AccordionSummary from '@mui/material/AccordionSummary'
import AccordionDetails from '@mui/material/AccordionDetails'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'

const faqs = [
  { question: 'Is Wise Accounts really free?', answer: 'Yes, our Free plan is completely free forever with no time limits. You can create up to 100 invoices per month and access basic features at no cost.' },
  { question: 'Can I upgrade my plan later?', answer: 'Absolutely! You can upgrade from Free to Business or Enterprise at any time. Your data will be preserved and you will get immediate access to all premium features.' },
  { question: 'Do I need accounting knowledge to use Wise Accounts?', answer: "Not at all. Wise Accounts is designed to be user-friendly for everyone. The interface is intuitive and we have extensive guides to help you get started." },
  { question: 'Is my data safe with Wise Accounts?', answer: 'Yes, we use bank-grade encryption to protect your data. All data is stored securely on cloud servers with regular backups and strict access controls.' },
  { question: 'Can I use Wise Accounts on my mobile phone?', answer: 'Yes, we have mobile apps available for both Android and iOS. You can access all features from your phone or tablet.' },
  { question: 'Do you provide customer support?', answer: 'Yes, Free plan users get email support. Business plan users get priority support, and Enterprise users get a dedicated account manager.' },
  { question: 'Can I generate E-Way bills and E-Invoices?', answer: 'Yes, Wise Accounts supports E-Way bill and E-Invoice generation with automatic validation. This feature is available on all plans.' },
]

function PricingPage() {
  return (
    <>
      <Navbar />
      <Box sx={{ pt: { xs: 10, md: 12 }, pb: { xs: 4, md: 6 } }} />
      <PricingSection />

      <Box sx={{ py: { xs: 8, md: 10 }, backgroundColor: '#f5f7ff' }}>
        <Container maxWidth="md">
          <Typography variant="h3" sx={{ fontSize: { xs: '1.8rem', md: '2.2rem' }, fontWeight: 700, textAlign: 'center', mb: 4 }}>
            Frequently Asked Questions
          </Typography>
          {faqs.map((faq, i) => (
            <Accordion
              key={i}
              sx={{
                mb: 1,
                border: '1px solid',
                borderColor: 'grey.200',
                boxShadow: 'none',
                '&::before': { display: 'none' },
                '&.Mui-expanded': { borderColor: 'primary.light' },
              }}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography sx={{ fontWeight: 600 }}>{faq.question}</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="body2" color="text.secondary">
                  {faq.answer}
                </Typography>
              </AccordionDetails>
            </Accordion>
          ))}
        </Container>
      </Box>

      <Footer />
    </>
  )
}

export default PricingPage

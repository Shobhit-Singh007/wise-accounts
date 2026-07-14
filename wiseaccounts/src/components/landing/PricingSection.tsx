import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import Typography from '@mui/material/Typography'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import CheckIcon from '@mui/icons-material/Check'
import Stack from '@mui/material/Stack'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'

const plans = [
  {
    name: 'Free',
    price: '₹0',
    period: '/month',
    description: 'For startups',
    popular: false,
    features: [
      'Up to 100 invoices/month',
      'Basic reports',
      'Email support',
      'GST compliant invoices',
      'Single user',
    ],
  },
  {
    name: 'Business',
    price: '₹499',
    period: '/month',
    description: 'For growing businesses',
    popular: true,
    features: [
      'Unlimited invoices',
      'Advanced reports',
      'Priority support',
      'Multi-user access',
      'API access',
      'Inventory management',
      'E-Way bill generation',
    ],
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    description: 'For large organizations',
    popular: false,
    features: [
      'Everything in Business',
      'Custom integrations',
      'Dedicated manager',
      'SLA guarantee',
      'White-label options',
      'On-premise deployment',
    ],
  },
]

function PricingSection() {
  const navigate = useNavigate()
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [, setSelectedPlan] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handlePlanClick = (planName: string) => {
    if (planName === 'Enterprise') {
      navigate('/contact')
    } else if (planName === 'Free') {
      window.location.href = '/admin/register'
    } else if (planName === 'Business') {
      setSelectedPlan(planName)
      setCheckoutOpen(true)
    }
  }

  const handleCheckout = async () => {
    setLoading(true)
    setError('')
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://wiseaccs.com/api/v1'}/subscriptions/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: 'business' }),
      })
      const data = await response.json()
      if (!data.order_id) {
        throw new Error(data.message || 'Failed to create order')
      }

      const options = {
        key: data.key_id,
        amount: data.amount,
        currency: data.currency || 'INR',
        name: 'Wise Accounts',
        description: 'Business Plan - Monthly Subscription',
        order_id: data.order_id,
        handler: async (response: any) => {
          try {
            await fetch(`${import.meta.env.VITE_API_URL || 'https://wiseaccs.com/api/v1'}/subscriptions/verify`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                plan: 'business',
              }),
            })
            window.location.href = '/admin/register?plan=business&payment=success'
          } catch {
            window.location.href = '/admin/register?plan=business&payment=pending'
          }
        },
        prefill: { contact: '', email: '' },
        theme: { color: '#1565C0' },
      }

      const razorpay = new (window as any).Razorpay(options)
      razorpay.on('payment.failed', () => {
        setError('Payment failed. Please try again.')
        setLoading(false)
      })
      razorpay.open()
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
      setLoading(false)
    }
  }

  return (
    <Box sx={{ py: { xs: 8, md: 12 }, backgroundColor: 'background.default' }}>
      <Container maxWidth="lg">
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <Typography
            variant="overline"
            sx={{ color: 'primary.main', fontWeight: 600, letterSpacing: 2 }}
          >
            PRICING
          </Typography>
          <Typography variant="h3" sx={{ fontSize: { xs: '1.8rem', md: '2.5rem' }, fontWeight: 700, mt: 1, mb: 2 }}>
            Simple, Transparent Pricing
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 600, mx: 'auto', fontSize: '1.05rem' }}>
            Start for free, upgrade when you need more power
          </Typography>
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
            gap: 4,
            alignItems: 'start',
          }}
        >
          {plans.map((plan) => (
            <Card
              key={plan.name}
              sx={{
                position: 'relative',
                border: plan.popular ? '2px solid' : '1px solid',
                borderColor: plan.popular ? 'primary.main' : 'grey.200',
                boxShadow: plan.popular ? '0 8px 40px rgba(26,35,126,0.12)' : 'none',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 12px 48px rgba(26,35,126,0.15)',
                },
              }}
              elevation={0}
            >
              {plan.popular && (
                <Chip
                  label="POPULAR"
                  size="small"
                  sx={{
                    position: 'absolute',
                    top: -12,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    backgroundColor: 'primary.main',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: '0.7rem',
                    letterSpacing: 1,
                  }}
                />
              )}
              <CardContent sx={{ p: 4 }}>
                <Typography variant="h5" sx={{ fontWeight: 600, mb: 0.5 }}>
                  {plan.name}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {plan.description}
                </Typography>
                <Box sx={{ mb: 3 }}>
                  <Typography
                    component="span"
                    variant="h3"
                    sx={{ fontWeight: 800, color: 'primary.main' }}
                  >
                    {plan.price}
                  </Typography>
                  {plan.period && (
                    <Typography component="span" variant="body2" color="text.secondary">
                      {plan.period}
                    </Typography>
                  )}
                </Box>

                <Stack spacing={1.5} sx={{ mb: 3 }}>
                  {plan.features.map((f) => (
                    <Stack key={f} direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                      <CheckIcon sx={{ fontSize: 18, color: 'primary.main' }} />
                      <Typography variant="body2">{f}</Typography>
                    </Stack>
                  ))}
                </Stack>

                <Button
                  variant={plan.popular ? 'contained' : 'outlined'}
                  fullWidth
                  size="large"
                  onClick={() => handlePlanClick(plan.name)}
                  disabled={loading}
                  sx={{ py: 1.5 }}
                >
                  {plan.name === 'Enterprise' ? 'Contact Sales' : 'Get Started'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </Box>
      </Container>

      <Dialog open={checkoutOpen} onClose={() => { setCheckoutOpen(false); setError(''); }} maxWidth="sm" fullWidth>
        <DialogTitle>Subscribe to Business Plan</DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            You'll be charged ₹499/month for the Business plan. You can cancel anytime.
          </Typography>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Typography variant="body2" color="text.secondary">
            Click "Pay ₹499" to proceed with Razorpay checkout.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => { setCheckoutOpen(false); setError(''); }} disabled={loading}>Cancel</Button>
          <Button variant="contained" onClick={handleCheckout} disabled={loading} startIcon={loading ? <CircularProgress size={16} /> : null}>
            {loading ? 'Processing...' : 'Pay ₹499'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default PricingSection

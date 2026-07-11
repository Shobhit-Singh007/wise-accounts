import Navbar from '../components/landing/Navbar'
import HeroSection from '../components/landing/HeroSection'
import FeaturesSection from '../components/landing/FeaturesSection'
import WhyChooseSection from '../components/landing/WhyChooseSection'
import StatsSection from '../components/landing/StatsSection'
import MobileAppSection from '../components/landing/MobileAppSection'
import TestimonialsSection from '../components/landing/TestimonialsSection'
import PricingSection from '../components/landing/PricingSection'
import CTASection from '../components/landing/CTASection'
import Footer from '../components/landing/Footer'

function HomePage() {
  return (
    <>
      <Navbar />
      <HeroSection />
      <FeaturesSection />
      <WhyChooseSection />
      <StatsSection />
      <MobileAppSection />
      <TestimonialsSection />
      <PricingSection />
      <CTASection />
      <Footer />
    </>
  )
}

export default HomePage

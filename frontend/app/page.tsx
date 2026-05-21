import HeroSection from "@/components/landing/HeroSection";

import NarrativeSection from "@/components/landing/NarrativeSection";
import FeatureHud from "@/components/landing/FeatureHud";
import FeatureAnnotations from "@/components/landing/FeatureAnnotations";
import FeatureShare from "@/components/landing/FeatureShare";
import HowItWorksSection from "@/components/landing/HowItWorksSection";
import EvidenceSection from "@/components/landing/EvidenceSection";
import PricingSection from "@/components/landing/PricingSection";
import TestimonialsSection from "@/components/landing/TestimonialsSection";
import FaqSection from "@/components/landing/FaqSection";
import CtaSection from "@/components/landing/CtaSection";
import Footer from "@/components/landing/Footer";

export default function Home() {
  return (
    <main>
      <HeroSection />
      <NarrativeSection />
      <FeatureHud />
      <FeatureAnnotations />
      <FeatureShare />
      <HowItWorksSection />
      <EvidenceSection />
      <PricingSection />
      <TestimonialsSection />
      <FaqSection />
      <CtaSection />
      <Footer />
    </main>
  );
}

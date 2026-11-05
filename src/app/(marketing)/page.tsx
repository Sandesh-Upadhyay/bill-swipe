import { Hero } from "@/components/marketing/hero";
import { HowItWorksSection } from "@/components/marketing/how-it-works-section";
import { FeaturedRequests } from "@/components/marketing/featured-requests";
import { ImpactStats } from "@/components/marketing/impact-stats";
import { Testimonials } from "@/components/marketing/testimonials";
import { TrustSafety } from "@/components/marketing/trust-safety";
import { FinalCta } from "@/components/marketing/final-cta";

export default function HomePage() {
  return (
    <>
      <Hero />
      <HowItWorksSection />
      <FeaturedRequests />
      <ImpactStats />
      <Testimonials />
      <TrustSafety />
      <FinalCta />
    </>
  );
}

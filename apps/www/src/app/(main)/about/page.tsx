import { CTASection } from "./components/cta-section";
import { FeaturesSection } from "./components/features-section";
import { HeroSection } from "./components/hero-section";

export const metadata = {
  title: "About",
};

export default function AboutPage() {
  return (
    <div className="container md:max-w-screen-lg">
      <HeroSection />
      <FeaturesSection />
      <CTASection />
    </div>
  );
}

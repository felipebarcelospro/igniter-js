import { CTASection } from "@/app/(shared)/components/cta";
import { BackendSection } from "./components/backend-section";
import { EcosystemSection } from "./components/ecosystem-section";
import { FeaturesSection } from "./components/features-section";
import { HeroSection } from "./components/hero-section";
import { BlogSection } from "./components/blog-section";

export default function Home() {  
  return (
    <div
      className="px-0 border-x border-border divide-y divide-border"      
    >
      <HeroSection />
      <FeaturesSection />
      <BackendSection />
      <BlogSection />
      <CTASection />
    </div>
  );
}

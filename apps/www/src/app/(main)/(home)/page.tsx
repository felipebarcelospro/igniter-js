import { CTASection } from "@/app/(shared)/components/cta";
import { BackendSection } from "./components/backend-section";
import { FeaturesSection } from "./components/features-section";
import { HeroSection } from "./components/hero-section";
import { BlogSection } from "./components/blog-section";
import { generateMetadata as generateMeta } from "@/lib/metadata";
import { config } from "@/configs/application";

export const metadata = generateMeta({
  title: config.projectTagline,
  description: config.projectDescription,
  canonical: "/",
  keywords: ["Igniter.js", "TypeScript", "Full-stack framework", "Type-safe", "React", "Next.js", "API", "Backend", "Frontend"]
});

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

import Link from 'next/link';
import { HeroSection } from './(components)/hero-section';
import { FeaturesSection } from './(components)/features-section';
import { BackendSection } from './(components)/backend-section';
import { BlogSection } from './(components)/blog-section';
import { CTASection } from '@/components/site/cta';
import { TryItOut } from './(components)/try-it-out';

export default function HomePage() {
  return (
    <div
      className="px-0"      
    >
      <HeroSection />
      <TryItOut />
      <FeaturesSection />
      <BackendSection />
      <BlogSection />
      <CTASection />
    </div>
  );
}

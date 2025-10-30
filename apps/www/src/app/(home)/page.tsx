import Link from 'next/link';
import { Metadata } from 'next';
import { HeroSection } from './(components)/hero-section';
import { FeaturesSection } from './(components)/features-section';
import { BackendSection } from './(components)/backend-section';
import { BlogSection } from './(components)/blog-section';
import { CTASection } from '@/components/site/cta';
import { TryItOut } from './(components)/try-it-out';
import { generateMetadataWithOG } from '@/lib/metadata';
import { config } from '@/configs/application';

export const metadata: Metadata = generateMetadataWithOG({
  title: `${config.projectName} - ${config.projectTagline}`,
  description: config.projectDescription,
  path: '/',
  ogImagePath: '/og/home.png',
});

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
      <CTASection className='rounded-t-none' />
    </div>
  );
}

import { Metadata } from 'next'
import { source } from './source'
import {
  SitePageHeaderSection,
  SitePageHeaderSectionContainer,
  SitePageHeaderSectionGradient,
  SitePageHeaderSectionContent,
  SitePageHeaderSectionBreadcrumb,
  SitePageHeaderSectionTitle,
  SitePageHeaderSectionDescription,
} from '@/components/site/site-page-header-section'
import {
  SitePage,
  SitePageHeader,
  SitePageContent,
  SitePageFooter,
} from '@/components/site/site-page'
import { config } from '@/configs/application'
import { LearnHero, LearnCurriculum } from '@/components/learn'

export const metadata: Metadata = {
  title: 'Learn Igniter.js',
  description: 'Build a production-ready SaaS application with Igniter.js and Next.js. Learn through hands-on tutorials and real-world examples.',
}

export default async function Page() {
  const pages = source.getPages()

  return (
    <SitePage>
      <SitePageHeader>
        <SitePageHeaderSection>
          <SitePageHeaderSectionGradient />
          <SitePageHeaderSectionContainer>
            <SitePageHeaderSectionBreadcrumb
              items={[
                { label: config.projectName, href: '/', isActive: false },
                { label: 'Learn', href: '/learn', isActive: true },
              ]}
            />
            <SitePageHeaderSectionContent className="pb-26">
              <SitePageHeaderSectionTitle>
                Learn Igniter.js
              </SitePageHeaderSectionTitle>
              <SitePageHeaderSectionDescription>
                Build a production-ready SaaS application from scratch. Learn through hands-on tutorials and real-world examples.
              </SitePageHeaderSectionDescription>
            </SitePageHeaderSectionContent>
          </SitePageHeaderSectionContainer>
        </SitePageHeaderSection>
      </SitePageHeader>

      <SitePageContent>
        <section className="relative min-h-[36vh] -mt-16 pb-8">
          <div className="container mx-auto max-w-5xl">
            <LearnHero />
            <LearnCurriculum pages={pages} />
          </div>
        </section>
      </SitePageContent>
    </SitePage>
  )
}

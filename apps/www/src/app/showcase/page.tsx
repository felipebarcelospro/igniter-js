import { Metadata } from 'next'
import { Plus } from 'lucide-react'
import Link from 'next/link'
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
import { ShowcaseGrid } from './(components)/showcase-grid'
import { toSerializableShowcases } from './(lib)/showcase-utils'
import { Button } from '@/components/ui/button'
import { generateMetadataWithOG } from '@/lib/metadata'

export const metadata: Metadata = generateMetadataWithOG({
  title: `Showcase - ${config.projectName}`,
  description: `Discover amazing projects built with ${config.projectName}. From startups to enterprise applications, see what developers are creating.`,
  path: '/showcase',
  ogImagePath: '/og/showcase.png',
})

export default async function Page() {
  const pages = source.getPages()
  const showcases = toSerializableShowcases(pages)

  return (
    <SitePage>
      <SitePageHeader>
        <SitePageHeaderSection>
          <SitePageHeaderSectionGradient />
          <SitePageHeaderSectionContainer>
            <SitePageHeaderSectionBreadcrumb
              items={[
                { label: config.projectName, href: '/', isActive: false },
                { label: 'Showcase', href: '/showcase', isActive: true },
              ]}
            />
            <SitePageHeaderSectionContent className="pb-26">
              <SitePageHeaderSectionTitle>Showcase</SitePageHeaderSectionTitle>
              <SitePageHeaderSectionDescription>
                Discover amazing projects built with {config.projectName}. From startups to enterprise applications, see what developers are creating.
              </SitePageHeaderSectionDescription>
              <div className="mt-6">
                <Button asChild variant="outline" size="sm">
                  <Link 
                    href="https://github.com/nubler-hq/igniter/discussions/categories/showcase" 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Suggest Yours
                  </Link>
                </Button>
              </div>
            </SitePageHeaderSectionContent>
          </SitePageHeaderSectionContainer>
        </SitePageHeaderSection>
      </SitePageHeader>

      <SitePageContent>
        {showcases.length > 0 && (
          <section className="relative min-h-[36vh] -mt-16 pb-16">
            <div className="container mx-auto max-w-5xl">
              <ShowcaseGrid items={showcases} />
            </div>
          </section>
        )}
      </SitePageContent>

      <SitePageFooter />
    </SitePage>
  )
}

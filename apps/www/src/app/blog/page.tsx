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
import { SiteBlogPostGrid } from '@/components/site/site-blog-post-grid'
import { generateMetadataWithOG } from '@/lib/metadata'

export const metadata: Metadata = generateMetadataWithOG({
  title: `Blog - ${config.projectName}`,
  description: `Latest news, tutorials, and updates from ${config.projectName}. Learn about TypeScript frameworks, AI-native development, and more.`,
  path: '/blog',
  ogImagePath: '/og/blog.png',
})

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
                { label: 'Blog', href: '/blog', isActive: true },
              ]}
            />
            <SitePageHeaderSectionContent className="pb-26">
              <SitePageHeaderSectionTitle>Blog</SitePageHeaderSectionTitle>
              <SitePageHeaderSectionDescription>
                Latest news and updates from {config.projectName}
              </SitePageHeaderSectionDescription>
            </SitePageHeaderSectionContent>
          </SitePageHeaderSectionContainer>
        </SitePageHeaderSection>
      </SitePageHeader>

      <SitePageContent>
        {pages.length > 0 && (
          <section className="relative min-h-[36vh] -mt-16 pb-8">
            <div className="container mx-auto max-w-5xl">
              <SiteBlogPostGrid
                variant="featured"
                showExcerpt={true}
                showAuthor={true}
                showDate={true}
                showTags={false}
                columns={3}
                posts={pages}
              />
            </div>
          </section>
        )}
      </SitePageContent>

      <SitePageFooter />
    </SitePage>
  )
}
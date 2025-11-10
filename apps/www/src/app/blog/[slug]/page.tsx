import type { Metadata } from 'next/types'
import { notFound } from 'next/navigation'
import { source } from '../source'
import {
  SitePage,
  SitePageHeader,
  SitePageContent,
} from '@/components/site/site-page'
import {
  SitePageHeaderSection,
  SitePageHeaderSectionGradient,
  SitePageHeaderSectionContainer,
  SitePageHeaderSectionBreadcrumb,
  SitePageHeaderSectionContent,
  SitePageHeaderSectionTitle,
  SitePageHeaderSectionDescription,
} from '@/components/site/site-page-header-section'
import {
  SitePageArticle,
  SitePageArticleContent,
  SitePageArticleSidebar,
  SitePageArticleAuthor,
  SitePageArticleAuthorTitle,
  SitePageArticleAuthorLink,
  SitePageArticleAuthorAvatar,
  SitePageArticleAuthorInfo,
  SitePageArticleAuthorName,
  SitePageArticleAuthorRole,
  SitePageArticleTOC,
  SitePageArticleRelated,
  SitePageArticleRelatedHeader,
  SitePageArticleRelatedList,
  SitePageArticleRelatedItem,
  SitePageArticleProvider,
  SitePageArticleContainer,
} from '@/components/site/site-page-article'
import { config } from '@/configs/application'
import { getMDXComponents } from '@/mdx-components'
import { CTASection } from '@/components/site/cta'
import { DateUtils } from '@/lib/date'
import { generateMetadataWithOG } from '@/lib/metadata'

export async function generateMetadata({
  params,
}: PageProps<'/blog/[slug]'>): Promise<Metadata> {
  const { slug } = await params

  const post = source.getPage([slug])
  if (!post) {
    return {
      title: 'Post Not Found',
      description: 'The blog article you are looking for could not be found.',
    }
  }

  const coverImage = post.data.cover || `/og/blog/${slug}.png`;

  return generateMetadataWithOG({
    title: `${post.data.title as string} - ${config.projectName} Blog`,
    description: post.data.description as string,
    path: `/blog/${slug}`,
    ogImagePath: coverImage.startsWith('http') ? undefined : coverImage,
    type: 'article',
  });
}

export default async function Page({ params }: PageProps<'/blog/[slug]'>) {
  const { slug } = await params

  // Data: Get post by slug
  const post = source.getPage([slug])

  // Business logic: Check if post exists
  if (!post) return notFound()

  // Data: Prepare post body component
  const MDX = post.data.body

  // Data: Prepare related posts component
  const related = source.getPages().splice(0, 3)

  return (
    <SitePage>
      <SitePageHeader>
        <SitePageHeaderSection>
          <SitePageHeaderSectionGradient />
          <SitePageHeaderSectionContainer>
            <SitePageHeaderSectionBreadcrumb
              items={[
                { label: config.projectName, href: '/', isActive: false },
                { label: 'Blog', href: '/blog', isActive: false },
                {
                  label: post.data.title as string,
                  href: `/blog/${slug}`,
                  isActive: true,
                },
              ]}
            />
            <SitePageHeaderSectionContent className="lg:max-w-[60%] lg:px-8">
              {post.data.lastModified && (
                <p className="text-muted-foreground mb-1 text-sm">
                  {DateUtils.formatDate(post.data.lastModified, {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              )}
              <SitePageHeaderSectionTitle className="text-lg font-mono mb-2">
                {post.data.title}
              </SitePageHeaderSectionTitle>
              <SitePageHeaderSectionDescription>
                {post.data.description}
              </SitePageHeaderSectionDescription>
            </SitePageHeaderSectionContent>
          </SitePageHeaderSectionContainer>
        </SitePageHeaderSection>
      </SitePageHeader>

      <SitePageArticleProvider toc={post.data.toc}>
        <SitePageContent>
          {/* Render Blog Post Article */}
          <SitePageArticle>
            <SitePageArticleContainer>
              <SitePageArticleContent>
                {/* Render Blog Post Content */}
                <MDX components={getMDXComponents()} />

                {/* Render Blog Post Related */}
                <SitePageArticleRelated>
                  <SitePageArticleRelatedHeader />
                  <SitePageArticleRelatedList>
                    {related?.map((item) => (
                      <SitePageArticleRelatedItem
                        key={item.slugs[0]}
                        href={item.slugs[0]}
                      >
                        {item.data.title}
                      </SitePageArticleRelatedItem>
                    ))}
                  </SitePageArticleRelatedList>
                </SitePageArticleRelated>
              </SitePageArticleContent>

              {/* Render Blog Post Sidebar */}
              <SitePageArticleSidebar>
                {/* Render Blog Post Author */}
                <SitePageArticleAuthor>
                  <SitePageArticleAuthorTitle>
                    Written by
                  </SitePageArticleAuthorTitle>
                  <SitePageArticleAuthorLink href={config.creator.url}>
                    <SitePageArticleAuthorAvatar
                      src={config.creator.image}
                      alt={config.creator.name}
                      fallback={config.creator.name[0]}
                    />
                    <SitePageArticleAuthorInfo>
                      <SitePageArticleAuthorName>
                        {config.creator.name}
                      </SitePageArticleAuthorName>
                      <SitePageArticleAuthorRole>
                        {config.creator.role}
                      </SitePageArticleAuthorRole>
                    </SitePageArticleAuthorInfo>
                  </SitePageArticleAuthorLink>
                </SitePageArticleAuthor>

                {/* Render Blog Post Table of Contents */}
                <SitePageArticleTOC items={post.data.toc} />

                {/* Render Blog Post Tags */}
                <CTASection />
              </SitePageArticleSidebar>
            </SitePageArticleContainer>
          </SitePageArticle>
        </SitePageContent>
      </SitePageArticleProvider>
    </SitePage>
  )
}

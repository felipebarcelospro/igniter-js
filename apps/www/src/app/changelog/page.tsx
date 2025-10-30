import type { Metadata } from 'next/types'
import React from 'react'
import { source } from './source'
import {
  SitePageHeaderSection,
  SitePageHeaderSectionContainer,
  SitePageHeaderSectionGradient,
  SitePageHeaderSectionContent,
  SitePageHeaderSectionBreadcrumb,
  SitePageHeaderSectionTitle,
  SitePageHeaderSectionDescription,
  SitePageHeaderSectionActions,
} from '@/components/site/site-page-header-section'
import {
  SitePage,
  SitePageHeader,
  SitePageContent,
  SitePageFooter,
} from '@/components/site/site-page'
import { Button } from '@/components/ui/button'
import { RssIcon, XIcon } from 'lucide-react'
import { config } from '@/configs/application'
import { generateMetadataWithOG } from '@/lib/metadata'
import { ChangelogTimeline } from '@/components/site/site-changelog-timeline'
import { Tabs, Tab } from 'fumadocs-ui/components/tabs'
import type { ContentTypeUpdateEntry } from './source'

export const metadata: Metadata = generateMetadataWithOG({
  title: `Updates - ${config.projectName}`,
  description: `All the latest updates, improvements, and fixes to ${config.projectName}`,
  path: '/updates',
  ogImagePath: '/og/updates.jpg',
});

// Package names mapping
const PACKAGE_NAMES = {
  all: 'All Packages',
  core: '@igniter-js/core',
  cli: '@igniter-js/cli',
  'adapter-redis': '@igniter-js/adapter-redis',
  'adapter-bullmq': '@igniter-js/adapter-bullmq',
  'adapter-opentelemetry': '@igniter-js/adapter-opentelemetry',
  'adapter-mcp-server': '@igniter-js/adapter-mcp-server',
  bot: '@igniter-js/bot',
  'mcp-server': '@igniter-js/mcp-server',
  'eslint-config': '@igniter-js/eslint-config',
} as const

// Release date mapping based on "Released on" in MDX files
const RELEASE_DATES: Record<string, number> = {
  'v0.3.0': new Date('October 22, 2025').getTime(),
  'v0.2.70': new Date('October 22, 2025').getTime(),
  'v0.2.69': new Date('October 22, 2025').getTime(),
  'v0.2.68': new Date('August 29, 2025').getTime(),
  'v0.2.65': new Date('August 20, 2025').getTime(),
  'v0.2.62': new Date('August 20, 2025').getTime(),
  'v0.2.61': new Date('August 20, 2025').getTime(),
  'v0.2.0-alpha.0': new Date('June 30, 2025').getTime(),
  'v0.1.18': new Date('March 15, 2025').getTime(),
  'v0.1.17': new Date('March 15, 2025').getTime(),
  'v0.1.16': new Date('March 8, 2025').getTime(),
  'v0.1.15': new Date('March 7, 2025').getTime(),
  'v0.1.14': new Date('March 4, 2025').getTime(),
  'v0.1.13': new Date('February 28, 2025').getTime(),
  'v0.1.1': new Date('February 26, 2025').getTime(),
}

function extractReleaseDate(update: ContentTypeUpdateEntry): number {
  // Extract version from URL/filename
  const urlParts = update.url.split('/')
  const filename = urlParts[urlParts.length - 1] || urlParts[urlParts.length - 2]
  
  // Try to get date from mapping
  if (filename && RELEASE_DATES[filename]) {
    return RELEASE_DATES[filename]
  }
  
  // Fallback to lastModified
  if (update.data.lastModified) {
    return new Date(update.data.lastModified).getTime()
  }
  
  return 0
}

function categorizeUpdates(updates: ContentTypeUpdateEntry[]): Record<string, ContentTypeUpdateEntry[]> {
  const categorized: Record<string, ContentTypeUpdateEntry[]> = {
    all: [],
    core: [],
    cli: [],
    'adapter-redis': [],
    'adapter-bullmq': [],
    'adapter-opentelemetry': [],
    'adapter-mcp-server': [],
    bot: [],
    'mcp-server': [],
    'eslint-config': [],
  }

  updates.forEach((update) => {
    categorized.all.push(update)
    
    // Categorize based on title/content
    const title = update.data.title.toLowerCase()
    const description = (update.data.description || '').toLowerCase()
    
    if (title.includes('core') || description.includes('core')) {
      categorized.core.push(update)
    }
    if (title.includes('cli') || description.includes('cli')) {
      categorized.cli.push(update)
    }
    if (title.includes('redis') || description.includes('redis') || title.includes('store')) {
      categorized['adapter-redis'].push(update)
    }
    if (title.includes('bullmq') || title.includes('job') || description.includes('job')) {
      categorized['adapter-bullmq'].push(update)
    }
    if (title.includes('opentelemetry') || title.includes('telemetry') || description.includes('telemetry')) {
      categorized['adapter-opentelemetry'].push(update)
    }
    if (title.includes('mcp') || description.includes('mcp')) {
      categorized['adapter-mcp-server'].push(update)
      categorized['mcp-server'].push(update)
    }
    if (title.includes('bot') || description.includes('bot')) {
      categorized.bot.push(update)
    }
    if (title.includes('eslint') || description.includes('eslint')) {
      categorized['eslint-config'].push(update)
    }
  })

  // Sort all categories by date (most recent first)
  Object.keys(categorized).forEach((key) => {
    categorized[key].sort((a, b) => {
      const dateA = extractReleaseDate(a)
      const dateB = extractReleaseDate(b)
      return dateB - dateA
    })
  })

  return categorized
}

export default async function Page() {
  const updates = source.getPages()
  
  // Sort all updates by date (most recent first)
  const sortedUpdates = [...updates].sort((a, b) => {
    const dateA = extractReleaseDate(a)
    const dateB = extractReleaseDate(b)
    return dateB - dateA
  })

  const categorized = categorizeUpdates(sortedUpdates)

  // Only show tabs that have updates
  const availableTabs = Object.entries(categorized)
    .filter(([_, updates]) => updates.length > 0)
    .map(([key]) => key)

  return (
    <SitePage>

      <SitePageHeader>
        <SitePageHeaderSection>
          <SitePageHeaderSectionGradient />
          <SitePageHeaderSectionContainer>
            <SitePageHeaderSectionBreadcrumb
              items={[
                { label: config.projectName, href: '/', isActive: true },
                { label: 'Updates', href: '/updates', isActive: false },
              ]}
            />
            <SitePageHeaderSectionContent>
              <SitePageHeaderSectionTitle>Updates</SitePageHeaderSectionTitle>
              <SitePageHeaderSectionDescription>
                All the latest updates, improvements, and fixes to{' '}
                {config.projectName}
              </SitePageHeaderSectionDescription>
              <SitePageHeaderSectionActions>
                <Button className="bg-background" asChild variant="outline">
                  <a
                    href={config.twitterUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <XIcon />
                    Follow
                  </a>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="icon"
                  className="bg-background"
                  aria-label="RSS Feed"
                >
                  <a href="/rss" target="_blank" rel="noopener noreferrer">
                    <RssIcon />
                  </a>
                </Button>
              </SitePageHeaderSectionActions>
            </SitePageHeaderSectionContent>
          </SitePageHeaderSectionContainer>
        </SitePageHeaderSection>
      </SitePageHeader>

      <SitePageContent>
        {/* Timeline Section */}
        <section className="border-b">
          <div className="container mx-auto max-w-(--breakpoint-lg)">
            <div className="[&_*[data-slot='tabs-list']]:bg-background [&_*[data-slot='tabs-list']]:border-0 [&_*[data-slot='tabs-list']]:p-0 [&_*[data-slot='tabs-list']]:rounded-none">
              <Tabs 
                items={availableTabs.map(key => PACKAGE_NAMES[key as keyof typeof PACKAGE_NAMES])} 
                groupId="package-updates"
                className='bg-background border-none p-0 [&>div]:p-0 [&>div]:m-0 [&>div]:border-none [&>div]:bg-background'
              >
                {availableTabs.map((key) => (
                  <Tab key={key} value={PACKAGE_NAMES[key as keyof typeof PACKAGE_NAMES]}>
                    <ChangelogTimeline entries={categorized[key]} />
                  </Tab>
                ))}
              </Tabs>
            </div>
          </div>
        </section>
      </SitePageContent>

      <SitePageFooter />
    </SitePage>
  )
}

import { Metadata } from "next";
import { config } from "@/configs/application";
import { TemplatesSection } from "./(components)/templates-section";
import { source } from "./source";
import { toSerializableTemplates } from "./(lib)/template-utils";
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
import { generateMetadataWithOG } from '@/lib/metadata'

export const metadata: Metadata = generateMetadataWithOG({
  title: `Templates - ${config.projectName}`,
  description: `Explore a variety of production-ready templates to kickstart your projects with ${config.projectName}. From Next.js to Express, Bun, and more.`,
  path: '/templates',
  ogImagePath: '/og/templates.png',
});

export default function TemplatesPage() {
  const pages = source.getPages();
  const templates = toSerializableTemplates(pages);

  return (
    <SitePage>
      <SitePageHeader>
        <SitePageHeaderSection>
          <SitePageHeaderSectionGradient />
          <SitePageHeaderSectionContainer>
            <SitePageHeaderSectionBreadcrumb
              items={[
                { label: config.projectName, href: '/', isActive: false },
                { label: 'Templates', href: '/templates', isActive: true },
              ]}
            />
            <SitePageHeaderSectionContent className="pb-26">
              <SitePageHeaderSectionTitle>Templates</SitePageHeaderSectionTitle>
              <SitePageHeaderSectionDescription>
                Explore a variety of templates to kickstart your projects with {config.projectName}
              </SitePageHeaderSectionDescription>
            </SitePageHeaderSectionContent>
          </SitePageHeaderSectionContainer>
        </SitePageHeaderSection>
      </SitePageHeader>

      <SitePageContent>
        <TemplatesSection templates={templates} />
      </SitePageContent>

      <SitePageFooter />
    </SitePage>
  );
}
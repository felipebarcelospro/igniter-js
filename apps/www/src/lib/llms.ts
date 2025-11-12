import { contentManager } from '@/lib/content-manager';

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://igniterjs.com';

/**
 * Generate llms.txt content with introduction and organized links
 */
export async function generateLLMSTxt(): Promise<string> {
  const siteMetadata = contentManager.getSiteMetadata();
  const contentTypes = contentManager.getContentTypes();
  
  let content = `# Igniter.js - LLM Accessible Documentation

Welcome! This is an AI-friendly resource for understanding Igniter.js, the first AI-native TypeScript framework.

## About Igniter.js

${siteMetadata.description}

## Site Information

- **Website**: ${baseUrl}
- **GitHub**: https://github.com/felipebarcelospro/igniter-js
- **Documentation**: ${baseUrl}/docs
- **Creator**: ${siteMetadata.author}

## Content Structure

This site contains several types of content, each accessible via dedicated endpoints:

`;

  for (const type of contentTypes) {
    const sourceConfig = contentManager.getSourceConfig(type);
    if (!sourceConfig) continue;
    
    const pages = contentManager.getPages(type);
    
    content += `### ${sourceConfig.title} (${type})

${sourceConfig.description}

- **Full content**: ${baseUrl}/llms/${type}/full.txt
- **Individual pages**:
`;

    for (const page of pages) {
      content += `  - ${page.data.title}: ${baseUrl}${page.url}.mdx\n`;
    }
    
    content += '\n';
  }

  content += `## How to Access Content

### Full Content Files
- All content: ${baseUrl}/llms-full.txt
- Blog: ${baseUrl}/llms/blog/full.txt
- Documentation: ${baseUrl}/llms/docs/full.txt
- Learn Course: ${baseUrl}/llms/learn/full.txt
- Templates: ${baseUrl}/llms/templates/full.txt
- Showcase: ${baseUrl}/llms/showcase/full.txt
- Changelog: ${baseUrl}/llms/changelog/full.txt

### Individual Pages
Any page can be accessed in markdown format by appending .mdx to the URL:
- ${baseUrl}/docs/core/quick-start.mdx
- ${baseUrl}/blog/introducing-igniter-js.mdx

### RSS Feeds
- All content: ${baseUrl}/rss
- By type: ${baseUrl}/rss/[type] (blog, docs, learn, etc.)

### Sitemap
- ${baseUrl}/sitemap.xml

## Content Types Explained

- **blog**: Articles, tutorials, and announcements
- **docs**: Complete framework documentation
- **learn**: Step-by-step course tutorials
- **templates**: Starter templates and examples
- **showcase**: Projects built with Igniter.js
- **changelog**: Version updates and release notes

---

Last updated: ${new Date().toISOString()}
`;

  return content;
}

/**
 * Generate full content text for LLMs for a specific content type
 */
export async function generateLLMSFullTxt(type: 'blog' | 'docs' | 'changelog' | 'learn' | 'showcase' | 'templates'): Promise<string> {
  const sourceConfig = contentManager.getSourceConfig(type);
  if (!sourceConfig) {
    throw new Error(`Content type ${type} not found`);
  }

  const pages = contentManager.getPages(type);
  const contentSections: string[] = [];

  contentSections.push(`# ${sourceConfig.title} - Full Content`);
  contentSections.push(`\n${sourceConfig.description}\n`);
  contentSections.push(`---\n`);

  for (const page of pages) {
    const llmText = await contentManager.getLLMText(page);
    contentSections.push(llmText);
    contentSections.push('\n---\n');
  }

  return contentSections.join('\n');
}

/**
 * Generate full content text for all content types
 */
export async function generateAllLLMSFullTxt(): Promise<string> {
  const siteMetadata = contentManager.getSiteMetadata();
  const contentTypes = contentManager.getContentTypes();
  const contentSections: string[] = [];

  contentSections.push(`# ${siteMetadata.title} - Complete Documentation`);
  contentSections.push(`\n${siteMetadata.description}\n`);
  contentSections.push(`---\n`);

  for (const type of contentTypes) {
    const sourceConfig = contentManager.getSourceConfig(type);
    if (!sourceConfig) continue;

    contentSections.push(`\n# ${sourceConfig.title}\n`);
    contentSections.push(`${sourceConfig.description}\n`);
    contentSections.push(`---\n`);

    const pages = contentManager.getPages(type);
    
    for (const page of pages) {
      const llmText = await contentManager.getLLMText(page);
      contentSections.push(llmText);
      contentSections.push('\n---\n');
    }
  }

  return contentSections.join('\n');
}


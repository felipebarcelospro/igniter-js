import { NextResponse } from 'next/server';
import { config } from '@/configs/application';
import { FileSystemContentManager } from '@/lib/docs';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    // Get all documentation sections
    const docSections = await FileSystemContentManager.getNavigationItems('docs');
    
    // Flatten all docs from all sections
    const allDocs = docSections.flatMap(section => section.items);
    
    // Sort docs by category and title for better organization
    const sortedDocs = allDocs.sort((a, b) => {
      // First sort by category (getting-started first, then core-concepts, etc.)
      const categoryOrder = {
        'getting-started': 1,
        'core-concepts': 2,
        'client-side': 3,
        'starter-guides': 4,
        'cli-and-tooling': 5,
        'advanced-features': 6
      };
      
      const aCategoryOrder = categoryOrder[a.category as keyof typeof categoryOrder] || 999;
      const bCategoryOrder = categoryOrder[b.category as keyof typeof categoryOrder] || 999;
      
      if (aCategoryOrder !== bCategoryOrder) {
        return aCategoryOrder - bCategoryOrder;
      }
      
      // Then sort by title within category
      return a.title.localeCompare(b.title);
    });
    
    // Build the llms.txt content following the standard format
    let content = `# ${config.projectName}\n\n`;
    content += `> ${config.projectDescription}\n\n`;
    
    content += `This documentation provides comprehensive information about ${config.projectName}, a modern, type-safe HTTP framework for TypeScript applications. The content is organized to help LLMs understand the framework's architecture, features, and usage patterns.\n\n`;
    
    content += `## Project Information\n\n`;
    content += `- **Framework**: ${config.projectName}\n`;
    content += `- **Language**: TypeScript\n`;
    content += `- **Type**: HTTP Framework\n`;
    content += `- **Focus**: Type-safety, Developer Experience, Performance\n\n`;
    
    // Group docs by category
    const docsByCategory = sortedDocs.reduce((acc, doc) => {
      const category = doc.category || 'other';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(doc);
      return acc;
    }, {} as Record<string, typeof sortedDocs>);
    
    // Add each category as a section
    const categoryTitles = {
      'getting-started': 'Getting Started',
      'core-concepts': 'Core Concepts',
      'client-side': 'Client-Side Integration',
      'starter-guides': 'Starter Guides',
      'cli-and-tooling': 'CLI and Tooling',
      'advanced-features': 'Advanced Features'
    };
    
    Object.entries(docsByCategory).forEach(([category, docs]) => {
      const categoryTitle = categoryTitles[category as keyof typeof categoryTitles] || category;
      content += `## ${categoryTitle}\n\n`;
      
      docs.forEach(doc => {
        const url = `/docs/${doc.slug}`;
        content += `- [${doc.title}](${url}): ${doc.description || 'Documentation page'}\n`;
      });
      
      content += '\n';
    });
    
    // Add full content of each documentation page
    content += `## Full Documentation Content\n\n`;
    content += `Below is the complete content of all documentation pages for comprehensive LLM understanding:\n\n`;
    
    for (const doc of sortedDocs) {
      content += `### ${doc.title}\n\n`;
      content += `**Category**: ${doc.category}\n`;
      content += `**URL**: /docs/${doc.slug}\n\n`;
      
      if (doc.description) {
        content += `**Description**: ${doc.description}\n\n`;
      }
      
      // Read the actual MDX file content
      try {
        const contentDir = path.join(process.cwd(), 'src/app/(content)');
        const filePath = path.join(contentDir, 'docs', '(posts)', doc.slug, 'page.mdx');
        
        if (fs.existsSync(filePath)) {
          const fileContent = fs.readFileSync(filePath, 'utf8');
          // Remove frontmatter if present
          const contentWithoutFrontmatter = fileContent.replace(/^---[\s\S]*?---\n/, '');
          content += contentWithoutFrontmatter;
        } else {
          content += `Content not found for ${doc.title}`;
        }
      } catch (error) {
        content += `Error reading content for ${doc.title}: ${error}`;
      }
      
      content += '\n\n---\n\n';
    }
    
    // Add blog content as optional section
    const blogSections = await FileSystemContentManager.getNavigationItems('blog');
    const blogPosts = blogSections.flatMap(section => section.items);
    
    if (blogPosts.length > 0) {
      content += `## Optional\n\n`;
      content += `Additional blog content and tutorials:\n\n`;
      
      blogPosts.forEach(post => {
        const url = `/blog/${post.slug}`;
        content += `- [${post.title}](${url}): ${post.description || 'Blog post'}\n`;
      });
    }
    
    return new NextResponse(content, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600'
      }
    });
  } catch (error) {
    console.error('Error generating llms.txt:', error);
    return new NextResponse('Error generating llms.txt', { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
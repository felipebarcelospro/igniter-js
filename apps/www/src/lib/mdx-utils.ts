import fs from 'fs/promises';
import path from 'path';

/**
 * Extracts the main H1 title from an MDX file.
 * @param slug - The slug array from the route parameters.
 * @param basePath - The base directory path (e.g., '(content)/blog/(posts)').
 * @returns The extracted title or a default string.
 */
export async function getTitleFromMdx(slug: string[], basePath: string): Promise<string> {
  // Construct the full path to the potential MDX file.
  // Example: /path/to/project/apps/www/src/app/(content)/blog/(posts)/category/post-name/page.mdx
  const filePath = path.join(
    process.cwd(),
    'src',
    'app',
    basePath,
    ...slug,
    'page.mdx'
  );

  try {
    const content = await fs.readFile(filePath, 'utf-8');
    
    // Use regex to find the first H1 heading.
    const titleMatch = content.match(/^#\s+(.*)/m);
    
    return titleMatch ? titleMatch[1] : 'Igniter.js';
  } catch (error) {
    // If the file doesn't exist or another error occurs, return the default title.
    console.error(`Could not read MDX file for slug "${slug.join('/')}":`, error);
    return 'Igniter.js';
  }
}

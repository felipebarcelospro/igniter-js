import { ContentTypeShowcase } from "../source";

/**
 * Serializable showcase data that can be passed to client components
 */
export interface SerializableShowcase {
  slug: string;
  title: string;
  description: string;
  image: string;
  url: string;
  repository?: string;
  tech: string[];
  author: string;
  featured?: boolean;
  category?: 'saas' | 'ecommerce' | 'enterprise' | 'open-source' | 'education' | 'other';
}

/**
 * Converts a Fumadocs page to a serializable showcase object
 */
export function toSerializableShowcase(page: ContentTypeShowcase): SerializableShowcase {
  return {
    slug: page.slugs.join('/'),
    title: page.data.title,
    description: page.data.description || '',
    image: page.data.image,
    url: page.data.url,
    repository: page.data.repository,
    tech: page.data.tech,
    author: page.data.author,
    featured: page.data.featured,
    category: page.data.category,
  };
}

/**
 * Converts multiple Fumadocs pages to serializable showcase objects
 */
export function toSerializableShowcases(pages: ContentTypeShowcase[]): SerializableShowcase[] {
  return pages.map(toSerializableShowcase);
}

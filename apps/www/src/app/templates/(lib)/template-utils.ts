import { ContentTypeTemplate } from "../source";

/**
 * Serializable template data that can be passed to client components
 */
export interface SerializableTemplate {
  id: string;
  title: string;
  description: string;
  framework: string;
  demo: string;
  cover: string;
  repository?: string;
  stack: string[];
  useCases: string[];
  creator: {
    username: string;
    name?: string;
    avatar?: string;
  };
}

/**
 * Converts a Fumadocs page to a serializable template object
 */
export function toSerializableTemplate(page: ContentTypeTemplate): SerializableTemplate {
  return {
    id: page.slugs.join('/'),
    title: page.data.title,
    description: page.data.description || '',
    framework: page.data.framework,
    demo: page.data.demo,
    cover: page.data.cover,
    repository: page.data.repository,
    stack: page.data.stack,
    useCases: page.data.useCases,
    creator: page.data.creator,
  };
}

/**
 * Converts multiple Fumadocs pages to serializable template objects
 */
export function toSerializableTemplates(pages: ContentTypeTemplate[]): SerializableTemplate[] {
  return pages.map(toSerializableTemplate);
}

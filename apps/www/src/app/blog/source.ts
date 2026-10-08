import { blog } from '@/.source'
import { InferPageType, loader } from 'fumadocs-core/source'

/**
 * @constant source
 * @description Loader for the blog, using configuration from source.config.ts.
 */
export const source = loader({
  baseUrl: '/blog',
  source: blog.toFumadocsSource(),
})

/** Return blog posts in explicit publication order, newest first. */
export function getBlogPostsByPublicationDate() {
  return source.getPages().sort((a, b) => {
    const dateOrder = b.data.publishedAt.getTime() - a.data.publishedAt.getTime()
    return dateOrder || a.slugs.join('/').localeCompare(b.slugs.join('/'))
  })
}

/**
 * @constant ContentTypeBlogEntry
 * @description Type for the Blog contents
 */
export type ContentTypeBlogEntry = InferPageType<typeof source>

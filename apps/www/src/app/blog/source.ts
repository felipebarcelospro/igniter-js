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

/**
 * @constant ContentTypeBlogEntry
 * @description Type for the Blog contents
 */
export type ContentTypeBlogEntry = InferPageType<typeof source>

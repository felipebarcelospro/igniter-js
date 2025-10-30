import { showcase } from '@/.source'
import { InferPageType, loader } from 'fumadocs-core/source'

/**
 * @constant source
 * @description Loader for the showcase, using configuration from source.config.ts.
 */
export const source = loader({
  baseUrl: '/showcase',
  source: showcase.toFumadocsSource(),
})

/**
 * @constant ContentTypeShowcase
 * @description Type for the Showcase contents
 */
export type ContentTypeShowcase = InferPageType<typeof source>

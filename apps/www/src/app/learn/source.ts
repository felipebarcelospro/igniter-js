import { learn } from '@/.source'
import { InferPageType, loader } from 'fumadocs-core/source'

/**
 * @constant source
 * @description Loader for the learn section, using configuration from source.config.ts.
 */
export const source = loader({
  baseUrl: '/learn/course',
  source: learn.toFumadocsSource(),
})

/**
 * @constant ContentTypeLearnEntry
 * @description Type for the Learn contents
 */
export type ContentTypeLearnEntry = InferPageType<typeof source>

import { templates } from '@/.source'
import { InferPageType, loader } from 'fumadocs-core/source'

/**
 * @constant source
 * @description Loader for the templates, using configuration from source.config.ts.
 */
export const source = loader({
  baseUrl: '/templates',
  source: templates.toFumadocsSource(),
})

/**
 * @constant ContentTypeTemplate
 * @description Type for the Template contents
 */
export type ContentTypeTemplate = InferPageType<typeof source>
import { updates } from '@/.source'
import { type InferPageType, loader } from 'fumadocs-core/source'

/**
 * @constant source
 * @description Loader for the Updates(changelog) contents
 */
export const source = loader({
  baseUrl: '/updates',
  source: updates.toFumadocsSource(),
})

/**
 * @constant ContentTypeUpdateEntry
 * @description Type for the Updates(changelog) contents
 */
export type ContentTypeUpdateEntry = InferPageType<typeof source>

/**
 * @fileoverview Serializer types for @igniter-js/store
 * @module @igniter-js/store/types/serializer
 */

/**
 * Serializer interface for encoding/decoding values in the store.
 *
 * @example
 * ```typescript
 * // Default JSON serializer
 * const jsonSerializer: IgniterStoreSerializer = {
 *   encode: JSON.stringify,
 *   decode: JSON.parse,
 * }
 *
 * // Custom MessagePack serializer
 * import { encode, decode } from '@msgpack/msgpack'
 * const msgpackSerializer: IgniterStoreSerializer = {
 *   encode: (value) => Buffer.from(encode(value)).toString('base64'),
 *   decode: (value) => decode(Buffer.from(value, 'base64')),
 * }
 * ```
 */
export interface IgniterStoreSerializer {
  /**
   * Encodes a value to a string for storage.
   *
   * @param value - The value to encode
   * @returns The encoded string
   */
  encode: (value: any) => string

  /**
   * Decodes a string back to its original value.
   *
   * @param value - The string to decode
   * @returns The decoded value
   */
  decode: (value: string) => any
}

/**
 * Default JSON serializer implementation.
 */
export const DEFAULT_SERIALIZER: IgniterStoreSerializer = {
  encode: JSON.stringify,
  decode: JSON.parse,
}

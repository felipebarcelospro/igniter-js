import { IgniterStoreError } from "../errors/store.error"
import { RESERVED_NAMESPACE_PREFIXES } from "../types/builder"

/**
 * Validator for event names and related identifiers.
 */
export class IgniterStoreEventValidator {

  /**
   * Validates that a namespace is not reserved.
   *
   * @param namespace - The namespace to validate
   */
  static ensureValidNamespace(namespace: string): void {
    if (!namespace || typeof namespace !== "string") {
      throw new IgniterStoreError({
        code: "STORE_INVALID_NAMESPACE",
        message: "Namespace must be a non-empty string",
        statusCode: 400,
      });
    }
  
    if (namespace.includes(".")) {
      throw new IgniterStoreError({
        code: "STORE_INVALID_NAMESPACE",
        message: `Namespace "${namespace}" cannot contain dots (.). Use kebab-case for multi-word names.`,
        statusCode: 400,
        details: { namespace },
      });
    }
  
    if (namespace.includes(":")) {
      throw new IgniterStoreError({
        code: "STORE_INVALID_NAMESPACE",
        message: `Namespace "${namespace}" cannot contain colons (:). The colon is added automatically between namespace and event name.`,
        statusCode: 400,
        details: { namespace },
      });
    }
  
    const lowerNamespace = namespace.toLowerCase();
    for (const reserved of RESERVED_NAMESPACE_PREFIXES) {
      if (
        lowerNamespace === reserved ||
        lowerNamespace.startsWith(`${reserved}-`) ||
        lowerNamespace.startsWith(`${reserved}_`)
      ) {
        throw new IgniterStoreError({
          code: "STORE_RESERVED_NAMESPACE",
          message: `Namespace "${namespace}" is reserved for internal Igniter.js use. Please choose a different namespace.`,
          statusCode: 400,
          details: { namespace, reserved },
        });
      }
    }
  }

  /**
   * Validates that a name does not contain dots or reserved characters.
   *
   * @param name - The name to validate
   * @param context - Context for error messages (e.g., 'event', 'group', 'namespace')
   */
  static ensureValidName(name: string, context: string): void {
    if (!name || typeof name !== 'string') {
      throw new IgniterStoreError({
        code: 'STORE_INVALID_EVENT_NAME',
        message: `${context} name must be a non-empty string`,
        statusCode: 400,
      })
    }

    if (name.includes('.')) {
      throw new IgniterStoreError({
        code: 'STORE_INVALID_EVENT_NAME',
        message: `${context} name "${name}" cannot contain dots (.). Use colons (:) for namespacing or kebab-case for multi-word names.`,
        statusCode: 400,
        details: { name, context },
      })
    }

    if (name.includes(' ')) {
      throw new IgniterStoreError({
        code: 'STORE_INVALID_EVENT_NAME',
        message: `${context} name "${name}" cannot contain spaces. Use kebab-case or snake_case.`,
        statusCode: 400,
        details: { name, context },
      })
    }

    // Check for reserved prefixes
    const reservedPrefixes = ['igniter', 'ign', '__'] as const
    for (const prefix of reservedPrefixes) {
      if (name.toLowerCase().startsWith(prefix)) {
        throw new IgniterStoreError({
          code: 'STORE_RESERVED_NAMESPACE',
          message: `${context} name "${name}" uses reserved prefix "${prefix}". Reserved namespaces are for internal Igniter.js use.`,
          statusCode: 400,
          details: { name, prefix, context },
        })
      }
    }
  }
}

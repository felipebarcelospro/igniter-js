import { IgniterTelemetryError } from "../errors"

/**
 * Validates event names and namespaces.
 */
export class IgniterTelemetryValidator {
  /**
   * Reserved namespace prefixes that cannot be used by user code.
   */
  private static readonly RESERVED_NAMESPACE_PREFIXES = [
    '__',
    '__internal',
  ] as const

  /**
   * Validates that a name does not contain invalid characters.
   *
   * @param name - The name to validate
   * @param context - Context for error messages (e.g., 'event', 'group', 'namespace')
   */
  static validate(name: string, context: string): void {
    if (context === 'Namespace') {
      this.validateNamespace(name)
      return
    }

    if (context === 'Event' || context === 'Group') {
      this.validateEventName(name, context)
      return
    }

    throw new IgniterTelemetryError({
      code: 'TELEMETRY_SCHEMA_VALIDATION_FAILED',
      message: `Unknown validation context "${context}"`,
      statusCode: 400,
      details: { context },
    })
  }

  /**
   * Validates that a name does not contain invalid characters.
   *
   * @param name - The name to validate
   * @param context - Context for error messages (e.g., 'event', 'group', 'namespace')
   */
  static validateEventName(name: string, context: string): void {
    if (!name || typeof name !== 'string') {
      throw new IgniterTelemetryError({
        code: 'TELEMETRY_INVALID_EVENT_NAME',
        message: `${context} name must be a non-empty string`,
        statusCode: 400,
      })
    }
  
    if (name.includes(':')) {
      throw new IgniterTelemetryError({
        code: 'TELEMETRY_INVALID_EVENT_NAME',
        message: `${context} name "${name}" cannot contain colons (:). Use dots (.) for namespacing.`,
        statusCode: 400,
        details: { name, context },
      })
    }
  
    if (name.includes(' ')) {
      throw new IgniterTelemetryError({
        code: 'TELEMETRY_INVALID_EVENT_NAME',
        message: `${context} name "${name}" cannot contain spaces. Use kebab-case or snake_case.`,
        statusCode: 400,
        details: { name, context },
      })
    }
  
    // Check for reserved prefixes
    for (const prefix of this.RESERVED_NAMESPACE_PREFIXES) {
      if (name.toLowerCase().startsWith(prefix)) {
        throw new IgniterTelemetryError({
          code: 'TELEMETRY_RESERVED_NAMESPACE',
          message: `${context} name "${name}" uses reserved prefix "${prefix}".`,
          statusCode: 400,
          details: { name, prefix, context },
        })
      }
    }
  }
  
  /**
   * Validates a namespace string.
   *
   * @param namespace - The namespace to validate
   */
  static validateNamespace(namespace: string): void {
    if (!namespace || typeof namespace !== 'string') {
      throw new IgniterTelemetryError({
        code: 'TELEMETRY_INVALID_NAMESPACE',
        message: 'Namespace must be a non-empty string',
        statusCode: 400,
      })
    }
  
    if (namespace.includes(':')) {
      throw new IgniterTelemetryError({
        code: 'TELEMETRY_INVALID_NAMESPACE',
        message: `Namespace "${namespace}" cannot contain colons (:). Use dots (.) for namespacing.`,
        statusCode: 400,
        details: { namespace },
      })
    }
  
    if (namespace.includes(' ')) {
      throw new IgniterTelemetryError({
        code: 'TELEMETRY_INVALID_NAMESPACE',
        message: `Namespace "${namespace}" cannot contain spaces.`,
        statusCode: 400,
        details: { namespace },
      })
    }
  }
}

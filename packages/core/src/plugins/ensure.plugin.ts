/**
 * @fileoverview Ensure - Type-safe validation and assertion utility for Igniter.js
 *
 * The Ensure service provides a comprehensive set of validation methods that throw
 * consistent, well-formatted errors when conditions are not met. Perfect for:
 * - Input validation in actions and procedures
 * - Runtime type checking
 * - Business logic assertions
 * - Data consistency validation
 *
 * @example Basic Usage
 * ```typescript
 * import { Ensure } from '@igniter-js/core/services'
 *
 * // In an action handler
 * handler: async ({ request, context }) => {
 *   const userId = Ensure.toBeNotEmpty(request.params.id, 'User ID is required')
 *   const user = Ensure.toBeDefined(await getUser(userId), 'User not found')
 *   return context.response.success({ user })
 * }
 * ```
 *
 * @example As Plugin (Recommended)
 * ```typescript
 * const ensurePlugin = createIgniterPlugin({
 *   name: 'ensure',
 *   build: () => Ensure.initialize('MyApp')
 * })
 *
 * // Usage in handlers
 * handler: ({ context }) => {
 *   context.$plugins.ensure.toBeDefined(value, 'Custom error message')
 * }
 * ```
 */

import {
  createIgniterPlugin,
  createIgniterPluginAction,
} from "../types/plugin.interface";
import { z } from "zod";

/**
 * **AI AGENT INSTRUCTIONS:**
 *
 * Use Ensure service methods when you need to:
 * 1. **Validate required parameters**: Use `toBeNotEmpty()` or `toBeDefined()`
 * 2. **Type checking**: Use `toBeType()` for runtime type validation
 * 3. **Business rules**: Use `toBeEqual()`, `toBeOneOf()`, or `toMatchPattern()`
 * 4. **Data validation**: Use `toBeValidEmail()`, `toBeValidUrl()`, `toBeInRange()`
 * 5. **Array validation**: Use `toBeValidArray()` or `toBeAtLeast()`
 * 6. **Property validation**: Use `toBeValidProperty()` for object property checks
 *
 * **When NOT to use Ensure:**
 * - For schema validation (use Zod/StandardSchema in action definitions instead)
 * - For HTTP error responses (use context.response methods instead)
 * - For complex business logic (create dedicated validation functions)
 *
 * **Best Practices:**
 * - Always provide clear, user-friendly error messages
 * - Use early returns with Ensure at the top of handlers
 * - Combine multiple validations when possible
 * - Prefer schema validation for request body/query parameters
 */

export class Ensure {
  static prefix: string = "Igniter";

  /**
   * Custom error class for validation failures with enhanced formatting
   *
   * Features:
   * - Timestamped error messages
   * - Stack trace location extraction
   * - Consistent error naming convention
   * - Production-ready error formatting
   *
   * @class EnsureError
   * @extends Error
   */
  static Error = class EnsureError extends Error {
    constructor(message: string) {
      const timestamp = new Date().toLocaleTimeString();
      const stackLine = new Error().stack?.split("\n")[2]?.trim() || "";
      const errorLocation = stackLine.match(/\((.*?)\)/)
        ? stackLine.match(/\((.*?)\)/)?.[1]
        : stackLine;

      const formattedMessage = `[${Ensure.prefix}_ENSURE_ERROR] ${timestamp} ${errorLocation} - ${message}`;
      super(formattedMessage);

      this.name = `${Ensure.prefix}_ENSURE_ERROR`;
    }
  };

  /**
   * Throws a formatted Ensure error with consistent styling
   *
   * @param message - Error message to display
   * @throws {EnsureError} Always throws with formatted message
   *
   * @example
   * ```typescript
   * if (invalidCondition) {
   *   Ensure.error('Custom validation failed')
   * }
   * ```
   */
  static error(message: string): never {
    throw new Ensure.Error(message);
  }

  /**
   * Initialize Ensure with a custom prefix for error messages
   *
   * @param name - Prefix to use in error messages (e.g., 'MyApp', 'API')
   * @returns The Ensure class with updated prefix
   *
   * @example
   * ```typescript
   * const MyEnsure = Ensure.initialize('MyApp')
   * // Error messages will now start with [MyApp_ENSURE_ERROR]
   * ```
   */
  static initialize(name: string) {
    Ensure.prefix = name;
    return Ensure;
  }

  /**
   * Ensures a value is one of the provided options
   *
   * **Use Cases:**
   * - Enum validation
   * - Status validation
   * - Role-based access control
   * - Configuration validation
   *
   * @template T - Type of the value and options
   * @param value - Value to validate
   * @param options - Array of valid options
   * @param message - Custom error message
   * @returns The validated value
   * @throws {EnsureError} When value is not in options
   *
   * @example Basic Usage
   * ```typescript
   * const status = Ensure.toBeOneOf(userInput, ['active', 'inactive'], 'Invalid status')
   * ```
   *
   * @example In Action Handler
   * ```typescript
   * handler: async ({ request, context }) => {
   *   const role = Ensure.toBeOneOf(
   *     request.body.role,
   *     ['admin', 'user', 'guest'],
   *     'Role must be admin, user, or guest'
   *   )
   *   // role is now typed as 'admin' | 'user' | 'guest'
   * }
   * ```
   *
   * @example With Enums
   * ```typescript
   * enum UserStatus { ACTIVE = 'active', INACTIVE = 'inactive' }
   * const status = Ensure.toBeOneOf(input, Object.values(UserStatus))
   * ```
   */
  static toBeOneOf = <T>(value: T, options: T[], message?: string): T => {
    if (!options.includes(value)) {
      throw new Ensure.Error(
        message || `Value must be one of: ${options.join(", ")}`,
      );
    }
    return value;
  };

  /**
   * Ensures a value matches the expected TypeScript type at runtime
   *
   * **Use Cases:**
   * - Runtime type validation
   * - API parameter validation
   * - Dynamic data validation
   * - Third-party data validation
   *
   * @template T - Type of value being checked
   * @param value - Value to type-check
   * @param expectedType - Expected JavaScript type
   * @param message - Custom error message
   * @returns The type-validated value
   * @throws {EnsureError} When value type doesn't match
   *
   * @example Basic Type Checking
   * ```typescript
   * const count = Ensure.toBeType(userInput, 'number', 'Count must be a number')
   * const name = Ensure.toBeType(userInput, 'string', 'Name must be a string')
   * ```
   *
   * @example In Action Handler
   * ```typescript
   * handler: async ({ request, context }) => {
   *   const config = Ensure.toBeType(
   *     request.body.config,
   *     'object',
   *     'Configuration must be an object'
   *   )
   *   // TypeScript now knows config is an object
   * }
   * ```
   *
   * @example Advanced Usage
   * ```typescript
   * // Validate dynamic API responses
   * const apiResponse = await fetch('/api/data')
   * const data = Ensure.toBeType(apiResponse.data, 'object', 'Invalid API response')
   * ```
   */
  static toBeType = <T>(
    value: T,
    expectedType:
      | "string"
      | "number"
      | "boolean"
      | "object"
      | "function"
      | "undefined"
      | "symbol"
      | "bigint"
      | "array"
      | "null",
    message?: string,
  ): T => {
    const valueType = Array.isArray(value)
      ? "array"
      : value === null
        ? "null"
        : typeof value;

    if (valueType !== expectedType) {
      const defaultMessage = `Expected ${expectedType}, but received ${valueType}`;
      throw new Ensure.Error(message || defaultMessage);
    }

    return value;
  };

  /**
   * Ensures a value is not empty (not null, undefined, or empty string)
   *
   * **Use Cases:**
   * - Required field validation
   * - Parameter validation
   * - Form input validation
   * - Database key validation
   *
   * @template T - Type of value being checked
   * @param value - Value to check for emptiness
   * @param message - Custom error message
   * @returns The non-empty value
   * @throws {EnsureError} When value is empty
   *
   * @example Required Parameters
   * ```typescript
   * handler: async ({ request, context }) => {
   *   const userId = Ensure.toBeNotEmpty(request.params.id, 'User ID is required')
   *   const email = Ensure.toBeNotEmpty(request.body.email, 'Email is required')
   * }
   * ```
   *
   * @example API Validation
   * ```typescript
   * const apiKey = Ensure.toBeNotEmpty(
   *   process.env.API_KEY,
   *   'API_KEY environment variable is required'
   * )
   * ```
   *
   * @example Database Operations
   * ```typescript
   * const recordId = Ensure.toBeNotEmpty(id, 'Record ID cannot be empty')
   * const record = await db.findUnique({ where: { id: recordId } })
   * ```
   */
  static toBeNotEmpty = <T>(value: T, message?: string): T => {
    if (value === undefined || value === null || value === "") {
      throw new Ensure.Error(message || "Value cannot be empty");
    }
    return value;
  };

  /**
   * Ensures a value is defined (not null or undefined)
   *
   * **Use Cases:**
   * - Optional parameter validation
   * - Database record validation
   * - API response validation
   * - Service dependency validation
   *
   * @template T - Type of value being checked
   * @param value - Value to check if defined
   * @param message - Custom error message
   * @returns The defined value with null/undefined removed from type
   * @throws {EnsureError} When value is null or undefined
   *
   * @example Database Records
   * ```typescript
   * handler: async ({ request, context }) => {
   *   const user = await context.database.user.findUnique({
   *     where: { id: request.params.id }
   *   })
   *
   *   const validUser = Ensure.toBeDefined(user, 'User not found')
   *   // TypeScript now knows validUser is definitely not null/undefined
   *   return context.response.success({ user: validUser })
   * }
   * ```
   *
   * @example Service Dependencies
   * ```typescript
   * const emailService = Ensure.toBeDefined(
   *   context.$plugins.email,
   *   'Email service is not configured'
   * )
   * await emailService.send(...)
   * ```
   *
   * @example API Responses
   * ```typescript
   * const apiData = await fetchUserData(id)
   * const userData = Ensure.toBeDefined(apiData, 'Failed to fetch user data')
   * ```
   */
  static toBeDefined = <T>(
    value: T | null | undefined,
    message?: string,
  ): NonNullable<T> => {
    if (value === undefined || value === null) {
      throw new Ensure.Error(message || "Value must be defined");
    }
    return value as NonNullable<T>;
  };

  /**
   * Ensures a value is truthy
   *
   * **Use Cases:**
   * - Boolean condition validation
   * - Feature flag validation
   * - Permission validation
   * - Configuration validation
   *
   * @template T - Type of value being checked
   * @param value - Value to check if truthy
   * @param message - Custom error message
   * @returns The truthy value
   * @throws {EnsureError} When value is falsy
   *
   * @example Feature Flags
   * ```typescript
   * const isFeatureEnabled = Ensure.toBeTruthy(
   *   config.enableNewFeature,
   *   'New feature is not enabled'
   * )
   * ```
   *
   * @example Permissions
   * ```typescript
   * handler: async ({ context }) => {
   *   const canAccess = Ensure.toBeTruthy(
   *     context.user.permissions.canRead,
   *     'Insufficient permissions to read this resource'
   *   )
   * }
   * ```
   *
   * @example Configuration
   * ```typescript
   * const dbConnected = Ensure.toBeTruthy(
   *   context.database.isConnected,
   *   'Database connection is not available'
   * )
   * ```
   */
  static toBeTruthy = <T>(value: T, message?: string): T => {
    if (!value) {
      throw new Ensure.Error(message || "Value must be truthy");
    }
    return value;
  };

  /**
   * Ensures a string matches a regular expression pattern
   *
   * **Use Cases:**
   * - Input format validation
   * - ID format validation
   * - Code validation
   * - Custom pattern matching
   *
   * @param value - String to validate
   * @param pattern - Regular expression to match against
   * @param message - Custom error message
   * @returns The validated string
   * @throws {EnsureError} When string doesn't match pattern
   *
   * @example Phone Number Validation
   * ```typescript
   * const phonePattern = /^\+?[\d\s\-\(\)]+$/
   * const phone = Ensure.toMatchPattern(
   *   request.body.phone,
   *   phonePattern,
   *   'Invalid phone number format'
   * )
   * ```
   *
   * @example UUID Validation
   * ```typescript
   * const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
   * const id = Ensure.toMatchPattern(
   *   request.params.id,
   *   uuidPattern,
   *   'Invalid UUID format'
   * )
   * ```
   *
   * @example Custom Code Validation
   * ```typescript
   * const codePattern = /^[A-Z]{2}\d{4}$/
   * const productCode = Ensure.toMatchPattern(
   *   input,
   *   codePattern,
   *   'Product code must be 2 letters followed by 4 digits'
   * )
   * ```
   */
  static toMatchPattern = (
    value: string,
    pattern: RegExp,
    message?: string,
  ): string => {
    if (!pattern.test(value)) {
      throw new Ensure.Error(
        message ||
          `Value "${value}" does not match required pattern ${pattern}`,
      );
    }
    return value;
  };

  /**
   * Ensures a number is within a specified range (inclusive)
   *
   * **Use Cases:**
   * - Age validation
   * - Score validation
   * - Pagination limits
   * - Price validation
   *
   * @param value - Number to validate
   * @param min - Minimum allowed value (inclusive)
   * @param max - Maximum allowed value (inclusive)
   * @param message - Custom error message
   * @returns The validated number
   * @throws {EnsureError} When number is outside range
   *
   * @example Age Validation
   * ```typescript
   * const age = Ensure.toBeInRange(
   *   request.body.age,
   *   0,
   *   120,
   *   'Age must be between 0 and 120'
   * )
   * ```
   *
   * @example Pagination
   * ```typescript
   * const page = Ensure.toBeInRange(
   *   request.query.page || 1,
   *   1,
   *   1000,
   *   'Page number must be between 1 and 1000'
   * )
   * ```
   *
   * @example Score Validation
   * ```typescript
   * const score = Ensure.toBeInRange(
   *   userScore,
   *   0,
   *   100,
   *   'Score must be between 0 and 100'
   * )
   * ```
   */
  static toBeInRange = (
    value: number,
    min: number,
    max: number,
    message?: string,
  ): number => {
    if (value < min || value > max) {
      throw new Ensure.Error(
        message || `Value ${value} must be between ${min} and ${max}`,
      );
    }
    return value;
  };

  /**
   * Checks if a value is empty without throwing an error
   *
   * **Use Cases:**
   * - Conditional validation
   * - Optional field checking
   * - Form validation logic
   * - Data preprocessing
   *
   * @template T - Type of value being checked
   * @param value - Value to check for emptiness
   * @returns True if value is empty, false otherwise
   *
   * @example Conditional Validation
   * ```typescript
   * handler: async ({ request, context }) => {
   *   if (!Ensure.isEmpty(request.body.optionalField)) {
   *     // Only validate if not empty
   *     const validField = Ensure.toBeValidEmail(request.body.optionalField)
   *   }
   * }
   * ```
   *
   * @example Form Processing
   * ```typescript
   * const processForm = (formData) => {
   *   const errors = []
   *
   *   if (Ensure.isEmpty(formData.email)) {
   *     errors.push('Email is required')
   *   }
   *
   *   return errors
   * }
   * ```
   */
  static isEmpty = <T>(value: T): boolean => {
    return value === undefined || value === null || value === "";
  };

  /**
   * Ensures a string is a valid email address
   *
   * **Use Cases:**
   * - User registration
   * - Contact form validation
   * - Newsletter subscriptions
   * - Communication validation
   *
   * @param value - Email address to validate
   * @param message - Custom error message
   * @returns The validated email address
   * @throws {EnsureError} When email format is invalid
   *
   * @example User Registration
   * ```typescript
   * handler: async ({ request, context }) => {
   *   const email = Ensure.toBeValidEmail(
   *     request.body.email,
   *     'Please provide a valid email address'
   *   )
   *
   *   const user = await context.database.user.create({
   *     data: { email }
   *   })
   * }
   * ```
   *
   * @example Contact Form
   * ```typescript
   * const contactEmail = Ensure.toBeValidEmail(
   *   formData.email,
   *   'Valid email required for contact'
   * )
   * ```
   */
  static toBeValidEmail = (value: string, message?: string): string => {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(value)) {
      throw new Ensure.Error(
        message || `"${value}" is not a valid email address`,
      );
    }
    return value;
  };

  /**
   * Ensures a string or array has at least the minimum length
   *
   * **Use Cases:**
   * - Password strength validation
   * - Content length validation
   * - Array size validation
   * - Input requirements
   *
   * @param value - String or array to check length
   * @param minLength - Minimum required length
   * @param message - Custom error message
   * @returns The validated string or array
   * @throws {EnsureError} When length is below minimum
   *
   * @example Password Validation
   * ```typescript
   * const password = Ensure.toBeAtLeast(
   *   request.body.password,
   *   8,
   *   'Password must be at least 8 characters long'
   * )
   * ```
   *
   * @example Array Validation
   * ```typescript
   * const tags = Ensure.toBeAtLeast(
   *   request.body.tags,
   *   1,
   *   'At least one tag is required'
   * )
   * ```
   *
   * @example Content Requirements
   * ```typescript
   * const description = Ensure.toBeAtLeast(
   *   request.body.description,
   *   10,
   *   'Description must be at least 10 characters'
   * )
   * ```
   */
  static toBeAtLeast = (
    value: string | Array<any>,
    minLength: number,
    message?: string,
  ): string | Array<any> => {
    if (value.length < minLength) {
      throw new Ensure.Error(
        message ||
          `Value must be at least ${minLength} ${Array.isArray(value) ? "items" : "characters"} long`,
      );
    }
    return value;
  };

  /**
   * Ensures a string has at most the maximum length
   *
   * **Use Cases:**
   * - Character limit validation
   * - Database field constraints
   * - Social media post limits
   * - Form input limits
   *
   * @param value - String to check length
   * @param maxLength - Maximum allowed length
   * @param message - Custom error message
   * @returns The validated string
   * @throws {EnsureError} When string exceeds maximum length
   *
   * @example Social Media Posts
   * ```typescript
   * const tweet = Ensure.toBeAtMost(
   *   request.body.content,
   *   280,
   *   'Tweet cannot exceed 280 characters'
   * )
   * ```
   *
   * @example Database Constraints
   * ```typescript
   * const username = Ensure.toBeAtMost(
   *   request.body.username,
   *   50,
   *   'Username cannot exceed 50 characters'
   * )
   * ```
   *
   * @example Form Validation
   * ```typescript
   * const bio = Ensure.toBeAtMost(
   *   request.body.bio,
   *   500,
   *   'Bio cannot exceed 500 characters'
   * )
   * ```
   */
  static toBeAtMost = (
    value: string,
    maxLength: number,
    message?: string,
  ): string => {
    if (value.length > maxLength) {
      throw new Ensure.Error(
        message || `Value must not exceed ${maxLength} characters`,
      );
    }
    return value;
  };

  /**
   * Ensures a string is a valid URL
   *
   * **Use Cases:**
   * - Website URL validation
   * - API endpoint validation
   * - Link validation
   * - Resource validation
   *
   * @param value - URL string to validate
   * @param message - Custom error message
   * @returns The validated URL string
   * @throws {EnsureError} When URL format is invalid
   *
   * @example Website Links
   * ```typescript
   * const websiteUrl = Ensure.toBeValidUrl(
   *   request.body.website,
   *   'Please provide a valid website URL'
   * )
   * ```
   *
   * @example API Configuration
   * ```typescript
   * const apiEndpoint = Ensure.toBeValidUrl(
   *   process.env.API_BASE_URL,
   *   'API_BASE_URL must be a valid URL'
   * )
   * ```
   *
   * @example Social Links
   * ```typescript
   * const profileUrl = Ensure.toBeValidUrl(
   *   userInput.linkedinUrl,
   *   'LinkedIn URL format is invalid'
   * )
   * ```
   */
  static toBeValidUrl = (value: string, message?: string): string => {
    try {
      // eslint-disable-next-line no-new
      new URL(value);
      return value;
    } catch {
      throw new Ensure.Error(message || `"${value}" is not a valid URL`);
    }
  };

  /**
   * Ensures a value is a valid Date object
   *
   * **Use Cases:**
   * - Date input validation
   * - Timestamp validation
   * - Schedule validation
   * - Event date validation
   *
   * @param value - Date object to validate
   * @param message - Custom error message
   * @returns The validated Date object
   * @throws {EnsureError} When date is invalid
   *
   * @example Event Scheduling
   * ```typescript
   * const eventDate = Ensure.toBeValidDate(
   *   new Date(request.body.eventDate),
   *   'Please provide a valid event date'
   * )
   * ```
   *
   * @example Appointment Booking
   * ```typescript
   * const appointmentDate = Ensure.toBeValidDate(
   *   parseDate(request.body.date),
   *   'Invalid appointment date format'
   * )
   * ```
   *
   * @example Data Processing
   * ```typescript
   * const timestamp = Ensure.toBeValidDate(
   *   new Date(data.createdAt),
   *   'Invalid timestamp in data'
   * )
   * ```
   */
  static toBeValidDate = (value: Date, message?: string): Date => {
    if (!(value instanceof Date) || isNaN(value.getTime())) {
      throw new Ensure.Error(message || "Invalid date object");
    }
    return value;
  };

  /**
   * Ensures a value is a valid array with minimum length requirement
   *
   * **Use Cases:**
   * - List validation
   * - Required selections
   * - Bulk operations
   * - Multi-select validation
   *
   * @template T - Type of array elements
   * @param value - Array to validate
   * @param minLength - Minimum required array length
   * @param message - Custom error message
   * @returns The validated array
   * @throws {EnsureError} When value is not an array or too short
   *
   * @example Required Selections
   * ```typescript
   * const selectedItems = Ensure.toBeValidArray(
   *   request.body.items,
   *   1,
   *   'At least one item must be selected'
   * )
   * ```
   *
   * @example Bulk Operations
   * ```typescript
   * const userIds = Ensure.toBeValidArray(
   *   request.body.userIds,
   *   1,
   *   'At least one user ID is required for bulk operation'
   * )
   * ```
   *
   * @example File Uploads
   * ```typescript
   * const files = Ensure.toBeValidArray(
   *   request.files,
   *   1,
   *   'At least one file must be uploaded'
   * )
   * ```
   */
  static toBeValidArray = <T>(
    value: T[],
    minLength: number,
    message?: string,
  ): T[] => {
    if (!Array.isArray(value) || value.length < minLength) {
      throw new Ensure.Error(
        message || `Array must have at least ${minLength} items`,
      );
    }
    return value;
  };

  /**
   * Ensures a value equals an expected value or is included in expected values
   *
   * **Use Cases:**
   * - Exact match validation
   * - Multi-option validation
   * - Status verification
   * - Configuration validation
   *
   * @template T - Type of the value being checked
   * @param value - Value to check
   * @param expected - Expected value or array of expected values
   * @param message - Custom error message
   * @returns The validated value
   * @throws {EnsureError} When value doesn't match expected value(s)
   *
   * @example Single Value Match
   * ```typescript
   * const status = Ensure.toBeEqual(
   *   user.status,
   *   'active',
   *   'User must be active to perform this action'
   * )
   * ```
   *
   * @example Multiple Valid Values
   * ```typescript
   * const environment = Ensure.toBeEqual(
   *   process.env.NODE_ENV,
   *   ['development', 'staging', 'production'],
   *   'NODE_ENV must be development, staging, or production'
   * )
   * ```
   *
   * @example Permission Validation
   * ```typescript
   * const userRole = Ensure.toBeEqual(
   *   context.user.role,
   *   ['admin', 'moderator'],
   *   'Insufficient permissions: admin or moderator role required'
   * )
   * ```
   */
  static toBeEqual = <T>(value: T, expected: T | T[], message?: string): T => {
    if (Array.isArray(expected)) {
      if (!expected.includes(value)) {
        throw new Ensure.Error(
          message || `Value must be one of: ${expected.join(", ")}`,
        );
      }
    } else if (value !== expected) {
      throw new Ensure.Error(message || `Value must be equal to: ${expected}`);
    }

    return value;
  };

  /**
   * Validates an object by checking if a specific property matches expected value
   *
   * **Use Cases:**
   * - Object type validation
   * - Property-based filtering
   * - Polymorphic object validation
   * - Session type validation
   *
   * @template T - Type of the object being validated
   * @template K - Type of the property key (must be a key of T)
   * @template R - Type of the returned object after validation
   * @param object - The object to validate
   * @param property - The property key to check
   * @param expectedValue - The expected value for the specified property
   * @param message - Optional error message if validation fails
   * @returns The validated object with correct type inference
   * @throws {EnsureError} When property value doesn't match expected value
   *
   * @example Session Type Validation
   * ```typescript
   * const appSession = Ensure.toBeValidProperty(
   *   session,
   *   'type',
   *   'APP',
   *   'Only APP sessions are allowed for this operation'
   * )
   * // TypeScript now knows this is an APP-type session
   * ```
   *
   * @example User Role Validation
   * ```typescript
   * const adminUser = Ensure.toBeValidProperty(
   *   user,
   *   'role',
   *   'admin',
   *   'Admin access required'
   * )
   * // TypeScript infers this user has admin role
   * ```
   *
   * @example Payment Status Validation
   * ```typescript
   * const paidOrder = Ensure.toBeValidProperty(
   *   order,
   *   'status',
   *   'paid',
   *   'Order must be paid to proceed with shipping'
   * )
   * ```
   */
  static toBeValidProperty = <
    T extends object,
    K extends keyof T,
    R extends T = T,
  >(
    object: T,
    property: K,
    expectedValue: T[K],
    message?: string,
  ): R => {
    if (object[property] === expectedValue) {
      return object as R;
    }

    throw new Ensure.Error(
      message ||
        `Property ${String(property)} value does not match expected value`,
    );
  };

  /**
   * Checks if a value is included in an array (non-throwing version)
   *
   * **Use Cases:**
   * - Conditional logic
   * - Filter operations
   * - Membership testing
   * - Validation preprocessing
   *
   * @param value - Value to check
   * @param array - Array to check against
   * @param message - Optional error message (for throwing version)
   * @returns True if value is included, false otherwise (or throws if message provided)
   * @throws {EnsureError} Only when message is provided and value not found
   *
   * @example Non-throwing Usage
   * ```typescript
   * const isValidStatus = Ensure.toBeIncluded(status, ['active', 'inactive'])
   * if (isValidStatus) {
   *   // Process valid status
   * }
   * ```
   *
   * @example Throwing Usage
   * ```typescript
   * Ensure.toBeIncluded(
   *   userRole,
   *   ['admin', 'user'],
   *   'Invalid user role'
   * ) // Will throw if not included
   * ```
   *
   * @example Conditional Processing
   * ```typescript
   * if (Ensure.toBeIncluded(feature, enabledFeatures)) {
   *   await processFeature(feature)
   * }
   * ```
   */
  static toBeIncluded = <T>(
    value: T,
    array: T[],
    message?: string,
  ): boolean => {
    if (!array.includes(value)) {
      if (message) {
        throw new Ensure.Error(message);
      }
      return false;
    }
    return true;
  };

  /**
   * Performs a deep merge of multiple objects with type preservation
   *
   * **Use Cases:**
   * - Configuration merging
   * - Default value application
   * - Object composition
   * - Settings inheritance
   *
   * @template T - Type of objects being merged
   * @param target - Target object to merge into
   * @param source - Source object to merge from
   * @returns The deeply merged object
   * @throws {EnsureError} When merge operation fails
   *
   * @example Configuration Merging
   * ```typescript
   * const defaultConfig = { api: { timeout: 5000 }, features: { debug: false } }
   * const userConfig = { api: { retries: 3 }, features: { debug: true } }
   *
   * const finalConfig = Ensure.toBeDeepMerged(defaultConfig, userConfig)
   * // Result: { api: { timeout: 5000, retries: 3 }, features: { debug: true } }
   * ```
   *
   * @example User Settings
   * ```typescript
   * const defaultSettings = { theme: 'light', notifications: { email: true } }
   * const userSettings = { notifications: { push: false } }
   *
   * const mergedSettings = Ensure.toBeDeepMerged(defaultSettings, userSettings)
   * ```
   *
   * @example API Response Enrichment
   * ```typescript
   * const baseData = await fetchBaseData()
   * const enrichmentData = await fetchEnrichmentData()
   *
   * const enrichedData = Ensure.toBeDeepMerged(baseData, enrichmentData)
   * ```
   */
  static toBeDeepMerged = <T extends object>(
    target: Partial<T>,
    source: Partial<T>,
  ): T => {
    try {
      const isObject = (item: unknown): item is object => {
        return Boolean(
          item && typeof item === "object" && !Array.isArray(item),
        );
      };

      const isDate = (item: unknown): item is Date => {
        return item instanceof Date;
      };

      const mergeValue = <V>(targetValue: V, sourceValue: V): V => {
        if (isDate(sourceValue)) {
          return new Date(sourceValue) as V;
        }

        if (Array.isArray(sourceValue)) {
          return [...sourceValue] as V;
        }

        if (isObject(targetValue) && isObject(sourceValue)) {
          return Ensure.toBeDeepMerged(
            targetValue as object,
            sourceValue as object,
          ) as V;
        }

        return sourceValue;
      };

      const merged = { ...target };

      if (!isObject(source)) {
        return merged as T;
      }

      for (const key in source) {
        if (Object.prototype.hasOwnProperty.call(source, key)) {
          const targetValue = merged[key];
          const sourceValue = source[key];

          merged[key] = mergeValue(targetValue, sourceValue) as T[Extract<
            keyof T,
            string
          >];
        }
      }

      return merged as T;
    } catch (error) {
      throw new Ensure.Error("Failed to deep merge objects");
    }
  };
}

export const ensure = createIgniterPlugin({
  name: "ensure",
  $meta: {
    name: "ensure",
    description: "Ensure service",
    version: "1.0.0",
  },
  $config: {},
  $controllers: {},
  $events: {
    emits: {},
    listens: {},
  },
  dependencies: {
    requires: [],
    provides: [],
    conflicts: [],
  },
  hooks: {},
  middleware: {},
  resources: {
    resources: [],
    cleanup: () => {},
  },
  registration: {
    discoverable: true,
    version: "1.0.0",
    requiresFramework: "1.0.0",
    category: ["core"],
    author: "Igniter",
    repository: "https://github.com/igniter-framework/igniter",
    documentation: "https://github.com/igniter-framework/igniter",
  },
  $actions: {
    ensure: createIgniterPluginAction({
      name: "ensure",
      description: "Ensure service",
      input: z.object({
        value: z.string(),
      }),
      handler: ({ input, context }) => {
        return input;
      },
    }),
  },
});

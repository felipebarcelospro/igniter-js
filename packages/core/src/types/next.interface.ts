/**
 * Interface for the next function used in procedures and middlewares
 * Allows for error handling and request result interception
 */
export interface NextFunction {
  /**
   * Continue to the next middleware/procedure in the chain
   */
  (): void;
  
  /**
   * Pass an error to be handled by the global error handler
   * @param error - The error to be handled
   */
  (error: Error): void;
  
  /**
   * Pass a custom result that will be returned as the response
   * @param result - The result to be returned
   */
  (result: any): void;
}

/**
 * Type for the next function callback
 */
export type NextCallback = NextFunction;

/**
 * Options for controlling next() behavior
 */
export interface NextOptions {
  /**
   * Whether to skip remaining middlewares/procedures
   */
  skipRemaining?: boolean;
  
  /**
   * Custom metadata to pass along with the next call
   */
  metadata?: Record<string, any>;
}

/**
 * Enhanced next function with options
 */
export interface EnhancedNextFunction extends NextFunction {
  /**
   * Continue with options
   * @param options - Options for controlling behavior
   */
  (options: NextOptions): void;
  
  /**
   * Pass an error with options
   * @param error - The error to be handled
   * @param options - Options for controlling behavior
   */
  (error: Error, options?: NextOptions): void;
  
  /**
   * Pass a result with options
   * @param result - The result to be returned
   * @param options - Options for controlling behavior
   */
  (result: any, options?: NextOptions): void;
}

/**
 * Internal state for tracking next() calls
 */
export interface NextState {
  /**
   * Whether next() has been called
   */
  called: boolean;
  
  /**
   * The error passed to next(), if any
   */
  error?: Error;
  
  /**
   * The result passed to next(), if any
   */
  result?: any;
  
  /**
   * Options passed to next(), if any
   */
  options?: NextOptions;
  
  /**
   * Whether to skip remaining middlewares/procedures
   */
  skipRemaining: boolean;
  
  /**
   * Metadata associated with the next call
   */
  metadata: Record<string, any>;
  
  /**
   * Whether to skip current middleware/procedure
   */
  skip: boolean;
  
  /**
   * Whether to stop execution completely
   */
  stop: boolean;
}
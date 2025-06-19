/**
 * Authentication options for the auth procedure.
 */
export interface AuthOptions {
  /** Authentication strategy to use */
  strategy?: 'jwt' | 'bearer' | 'basic' | 'custom';
  /** Secret key for JWT verification */
  secret?: string;
  /** Custom token validation function */
  validate?: (token: string) => Promise<any> | any;
  /** Whether to require authentication */
  required?: boolean;
  /** Custom error message for authentication failures */
  errorMessage?: string;
}

/**
 * Rate limiting options for the rate limit procedure.
 */
export interface RateLimitOptions {
  /** Time window in milliseconds */
  windowMs: number;
  /** Maximum number of requests per window */
  max: number;
  /** Custom key generator function */
  keyGenerator?: (request: Request) => string;
  /** Custom error message when rate limit is exceeded */
  errorMessage?: string;
  /** Skip rate limiting based on condition */
  skip?: (request: Request) => boolean;
}

/**
 * CORS options for the CORS procedure.
 */
export interface CorsOptions {
  /** Allowed origins */
  origins?: string[] | string | boolean;
  /** Allowed HTTP methods */
  methods?: string[];
  /** Allowed headers */
  headers?: string[];
  /** Whether to allow credentials */
  credentials?: boolean;
  /** Max age for preflight cache */
  maxAge?: number;
  /** Whether to handle preflight requests */
  handlePreflight?: boolean;
}

/**
 * Security configuration for router.
 */
export interface SecurityConfig {
  /** Authentication configuration */
  auth?: AuthOptions;
  /** Rate limiting configuration */
  rateLimit?: RateLimitOptions;
  /** CORS configuration */
  cors?: CorsOptions;
} 
/**
 * Configuration options for Igniter build-time extraction
 */
export interface IgniterBuildConfig {
  /**
   * Enable automatic type extraction
   * @default true
   */
  extractTypes?: boolean;
  
  /**
   * Optimize client bundle by removing server-only code
   * @default true
   */
  optimizeClientBundle?: boolean;
  
  /**
   * Output directory for generated client types
   * @default 'generated'
   */
  outputDir?: string;
  
  /**
   * Framework integration type
   */
  framework?: 'nextjs' | 'vite' | 'webpack' | 'generic';
  
  /**
   * Enable hot reload for type generation
   * @default true
   */
  hotReload?: boolean;
  
  /**
   * Patterns to match controller files
   * @default ['**\/*.controller.{ts,js}']
   */
  controllerPatterns?: string[];
  
  /**
   * Enable debug logging
   * @default false
   */
  debug?: boolean;
}

/**
 * Build context information
 */
export interface IgniterBuildContext {
  /**
   * Current working directory
   */
  cwd: string;
  
  /**
   * Source directory
   */
  srcDir: string;
  
  /**
   * Output directory
   */
  outDir: string;
  
  /**
   * Is development mode
   */
  isDev: boolean;
  
  /**
   * Is production build
   */
  isProd: boolean;
  
  /**
   * Framework being used
   */
  framework: string;
}

/**
 * Extracted controller metadata
 */
export interface ExtractedController {
  /**
   * Controller file path
   */
  filePath: string;
  
  /**
   * Controller name
   */
  name: string;
  
  /**
   * Controller path
   */
  path: string;
  
  /**
   * Extracted actions
   */
  actions: ExtractedAction[];
  
  /**
   * Import statements needed for types
   */
  imports: string[];
}

/**
 * Extracted action metadata
 */
export interface ExtractedAction {
  /**
   * Action name
   */
  name: string;
  
  /**
   * HTTP method
   */
  method: string;
  
  /**
   * Action path
   */
  path: string;
  
  /**
   * Input type information
   */
  input: {
    body?: string;
    query?: string;
    params?: string;
    headers?: string;
  };
  
  /**
   * Output type information
   */
  output: string;
  
  /**
   * Description from JSDoc
   */
  description?: string;
  
  /**
   * Middleware used
   */
  middleware?: string[];
}

/**
 * Generated client file information
 */
export interface GeneratedClientFile {
  /**
   * File path
   */
  filePath: string;
  
  /**
   * File content
   */
  content: string;
  
  /**
   * Source controller file
   */
  sourceFile: string;
  
  /**
   * Generated timestamp
   */
  timestamp: Date;
} 
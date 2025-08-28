import { promises as fs } from 'fs';
import * as path from 'path';

/**
 * Determines the programming language based on file extension.
 * @param ext - File extension (including the dot)
 * @returns Language identifier string
 */
export function getLanguageFromExtension(ext: string): string {
  const languageMap: Record<string, string> = {
    '.ts': 'typescript',
    '.tsx': 'typescript-react',
    '.js': 'javascript',
    '.jsx': 'javascript-react',
    '.json': 'json',
    '.md': 'markdown',
    '.mdx': 'mdx',
    '.py': 'python',
    '.go': 'go',
    '.rs': 'rust',
    '.java': 'java',
    '.cpp': 'cpp',
    '.c': 'c',
    '.php': 'php',
    '.rb': 'ruby',
    '.swift': 'swift',
    '.kt': 'kotlin',
    '.dart': 'dart',
    '.vue': 'vue',
    '.svelte': 'svelte',
    '.html': 'html',
    '.css': 'css',
    '.scss': 'scss',
    '.sass': 'sass',
    '.less': 'less',
    '.sql': 'sql',
    '.sh': 'shell',
    '.bash': 'bash',
    '.zsh': 'zsh',
    '.fish': 'fish',
    '.ps1': 'powershell',
    '.yaml': 'yaml',
    '.yml': 'yaml',
    '.toml': 'toml',
    '.ini': 'ini',
    '.cfg': 'config',
    '.conf': 'config',
    '.env': 'env',
    '.dockerfile': 'dockerfile',
    '.gitignore': 'gitignore',
    '.gitattributes': 'gitattributes',
  };
  
  return languageMap[ext.toLowerCase()] || 'unknown';
}

/**
 * Determines the file type category based on file path and content patterns.
 * @param filePath - Absolute path to the file
 * @param fileContent - Content of the file for pattern analysis
 * @returns File type category string
 */
export function determineFileType(filePath: string, fileContent: string): string {
  const filename = path.basename(filePath).toLowerCase();
  
  // Router/API files
  if (filename.includes('router') || filename.includes('route') || filePath.includes('/api/')) {
    return 'router';
  }
  
  // Controller files
  if (filename.includes('controller') || filename.includes('handler')) {
    return 'controller';
  }
  
  // Service files
  if (filename.includes('service') || filename.includes('services/')) {
    return 'service';
  }
  
  // Model/Schema files
  if (filename.includes('model') || filename.includes('schema') || filename.includes('type')) {
    return 'model';
  }
  
  // Component files (React)
  if (filename.includes('component') || filePath.includes('/components/') || filename.endsWith('.tsx')) {
    return 'component';
  }
  
  // Test files
  if (filename.includes('test') || filename.includes('spec')) {
    return 'test';
  }
  
  // Config files
  if (filename.includes('config') || filename.includes('settings') || filePath.includes('/config/')) {
    return 'config';
  }
  
  // Utils/Helpers
  if (filename.includes('util') || filename.includes('helper')) {
    return 'utility';
  }
  
  return 'other';
}

/**
 * Extracts API endpoints from file content using pattern matching.
 * @param fileContent - Content of the file to analyze
 * @param filePath - Path to the file for context
 * @returns Array of detected API endpoints
 */
export function extractAPIEndpoints(fileContent: string, filePath: string): any[] {
  const endpoints: any[] = [];
  
  // Igniter.js router patterns
  const igniterPatterns = [
    /router\.(query|mutation|stream)\s*\(\s*['"`]([^'"`]+)['"`]/g,
    /(?:app|router)\.route\s*\(\s*['"`]([^'"`]+)['"`]/g
  ];
  
  // Express/Next.js patterns
  const expressPatterns = [
    /\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/g,
    /export\s+async\s+function\s+(GET|POST|PUT|DELETE|PATCH)/g
  ];
  
  // Check for Igniter.js patterns
  for (const pattern of igniterPatterns) {
    let match;
    while ((match = pattern.exec(fileContent)) !== null) {
      const method = (match[1] ? String(match[1]).toUpperCase() : 'ROUTE');
      const pathMatch = match[2] ?? match[1];
      const pathValue = typeof pathMatch === 'string' ? pathMatch : 'UNKNOWN';
      endpoints.push({
        type: 'igniter',
        method,
        path: pathValue,
        file: filePath,
        line: fileContent.substring(0, match.index).split('\n').length
      });
    }
  }
  
  // Check for Express/Next.js patterns
  for (const pattern of expressPatterns) {
    let match;
    while ((match = pattern.exec(fileContent)) !== null) {
      endpoints.push({
        type: 'express/nextjs',
        method: (match[1] ? String(match[1]).toUpperCase() : (match[0]?.match(/(GET|POST|PUT|DELETE|PATCH)/)?.[0] || 'UNKNOWN')),
        path: match[2] || 'INFERRED_FROM_FILENAME',
        file: filePath,
        line: fileContent.substring(0, match.index).split('\n').length
      });
    }
  }
  
  return endpoints;
}

/**
 * Generates feature recommendations based on analysis results.
 * @param analysisResult - Result object from feature analysis
 * @returns Array of recommendation strings
 */
export function generateFeatureRecommendations(analysisResult: any): string[] {
  const recommendations: string[] = [];
  
  // Error-based recommendations
  if (analysisResult.health_summary.total_errors > 0) {
    recommendations.push(`🔴 Fix ${analysisResult.health_summary.total_errors} TypeScript errors before testing`);
    
    if (analysisResult.health_summary.problematic_files.length > 0) {
      recommendations.push(`📁 Focus on these problematic files: ${analysisResult.health_summary.problematic_files.map((f: any) => path.basename(f.file)).join(', ')}`);
    }
  }
  
  // Warning-based recommendations
  if (analysisResult.health_summary.total_warnings > 0) {
    recommendations.push(`⚠️ Consider addressing ${analysisResult.health_summary.total_warnings} TypeScript warnings`);
  }
  
  // API testing recommendations
  if (analysisResult.api_endpoints.length > 0) {
    recommendations.push(`🧪 Test ${analysisResult.api_endpoints.length} API endpoints using make_api_request tool`);
    
    const uniqueMethods = [...new Set(analysisResult.api_endpoints.map((ep: any) => ep.method))];
    recommendations.push(`📋 Methods to test: ${uniqueMethods.join(', ')}`);
  } else if (analysisResult.structure.by_type.router > 0 || analysisResult.structure.by_type.controller > 0) {
    recommendations.push(`🔍 No API endpoints detected - verify router/controller implementation`);
  }
  
  // Structure recommendations
  if (analysisResult.structure.total_files > 10) {
    recommendations.push(`📂 Large feature (${analysisResult.structure.total_files} files) - consider breaking into smaller modules`);
  }
  
  // File type recommendations
  const hasTests = analysisResult.structure.by_type.test > 0;
  if (!hasTests && analysisResult.api_endpoints.length > 0) {
    recommendations.push(`✅ Feature ready for API testing - no automated tests needed unless specifically requested`);
  }
  
  if (analysisResult.health_summary.overall_status === 'healthy') {
    recommendations.push(`🎉 Feature is healthy and ready for API validation testing`);
  }
  
  return recommendations;
}

/**
 * Checks if a file path exists.
 * @param filePath - Path to check
 * @returns Promise that resolves to true if file exists
 */
export async function pathExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Finds the project root by looking for package.json or .git directory.
 * @param startPath - Path to start searching from
 * @returns Promise that resolves to the project root path
 */
export async function findProjectRoot(startPath: string): Promise<string> {
  let current = path.isAbsolute(startPath) ? path.dirname(startPath) : path.resolve(startPath);
  const root = path.parse(current).root;
  
  while (current !== root) {
    const packageJsonPath = path.join(current, 'package.json');
    const gitPath = path.join(current, '.git');
    
    if (await pathExists(packageJsonPath) || await pathExists(gitPath)) {
      return current;
    }
    
    const parent = path.dirname(current);
    if (parent === current) break; // Prevent infinite loops
    current = parent;
  }
  
  return path.dirname(startPath);
}

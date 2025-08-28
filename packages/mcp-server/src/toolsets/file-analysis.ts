/**
 * File Analysis Tools - File structure analysis, TypeScript diagnostics, and feature analysis
 */

import * as path from "path";
import * as fs from "fs/promises";
import { z } from "zod";
import {
  getLanguageFromExtension,
  determineFileType,
  extractAPIEndpoints,
  generateFeatureRecommendations,
  findProjectRoot
} from "../utils/file-analysis";
import { parseASTStructure, analyzeTypeScriptErrors } from "../utils/ast-parsing";
import { ToolsetContext } from "./types";

export function registerFileAnalysisTools({ server }: ToolsetContext) {
  // --- File Analysis Tools ---
  server.registerTool("analyze_file", {
    title: "Analyze File",
    description: "Analyzes the structure, imports, exports, functions, and TypeScript errors of a file.",
    inputSchema: {
      filePath: z.string().describe("Path to the file to analyze"),
      includeErrors: z.boolean().default(true).describe("Include TypeScript and ESLint diagnostics"),
      projectRoot: z.string().optional().describe("Project root for better TypeScript analysis")
    },
  }, async ({ filePath, includeErrors, projectRoot }: { filePath: string, includeErrors?: boolean, projectRoot?: string }) => {
    try {
      const absolutePath = path.resolve(filePath);
      const fileContent = await fs.readFile(absolutePath, 'utf-8');
      const extension = path.extname(absolutePath);
      const language = getLanguageFromExtension(extension);

      const result: any = {
        file_info: {
          path: absolutePath,
          name: path.basename(absolutePath),
          extension,
          language,
          size: fileContent.length,
          lines: fileContent.split('\n').length
        },
        structure: parseASTStructure(fileContent, language),
        diagnostics: {},
        health_summary: {}
      };

      if (includeErrors && ['.ts', '.tsx'].includes(extension)) {
        result.diagnostics = await analyzeTypeScriptErrors(absolutePath, fileContent, projectRoot);
      }

      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    } catch (error: any) {
      return { content: [{ type: "text", text: `Error analyzing file: ${error.message}` }] };
    }
  });

  server.registerTool("analyze_feature", {
    title: "Analyze Feature",
    description: "Comprehensive analysis of a feature implementation including files, structure, errors, and API endpoints.",
    inputSchema: {
      featurePath: z.string().describe("Path to feature directory or main file"),
      projectRoot: z.string().optional().describe("Project root for better analysis"),
      includeStats: z.boolean().default(true).describe("Include file statistics and metrics")
    },
  }, async ({ featurePath, projectRoot, includeStats }: { featurePath: string, projectRoot?: string, includeStats?: boolean }) => {
    try {
      const absolutePath = path.resolve(featurePath);
      const detectedProjectRoot = projectRoot || await findProjectRoot(absolutePath);

      const result: any = {
        feature_info: {
          path: absolutePath,
          project_root: detectedProjectRoot,
          analysis_timestamp: new Date().toISOString()
        },
        files: [],
        structure: {
          total_files: 0,
          by_extension: {},
          by_type: {}
        },
        health_summary: {
          total_errors: 0,
          total_warnings: 0,
          problematic_files: [],
          healthy_files: []
        },
        api_endpoints: [],
        recommendations: []
      };

      // Determine if it's a file or directory
      const stats = await fs.stat(absolutePath);
      const filesToAnalyze: string[] = [];

      if (stats.isDirectory()) {
        // Find all relevant files in the feature directory
        const { execSync } = require('child_process');
        try {
          const findCommand = `find "${absolutePath}" -type f \\( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \\) | head -50`;
          const foundFiles = execSync(findCommand, { encoding: 'utf-8' })
            .split('\n')
            .filter(Boolean);
          filesToAnalyze.push(...foundFiles);
        } catch {
          // Fallback if find command fails
        }
      } else {
        filesToAnalyze.push(absolutePath);
      }

      // Analyze each file
      for (const filePath of filesToAnalyze) {
        try {
          const fileContent = await fs.readFile(filePath, 'utf-8');
          const extension = path.extname(filePath);
          const language = getLanguageFromExtension(extension);

          const fileAnalysis: any = {
            path: filePath,
            name: path.basename(filePath),
            extension,
            language,
            size: fileContent.length,
            lines: fileContent.split('\n').length,
            health: 'unknown',
            errors: [],
            warnings: []
          };

          // Update structure stats
          result.structure.total_files++;
          result.structure.by_extension[extension] = (result.structure.by_extension[extension] || 0) + 1;

          // Determine file type
          const fileType = determineFileType(filePath, fileContent);
          result.structure.by_type[fileType] = (result.structure.by_type[fileType] || 0) + 1;

          // Analyze file health if it's a code file
          if (['typescript', 'javascript', 'tsx', 'jsx'].includes(language)) {
            const diagnostics = await analyzeTypeScriptErrors(filePath, fileContent, detectedProjectRoot);

            const errors = diagnostics.typescript_errors?.filter((d: any) => d.severity === 'error') || [];
            const warnings = diagnostics.typescript_errors?.filter((d: any) => d.severity === 'warning') || [];

            fileAnalysis.errors = errors;
            fileAnalysis.warnings = warnings;
            fileAnalysis.health = errors.length > 0 ? 'needs_attention' :
                                  warnings.length > 0 ? 'has_warnings' : 'healthy';

            result.health_summary.total_errors += errors.length;
            result.health_summary.total_warnings += warnings.length;

            if (errors.length > 0) {
              result.health_summary.problematic_files.push({
                file: filePath,
                error_count: errors.length,
                warning_count: warnings.length
              });
            } else {
              result.health_summary.healthy_files.push(filePath);
            }

            // Extract API endpoints if it's a router/controller file
            const endpoints = extractAPIEndpoints(fileContent, filePath);
            result.api_endpoints.push(...endpoints);
          }

          result.files.push(fileAnalysis);
        } catch (error) {
          result.files.push({
            path: filePath,
            name: path.basename(filePath),
            error: `Failed to analyze: ${error}`
          });
        }
      }

      // Generate recommendations
      result.recommendations = generateFeatureRecommendations(result);

      // Calculate overall health
      result.health_summary.overall_status = result.health_summary.total_errors > 0 ? 'needs_attention' :
                                            result.health_summary.total_warnings > 0 ? 'has_warnings' : 'healthy';

      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    } catch (error: any) {
      return { content: [{ type: "text", text: `Error analyzing feature: ${error.message}` }] };
    }
  });
}

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
      filePath: z.string().describe("Absolute path to the file to analyze."),
      includeErrors: z.boolean().default(true).describe("Include TypeScript and ESLint diagnostics"),
      projectRoot: z.string().optional().describe("Project root for better TypeScript analysis")
    },
  }, async ({ filePath, includeErrors, projectRoot }: { filePath: string, includeErrors?: boolean, projectRoot?: string }) => {
    try {
      const absolutePath = path.resolve(filePath);
      const fileContent = await fs.readFile(absolutePath, 'utf-8');
      const extension = path.extname(absolutePath);
      const language = getLanguageFromExtension(extension);

      // Parse structure first so we can enrich health summary later
      const structure = parseASTStructure(fileContent, language);

      const result: any = {
        file_info: {
          path: absolutePath,
          name: path.basename(absolutePath),
          extension,
          language,
          size: fileContent.length,
          lines: fileContent.split('\n').length
        },
        structure,
        diagnostics: {
          typescript_errors: [],
          eslint_errors: [],
          health_summary: {
            error_count: 0,
            warning_count: 0,
            overall_status: 'healthy',
            compilable: true
          }
        },
        health_summary: {}
      };

      // Collect TS diagnostics (only for TS/TSX and when requested)
      if (includeErrors && ['.ts', '.tsx'].includes(extension)) {
        result.diagnostics = await analyzeTypeScriptErrors(absolutePath, fileContent, projectRoot);
      }

      // Derive an augmented health summary that merges static diagnostics with structural signals
      const diagSummary = result.diagnostics.health_summary || {
        error_count: 0,
        warning_count: 0,
        overall_status: 'healthy',
        compilable: true
      };

      // Lightweight heuristic signals
      const lineCount = result.file_info.lines;
      const functionCount = structure.functions?.length || 0;
      const classCount = structure.classes?.length || 0;
      const exportCount = structure.exports?.length || structure.functions?.filter((f: any) => f.isExported).length || 0;
      const importCount = structure.imports?.length || 0;

      // Heuristic flags
      const flags: string[] = [];
      if (lineCount > 400) flags.push('large_file');
      if (functionCount > 25) flags.push('many_functions');
      if (classCount > 10) flags.push('many_classes');
      if (diagSummary.error_count === 0 && diagSummary.warning_count === 0 && flags.length === 0) {
        flags.push('clean');
      }

      // Simple maintainability score (0-100)
      let score = 100;
      score -= diagSummary.error_count * 5;
      score -= Math.min(20, diagSummary.warning_count * 2);
      if (lineCount > 400) score -= Math.min(15, Math.floor((lineCount - 400) / 50));
      if (functionCount > 25) score -= Math.min(10, functionCount - 25);
      if (classCount > 10) score -= Math.min(10, (classCount - 10) * 2);
      score = Math.max(0, Math.min(100, score));

      // Derive final status (errors > warnings > heuristic)
      let overall = diagSummary.overall_status;
      if (overall === 'healthy') {
        if (flags.includes('large_file') || flags.includes('many_functions') || flags.includes('many_classes')) {
          overall = 'has_warnings';
        }
      }

      result.health_summary = {
        ...diagSummary,
        overall_status: overall,
        maintainability_score: score,
        metrics: {
          lines: lineCount,
            imports: importCount,
          functions: functionCount,
          classes: classCount,
          exports: exportCount
        },
        flags
      };

      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    } catch (error: any) {
      return { content: [{ type: "text", text: `Error analyzing file: ${error.message}` }] };
    }
  });

  server.registerTool("analyze_feature", {
    title: "Analyze Feature",
    description: "Comprehensive analysis of a feature implementation including files, structure, errors, and API endpoints.",
    inputSchema: {
      featurePath: z.string().describe("Absolute path to feature directory or main file"),
      projectRoot: z.string().describe("Project root for better analysis"),
      includeStats: z.boolean().default(true).describe("Include file statistics and metrics")
    },
  }, async ({ featurePath, projectRoot }: { featurePath: string, projectRoot?: string, includeStats?: boolean }) => {
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

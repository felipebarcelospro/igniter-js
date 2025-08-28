/**
 * Code Investigation Tools - Symbol resolution, dependency tracing, and source exploration
 */

import * as path from "path";
import * as fs from "fs/promises";
import { z } from "zod";
import { 
  extractImportsFromContent,
  extractExportsFromContent,
  resolveModulePath,
  findSymbolInFile,
  searchSymbolInProject,
  getPackageInfo,
  getPackageDependencies,
  analyzeSpecificSymbol,
  traceDependencyChain
} from "../utils/code-investigation";
import { getLanguageFromExtension, findProjectRoot } from "../utils/file-analysis";
import { parseASTStructure } from "../utils/ast-parsing";
import { ToolsetContext } from "./types";

export function registerCodeInvestigationTools({ server }: ToolsetContext) {
  // --- Code Investigation Tools ---
  server.registerTool("find_implementation", {
    title: "Find Implementation",
    description: "Find where a symbol (function, class, type, variable) is implemented in the codebase or dependencies.",
    inputSchema: {
      symbol: z.string().describe("Name of symbol to find (function, class, type, variable)"),
      filePath: z.string().describe("Current file context for import resolution"),
      projectRoot: z.string().optional().describe("Project root for better resolution")
    },
  }, async ({ symbol, filePath, projectRoot }: { symbol: string, filePath: string, projectRoot?: string }) => {
    try {
      const absolutePath = path.resolve(filePath);
      const detectedProjectRoot = projectRoot || await findProjectRoot(absolutePath);
      const fileContent = await fs.readFile(absolutePath, 'utf-8');
      
      const result: any = {
        symbol,
        search_context: {
          from_file: absolutePath,
          project_root: detectedProjectRoot
        },
        implementations: []
      };

      // Parse imports and find symbol references
      const imports = await extractImportsFromContent(fileContent);
      
      // Search in imports first
      for (const importInfo of imports) {
        if (importInfo.imports.includes(symbol) || 
            importInfo.default === symbol ||
            importInfo.namespace === symbol) {
          
          const resolvedPath = await resolveModulePath(importInfo.source, absolutePath, detectedProjectRoot);
          if (resolvedPath) {
            const implInfo = await findSymbolInFile(symbol, resolvedPath, importInfo);
            if (implInfo) {
              result.implementations.push(implInfo);
            }
          }
        }
      }

      // Search in current file if not found in imports
      if (result.implementations.length === 0) {
        const localImpl = await findSymbolInFile(symbol, absolutePath, { source: 'local', type: 'local' });
        if (localImpl) {
          result.implementations.push(localImpl);
        }
      }

      // If still not found, search in project files
      if (result.implementations.length === 0) {
        const projectSearch = await searchSymbolInProject(symbol, detectedProjectRoot, absolutePath);
        result.implementations.push(...projectSearch);
      }

      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    } catch (error: any) {
      return { content: [{ type: "text", text: `Error finding implementation: ${error.message}` }] };
    }
  });

  server.registerTool("explore_source", {
    title: "Explore Source",
    description: "Analyze implementation file with detailed focus on specific symbol and its context.",
    inputSchema: {
      filePath: z.string().describe("File to analyze"),
      symbol: z.string().optional().describe("Specific symbol to focus on"),
      includeContext: z.boolean().default(true).describe("Include surrounding context and dependencies")
    },
  }, async ({ filePath, symbol, includeContext }: { filePath: string, symbol?: string, includeContext?: boolean }) => {
    try {
      const absolutePath = path.resolve(filePath);
      const fileContent = await fs.readFile(absolutePath, 'utf-8');
      const extension = path.extname(absolutePath);
      const language = getLanguageFromExtension(extension);
      
      const result: any = {
        file_info: {
          path: absolutePath,
          name: path.basename(absolutePath),
          language,
          is_node_module: absolutePath.includes('node_modules'),
          package_info: null
        },
        symbol_analysis: null,
        file_structure: {},
        context: {}
      };

      // Get package info if it's a node_module
      if (result.file_info.is_node_module) {
        result.file_info.package_info = await getPackageInfo(absolutePath);
      }

      // Parse file structure
      if (['typescript', 'javascript', 'tsx', 'jsx'].includes(language)) {
        result.file_structure = parseASTStructure(fileContent, language);
        
        // Focus on specific symbol if provided
        if (symbol) {
          result.symbol_analysis = await analyzeSpecificSymbol(symbol, fileContent, absolutePath);
        }

        // Include context if requested
        if (includeContext) {
          result.context = {
            imports: await extractImportsFromContent(fileContent),
            exports: await extractExportsFromContent(fileContent),
            dependencies: result.file_info.is_node_module ? 
              await getPackageDependencies(absolutePath) : null
          };
        }
      }

      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    } catch (error: any) {
      return { content: [{ type: "text", text: `Error exploring source: ${error.message}` }] };
    }
  });

  server.registerTool("trace_dependency_chain", {
    title: "Trace Dependency Chain",
    description: "Map complete dependency chain for a symbol, showing the path from usage to original implementation.",
    inputSchema: {
      symbol: z.string().describe("Symbol to trace"),
      startFile: z.string().describe("Starting file"),
      maxDepth: z.number().default(10).describe("Maximum trace depth to prevent infinite loops")
    },
  }, async ({ symbol, startFile, maxDepth }: { symbol: string, startFile: string, maxDepth?: number }) => {
    try {
      const absolutePath = path.resolve(startFile);
      const projectRoot = await findProjectRoot(absolutePath);
      
      const result: any = {
        symbol,
        start_file: absolutePath,
        dependency_chain: [],
        final_implementation: null,
        trace_summary: {
          total_hops: 0,
          crosses_node_modules: false,
          has_re_exports: false
        }
      };

      const visited = new Set<string>();
      const chain = await traceDependencyChain(symbol, absolutePath, projectRoot, visited, maxDepth || 10);
      
      result.dependency_chain = chain;
      result.final_implementation = chain[chain.length - 1] || null;
      result.trace_summary = {
        total_hops: chain.length,
        crosses_node_modules: chain.some(hop => hop.file_path.includes('node_modules')),
        has_re_exports: chain.some(hop => hop.type === 're-export')
      };

      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    } catch (error: any) {
      return { content: [{ type: "text", text: `Error tracing dependency chain: ${error.message}` }] };
    }
  });
}

import * as ts from "typescript";
import { parse } from "@typescript-eslint/parser";
import { promises as fs } from 'fs';
import * as path from 'path';
import { pathExists } from './file-analysis';
import { createFileSystemService } from '../memory/fs';

/**
 * Parses the AST structure of code content to extract functions, classes, and types.
 * @param fileContent - Content of the file to parse
 * @param language - Programming language of the content
 * @returns Structured representation of the code
 */
export function parseASTStructure(fileContent: string, language: string): any {
  const result: any = {
    imports: [],
    exports: [],
    functions: [],
    classes: [],
    interfaces: [],
    types: [],
    variables: [],
    errors: []
  };

  try {
    if (language === 'typescript' || language === 'typescript-react') {
      // Use TypeScript compiler API for better parsing
      const sourceFile = ts.createSourceFile(
        'temp.ts',
        fileContent,
        ts.ScriptTarget.Latest,
        true
      );

      ts.forEachChild(sourceFile, (node) => {
        visitNode(node, result);
      });
    } else if (language === 'javascript' || language === 'javascript-react') {
      // Use TypeScript ESLint parser for JavaScript
      try {
        const ast = parse(fileContent, {
          ecmaVersion: 2022,
          sourceType: 'module',
          ecmaFeatures: {
            jsx: language.includes('react'),
            modules: true
          }
        });

        // Extract basic information from ESLint AST
        extractFromESLintAST(ast, result);
      } catch (parseError) {
        result.errors.push(`JavaScript parsing failed: ${parseError}`);
      }
    }
  } catch (error: any) {
    result.errors.push(`AST parsing failed: ${error?.message || 'Unknown parsing error'}`);
  }

  return result;
}

/**
 * Visits a TypeScript AST node and extracts relevant information.
 * @param node - TypeScript AST node
 * @param result - Result object to populate
 */
function visitNode(node: ts.Node, result: any): void {
  switch (node.kind) {
    case ts.SyntaxKind.FunctionDeclaration:
      const funcDecl = node as ts.FunctionDeclaration;
      if (funcDecl.name) {
        result.functions.push({
          name: funcDecl.name.text,
          parameters: funcDecl.parameters.map(p => p.name?.getText() || 'unknown'),
          returnType: funcDecl.type?.getText() || 'unknown',
          isAsync: funcDecl.modifiers?.some(m => m.kind === ts.SyntaxKind.AsyncKeyword) || false,
          isExported: funcDecl.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword) || false
        });
      }
      break;

    case ts.SyntaxKind.ClassDeclaration:
      const classDecl = node as ts.ClassDeclaration;
      if (classDecl.name) {
        result.classes.push({
          name: classDecl.name.text,
          isExported: classDecl.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword) || false,
          methods: [],
          properties: []
        });
      }
      break;

    case ts.SyntaxKind.InterfaceDeclaration:
      const interfaceDecl = node as ts.InterfaceDeclaration;
      result.interfaces.push({
        name: interfaceDecl.name.text,
        isExported: interfaceDecl.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword) || false,
        members: interfaceDecl.members.length
      });
      break;

    case ts.SyntaxKind.TypeAliasDeclaration:
      const typeDecl = node as ts.TypeAliasDeclaration;
      result.types.push({
        name: typeDecl.name.text,
        isExported: typeDecl.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword) || false
      });
      break;

    case ts.SyntaxKind.VariableStatement:
      const varStmt = node as ts.VariableStatement;
      varStmt.declarationList.declarations.forEach(decl => {
        if (ts.isIdentifier(decl.name)) {
          result.variables.push({
            name: decl.name.text,
            isExported: varStmt.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword) || false,
            isConst: !!(varStmt.declarationList.flags & ts.NodeFlags.Const)
          });
        }
      });
      break;

    case ts.SyntaxKind.ImportDeclaration:
      const importDecl = node as ts.ImportDeclaration;
      if (ts.isStringLiteral(importDecl.moduleSpecifier)) {
        result.imports.push({
          module: importDecl.moduleSpecifier.text,
          isTypeOnly: importDecl.importClause?.isTypeOnly || false
        });
      }
      break;

    case ts.SyntaxKind.ExportDeclaration:
      const exportDecl = node as ts.ExportDeclaration;
      if (exportDecl.moduleSpecifier && ts.isStringLiteral(exportDecl.moduleSpecifier)) {
        result.exports.push({
          module: exportDecl.moduleSpecifier.text,
          type: 're-export'
        });
      }
      break;
  }

  // Continue visiting child nodes
  ts.forEachChild(node, (child) => visitNode(child, result));
}

/**
 * Extracts information from ESLint AST for JavaScript files.
 * @param ast - ESLint AST
 * @param result - Result object to populate
 */
function extractFromESLintAST(ast: any, result: any): void {
  // Basic extraction - this could be expanded based on needs
  if (ast.body) {
    ast.body.forEach((node: any) => {
      switch (node.type) {
        case 'FunctionDeclaration':
          if (node.id?.name) {
            result.functions.push({
              name: node.id.name,
              parameters: node.params.map((p: any) => p.name || 'unknown'),
              isAsync: node.async || false,
              isExported: false // Would need to check parent nodes
            });
          }
          break;

        case 'ClassDeclaration':
          if (node.id?.name) {
            result.classes.push({
              name: node.id.name,
              isExported: false
            });
          }
          break;

        case 'VariableDeclaration':
          node.declarations.forEach((decl: any) => {
            if (decl.id?.name) {
              result.variables.push({
                name: decl.id.name,
                isConst: node.kind === 'const'
              });
            }
          });
          break;

        case 'ImportDeclaration':
          if (node.source?.value) {
            result.imports.push({
              module: node.source.value
            });
          }
          break;

        case 'ExportNamedDeclaration':
        case 'ExportDefaultDeclaration':
          result.exports.push({
            type: node.type === 'ExportDefaultDeclaration' ? 'default' : 'named'
          });
          break;
      }
    });
  }
}

/**
 * Analyzes TypeScript errors in a file using the project's tsconfig.json.
 * @param filePath - Path to the file
 * @param fileContent - Content of the file (can be unsaved)
 * @param projectRoot - Project root for tsconfig resolution
 * @returns Promise that resolves to diagnostics object
 */
export async function analyzeTypeScriptErrors(filePath: string, fileContent: string, projectRoot?: string): Promise<any> {
  const diagnostics = {
    typescript_errors: [] as any[],
    eslint_errors: [] as any[], // Placeholder for future ESLint integration
    health_summary: {
      error_count: 0,
      warning_count: 0,
      overall_status: 'healthy',
      compilable: true
    }
  };

  try {
    const absoluteFilePath = path.resolve(filePath);
    const effectiveProjectRoot = projectRoot || path.dirname(absoluteFilePath);

    // 1. Find and parse the correct tsconfig.json using FileSystemService
    // This approach works correctly in MCP context (running via bunx)
    const fsService = createFileSystemService(effectiveProjectRoot);
    const resolvedProjectRoot = await fsService.resolveProjectRoot(effectiveProjectRoot);
    const tsconfigPath = path.join(resolvedProjectRoot, 'tsconfig.json');
    
    // If tsconfig.json doesn't exist, return no errors instead of using problematic fallback
    if (!(await fsService.pathExists(tsconfigPath))) {
      return diagnostics;
    }

    let compilerOptions: ts.CompilerOptions;
    let rootFileNames: string[] = [absoluteFilePath];

    // Parse the tsconfig.json
    const configFile = ts.readConfigFile(tsconfigPath, ts.sys.readFile);
    if (configFile.error) {
      // If there's an error reading the config, return no errors
      return diagnostics;
    }
    
    const parsedConfig = ts.parseJsonConfigFileContent(
      configFile.config,
      ts.sys,
      path.dirname(tsconfigPath)
    );
    
    if (parsedConfig.errors.length > 0) {
      // If there are errors parsing the config, return no errors
      return diagnostics;
    }
    
    compilerOptions = parsedConfig.options;
    rootFileNames = parsedConfig.fileNames;
    
    // Ensure the file being analyzed is part of the compilation
    if (!rootFileNames.map(p => path.resolve(p)).includes(absoluteFilePath)) {
      rootFileNames.push(absoluteFilePath);
    }

    // 2. Create a custom CompilerHost that uses in-memory content for the target file
    const host = ts.createCompilerHost(compilerOptions);
    const originalGetSourceFile = host.getSourceFile;

    host.getSourceFile = (fileName, languageVersion, onError, shouldCreateNewSourceFile) => {
      if (path.resolve(fileName) === absoluteFilePath) {
        return ts.createSourceFile(fileName, fileContent, compilerOptions.target ?? ts.ScriptTarget.Latest, true);
      }
      return originalGetSourceFile.call(host, fileName, languageVersion, onError, shouldCreateNewSourceFile);
    };

    // 3. Create the program with the full project context
    const program = ts.createProgram(rootFileNames, compilerOptions, host);
    const sourceFileToDiagnose = program.getSourceFile(absoluteFilePath);

    // Get diagnostics for the specific file
    const tsDiagnostics = sourceFileToDiagnose
      ? ts.getPreEmitDiagnostics(program, sourceFileToDiagnose)
      : [];

    tsDiagnostics.forEach(diagnostic => {
      if (diagnostic.file && typeof diagnostic.start === 'number') {
        const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
        diagnostics.typescript_errors.push({
          severity: ts.DiagnosticCategory[diagnostic.category].toLowerCase(),
          message: ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
          line: line + 1,
          column: character + 1,
          code: `TS${diagnostic.code}`
        });
      } else {
        diagnostics.typescript_errors.push({
          severity: ts.DiagnosticCategory[diagnostic.category].toLowerCase(),
          message: ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
          line: 0,
          column: 0,
          code: `TS${diagnostic.code}`
        });
      }
    });

    // Calculate health summary
    const errors = diagnostics.typescript_errors.filter(d => d.severity === 'error').length;
    const warnings = diagnostics.typescript_errors.filter(d => d.severity === 'warning').length;

    diagnostics.health_summary = {
      error_count: errors,
      warning_count: warnings,
      overall_status: errors > 0 ? 'needs_attention' : warnings > 0 ? 'has_warnings' : 'healthy',
      compilable: errors === 0
    };

  } catch (error: any) {
    diagnostics.typescript_errors.push({
      severity: 'error',
      message: `Analysis failed: ${error?.message || 'Unknown error'}`,
      line: 1,
      column: 1,
      code: 'ANALYSIS_ERROR'
    });
  }

  return diagnostics;
}

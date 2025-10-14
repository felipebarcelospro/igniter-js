import * as ts from "typescript";
import { parse } from "@typescript-eslint/parser";

import * as path from "path";
import { pathExists } from "./file-analysis";


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
    errors: [],
  };

  try {
    if (language === "typescript" || language === "typescript-react") {
      // Use TypeScript compiler API for better parsing
      const sourceFile = ts.createSourceFile(
        "temp.ts",
        fileContent,
        ts.ScriptTarget.Latest,
        true,
      );

      ts.forEachChild(sourceFile, (node) => {
        visitNode(node, result);
      });
    } else if (language === "javascript" || language === "javascript-react") {
      // Use TypeScript ESLint parser for JavaScript
      try {
        const ast = parse(fileContent, {
          ecmaVersion: 2022,
          sourceType: "module",
          ecmaFeatures: {
            jsx: language.includes("react"),
            modules: true,
          },
        });

        // Extract basic information from ESLint AST
        extractFromESLintAST(ast, result);
      } catch (parseError) {
        result.errors.push(`JavaScript parsing failed: ${parseError}`);
      }
    }
  } catch (error: any) {
    result.errors.push(
      `AST parsing failed: ${error?.message || "Unknown parsing error"}`,
    );
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
    case ts.SyntaxKind.FunctionDeclaration: {
      const funcDecl = node as ts.FunctionDeclaration;
      if (funcDecl.name) {
        result.functions.push({
          name: funcDecl.name.text,
          parameters: funcDecl.parameters.map(
            (p) => p.name?.getText() || "unknown",
          ),
          returnType: funcDecl.type?.getText() || "unknown",
          isAsync:
            funcDecl.modifiers?.some(
              (m) => m.kind === ts.SyntaxKind.AsyncKeyword,
            ) || false,
          isExported:
            funcDecl.modifiers?.some(
              (m) => m.kind === ts.SyntaxKind.ExportKeyword,
            ) || false,
        });
      }
      break;
    }

    case ts.SyntaxKind.ClassDeclaration: {
      const classDecl = node as ts.ClassDeclaration;
      if (classDecl.name) {
        result.classes.push({
          name: classDecl.name.text,
          isExported:
            classDecl.modifiers?.some(
              (m) => m.kind === ts.SyntaxKind.ExportKeyword,
            ) || false,
          methods: [],
          properties: [],
        });
      }
      break;
    }

    case ts.SyntaxKind.InterfaceDeclaration: {
      const interfaceDecl = node as ts.InterfaceDeclaration;
      result.interfaces.push({
        name: interfaceDecl.name.text,
        isExported:
          interfaceDecl.modifiers?.some(
            (m) => m.kind === ts.SyntaxKind.ExportKeyword,
          ) || false,
        members: interfaceDecl.members.length,
      });
      break;
    }

    case ts.SyntaxKind.TypeAliasDeclaration: {
      const typeDecl = node as ts.TypeAliasDeclaration;
      result.types.push({
        name: typeDecl.name.text,
        isExported:
          typeDecl.modifiers?.some(
            (m) => m.kind === ts.SyntaxKind.ExportKeyword,
          ) || false,
      });
      break;
    }

    case ts.SyntaxKind.VariableStatement: {
      const varStmt = node as ts.VariableStatement;
      varStmt.declarationList.declarations.forEach((decl) => {
        if (ts.isIdentifier(decl.name)) {
          result.variables.push({
            name: decl.name.text,
            isExported:
              varStmt.modifiers?.some(
                (m) => m.kind === ts.SyntaxKind.ExportKeyword,
              ) || false,
            isConst: !!(varStmt.declarationList.flags & ts.NodeFlags.Const),
          });
        }
      });
      break;
    }

    case ts.SyntaxKind.ImportDeclaration: {
      const importDecl = node as ts.ImportDeclaration;
      if (ts.isStringLiteral(importDecl.moduleSpecifier)) {
        result.imports.push({
          module: importDecl.moduleSpecifier.text,
          isTypeOnly: importDecl.importClause?.isTypeOnly || false,
        });
      }
      break;
    }

    case ts.SyntaxKind.ExportDeclaration: {
      const exportDecl = node as ts.ExportDeclaration;
      if (
        exportDecl.moduleSpecifier &&
        ts.isStringLiteral(exportDecl.moduleSpecifier)
      ) {
        result.exports.push({
          module: exportDecl.moduleSpecifier.text,
          type: "re-export",
        });
      }
      break;
    }
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
        case "FunctionDeclaration":
          if (node.id?.name) {
            result.functions.push({
              name: node.id.name,
              parameters: node.params.map((p: any) => p.name || "unknown"),
              isAsync: node.async || false,
              isExported: false, // Would need to check parent nodes
            });
          }
          break;

        case "ClassDeclaration":
          if (node.id?.name) {
            result.classes.push({
              name: node.id.name,
              isExported: false,
            });
          }
          break;

        case "VariableDeclaration":
          node.declarations.forEach((decl: any) => {
            if (decl.id?.name) {
              result.variables.push({
                name: decl.id.name,
                isConst: node.kind === "const",
              });
            }
          });
          break;

        case "ImportDeclaration":
          if (node.source?.value) {
            result.imports.push({
              module: node.source.value,
            });
          }
          break;

        case "ExportNamedDeclaration":
        case "ExportDefaultDeclaration":
          result.exports.push({
            type:
              node.type === "ExportDefaultDeclaration" ? "default" : "named",
          });
          break;
      }
    });
  }
}

/**
 * Diagnostic information for a single TypeScript error or warning.
 */
export interface TypeScriptDiagnostic {
  severity: "error" | "warning" | "suggestion" | "message";
  message: string;
  line: number;
  column: number;
  code: string;
  file?: string;
}

/**
 * Diagnostic information for a single ESLint error or warning.
 * Placeholder for future ESLint integration.
 */
export interface ESLintDiagnostic {
  severity: "error" | "warning";
  message: string;
  line: number;
  column: number;
  ruleId?: string;
}

/**
 * Health summary for diagnostics.
 */
export interface DiagnosticsHealthSummary {
  error_count: number;
  warning_count: number;
  overall_status: "healthy" | "has_warnings" | "needs_attention";
  compilable: boolean;
}

/**
 * Diagnostics result object returned by analyzeTypeScriptErrors.
 */
export interface DiagnosticsResult {
  typescript_errors: TypeScriptDiagnostic[];
  eslint_errors: ESLintDiagnostic[];
  health_summary: DiagnosticsHealthSummary;
}
/**
 * Analyzes TypeScript errors in a file using the project's tsconfig.json.
 * @param filePath - Path to the file
 * @param fileContent - Content of the file (can be unsaved)
 * @param projectRoot - Project root for tsconfig resolution
 * @returns Promise that resolves to diagnostics object
 */
export async function analyzeTypeScriptErrors(
  filePath: string,
  _fileContent: string,
  projectRoot?: string,
): Promise<DiagnosticsResult> {
  // We invoke a PINNED local TypeScript compiler (dependency of this package) instead of `npx tsc`.
  // This avoids the security banner / network lookup when the target project lacks a local typescript install,
  // ensures deterministic output, and reduces maintenance churn.
  const result: DiagnosticsResult = {
   typescript_errors: [],
   eslint_errors: [],
   health_summary: {
    error_count: 0,
    warning_count: 0,
    overall_status: "healthy",
    compilable: true,
   },
  };

  // Simple ANSI escape stripper to make parsing robust even if some color slips through.
  function stripAnsi(input: string): string {
   // Broad matching for ESC sequences (constructed via Regex from chalk/strip-ansi (broad matching for ESC sequences)
   return input.replace(
    // eslint-disable-next-line no-control-regex
    /\u001B\[?[0-9;]*[A-Za-z]/g,
    "",
   );
  }

  // Upward search for a tsconfig.json (optional)
  async function findTsConfig(dir: string): Promise<string | null> {
   const candidate = path.join(dir, "tsconfig.json");
   if (await pathExists(candidate)) {
    console.log(`[analyzeTypeScriptErrors] Found tsconfig.json at: ${candidate}`);
    return candidate;
   }
   const parent = path.dirname(dir);
   if (parent === dir) return null;
   return findTsConfig(parent);
  }

  try {
   const startDir = projectRoot || path.dirname(filePath);
   console.log(`[analyzeTypeScriptErrors] Starting directory for tsconfig search: ${startDir}`);
   const tsconfigPath = await findTsConfig(startDir);

   // Resolve the local tsc binary from the project's dependency
   let tscBin: string | null = null;
   async function findTscBin(dir: string): Promise<string | null> {
    const candidate = path.join(dir, "node_modules", "typescript", "bin", "tsc");
    if (await pathExists(candidate)) {
     return candidate;
    }
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    return findTscBin(parent);
   }

   tscBin = await findTscBin(startDir);
   if (!tscBin) {
    throw new Error("TypeScript dependency not found in project; cannot run diagnostics.");
   }

   // Build command using the node executable + resolved tsc.
   // We disable incremental to keep runs stateless; pretty false to keep output parse-friendly.
   const nodeExec = process.execPath;
   const baseCmd = tsconfigPath
    ? `"${nodeExec}" "${tscBin}" --noEmit --pretty false -p "${tsconfigPath}" --incremental false`
    : `"${nodeExec}" "${tscBin}" --noEmit --pretty false "${filePath}" --skipLibCheck`;

   console.log(`[analyzeTypeScriptErrors] Running command: ${baseCmd}`);

   const { execSync } = require("child_process");

   let stdout = "";
   let stderr = "";
   try {
    stdout = execSync(baseCmd, {
     encoding: "utf-8",
     stdio: ["ignore", "pipe", "pipe"],
     env: { ...process.env, FORCE_COLOR: "0" },
    });
    console.log(`[analyzeTypeScriptErrors] tsc stdout:\n${stdout}`);
    if (stderr) {
     console.log(`[analyzeTypeScriptErrors] tsc stderr:\n${stderr}`);
    }
   } catch (e: any) {
    // tsc exits non‑zero when there are diagnostics; capture its partial output
    stdout = e.stdout?.toString?.() || "";
    stderr = e.stderr?.toString?.() || "";
    console.log(`[analyzeTypeScriptErrors] tsc error caught. stdout:\n${stdout}`);
    console.log(`[analyzeTypeScriptErrors] tsc error caught. stderr:\n${stderr}`);
   }

   const rawOutput = [stdout, stderr].filter(Boolean).join("\n");
   const output = stripAnsi(rawOutput);
   console.log(`[analyzeTypeScriptErrors] Combined tsc output (sanitized):\n${output}`);

    // Typical sanitized tsc output line formats we will support (after stripAnsi):
    // 1) path/to/file.ts(12,5): error TS1234: Message
    // 2) path/to/file.ts:12:5 - error TS1234: Message
    // 3) path/to/file.ts:12:5 - warning TS1234: Message  (if any plugin / future)
    const patterns: RegExp[] = [
      /^(?<file>.+?)\((?<line>\d+),(?<col>\d+)\):\s+(?<severity>error|warning)\s+TS(?<code>\d+):\s+(?<msg>.*)$/,
      /^(?<file>.+?):(?<line>\d+):(?<col>\d+)\s+-\s+(?<severity>error|warning)\s+TS(?<code>\d+):\s+(?<msg>.*)$/,
    ];

    const targetBase = path.basename(filePath);
    const diagnostics: TypeScriptDiagnostic[] = [];

    output.split(/\r?\n/).forEach((line) => {
      for (const rx of patterns) {
        const m = line.match(rx);
        if (!m || !m.groups) continue;
        const f = path.normalize(m.groups.file);
        if (path.basename(f) !== targetBase) continue; // keep only target file
        diagnostics.push({
          severity: (m.groups.severity as "error" | "warning") || "error",
          message: m.groups.msg.trim(),
          line: Number(m.groups.line),
          column: Number(m.groups.col),
          code: `TS${m.groups.code}`,
          file: f,
        });
        console.log(`[analyzeTypeScriptErrors] Parsed diagnostic:`, diagnostics[diagnostics.length - 1]);
        break;
      }
    });

    result.typescript_errors = diagnostics;
    result.health_summary.error_count = diagnostics.filter(d => d.severity === "error").length;
    result.health_summary.warning_count = diagnostics.filter(d => d.severity === "warning").length;
    result.health_summary.compilable = result.health_summary.error_count === 0;
    result.health_summary.overall_status =
      result.health_summary.error_count > 0
        ? "needs_attention"
        : result.health_summary.warning_count > 0
        ? "has_warnings"
        : "healthy";

    console.log(`[analyzeTypeScriptErrors] Health summary:`, result.health_summary);

    // If no diagnostics for this file but stdout/stderr had content, we still consider it healthy.
  } catch (err: any) {
    // Fallback: return single internal error diagnostic
    console.error(`[analyzeTypeScriptErrors] Failed to run tsc diagnostics: ${err?.message || String(err)}`);
    result.typescript_errors.push({
      severity: "error",
      message: `Failed to run tsc diagnostics: ${err?.message || String(err)}`,
      line: 0,
      column: 0,
      code: "TS-INTERNAL",
      file: filePath,
    });
    result.health_summary.error_count = 1;
    result.health_summary.compilable = false;
    result.health_summary.overall_status = "needs_attention";
  }

  return result;
}

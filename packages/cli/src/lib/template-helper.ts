import Handlebars from 'handlebars';
import * as fs from 'fs/promises';
import * as path from 'path';

const TEMPLATES_DIR = path.join(__dirname, '../../..', 'templates', 'feature');

export interface TemplateContext {
  [key: string]: any;
}

/**
 * Loads and compiles a Handlebars template from the templates directory
 */
export async function loadTemplate(templateName: string): Promise<HandlebarsTemplateDelegate<any>> {
  const templatePath = path.join(TEMPLATES_DIR, templateName);
  const templateContent = await fs.readFile(templatePath, 'utf-8');
  return Handlebars.compile(templateContent);
}

/**
 * Renders a template with the given context
 */
export async function renderTemplate(templateName: string, context: TemplateContext): Promise<string> {
  const template = await loadTemplate(templateName);
  return template(context);
}

/**
 * Helper to convert string to PascalCase
 */
export function toPascalCase(str: string): string {
  return str.replace(/(^\w|-\w)/g, g => g.replace(/-/, '').toUpperCase());
}

/**
 * Helper to convert string to camelCase
 */
export function toCamelCase(str: string): string {
  const pascal = toPascalCase(str);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

// Register Handlebars helpers
Handlebars.registerHelper('toPascalCase', toPascalCase);
Handlebars.registerHelper('toCamelCase', toCamelCase);

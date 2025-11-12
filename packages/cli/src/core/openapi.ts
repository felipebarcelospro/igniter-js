import type { IntrospectedRouter } from "./router-instrospector";

type OpenApiV3Document = Record<string, any>;

// Local minimal DocsConfig type to avoid cross-package type resolution issues during CLI build/testing
export interface DocsConfig {
  info?: { title?: string; version?: string; description?: string };
  servers?: Array<{ url: string; description?: string }>;
  securitySchemes?: Record<string, any>;
  playground?: any;
  filepath?: string;
}

function toPascalCase(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}
export class OpenAPIGenerator {
  private docsConfig: DocsConfig;
  private schemas: Record<string, any> = {};

  private constructor(config: DocsConfig) {
    this.docsConfig = config || {};
  }

  static create(config: DocsConfig): OpenAPIGenerator {
    return new OpenAPIGenerator(config);
  }

  public generate(router: IntrospectedRouter): OpenApiV3Document {
    const servers = (this.docsConfig.servers && this.docsConfig.servers.length > 0)
      ? this.docsConfig.servers
      : [{ url: 'http://localhost:3000/api/v1', description: 'Default server' }];

    const spec: OpenApiV3Document = {
      openapi: '3.0.0',
      info: this.docsConfig.info || { title: 'Igniter API', version: '1.0.0' },
      servers,
      tags: this.buildTags(router),
      paths: this.buildPaths(router),
      components: {
        schemas: this.schemas,
        securitySchemes: this.docsConfig.securitySchemes || {},
      },
    };
    return spec;
  }

  private buildTags(router: IntrospectedRouter): any[] {
    const tags: any[] = [];
    for (const [controllerKey, controller] of Object.entries(router.controllers)) {
      const tag = {
        name: controller.name || controllerKey,
        description: controller.description,
      };
      tags.push(tag);
    }
    return tags;
  }

  private buildPaths(router: IntrospectedRouter): Record<string, any> {
    const paths: Record<string, any> = {};
    for (const [controllerKey, controller] of Object.entries(router.controllers)) {
      for (const [actionKey, action] of Object.entries(controller.actions)) {
        const actionName = action.name || actionKey;
        let path = `/${controller.path}/${action.path}`;
        path = path.replace(/\/{2,}/g, '/');
        if (path.length > 1 && path.endsWith('/')) {
          path = path.slice(0, -1);
        }

        if (!paths[path]) {
          paths[path] = {};
        }

        const operation: Record<string, any> = {
          summary: action.description || actionName,
          operationId: actionName,
          tags: [controller.name || controllerKey],
          parameters: [],
          requestBody: undefined,
          responses: {
            '200': {
              description: 'Success',
              content: {
                'application/json': {
                  schema: {},
                },
              },
            },
          },
        };

        const pathParams = action.path.match(/:([a-zA-Z0-9_]+)/g);
        if (pathParams) {
          for (const param of pathParams) {
            const paramName = param.substring(1);
            operation.parameters.push({
              name: paramName,
              in: 'path',
              required: true,
              schema: { type: 'string' },
            });
          }
        }

        if ((action as any).querySchema) {
          const querySchemaName = `${toPascalCase(controller.name || controllerKey)}${toPascalCase(actionName)}Query`;
          const queryJsonSchema = (action as any).querySchema; // already JSON Schema
          this.schemas[querySchemaName] = queryJsonSchema;
          const properties = this.schemas[querySchemaName].properties || {};
          const requiredProps: string[] = this.schemas[querySchemaName].required || [];
          for (const propName of Object.keys(properties)) {
            operation.parameters.push({
              name: propName,
              in: 'query',
              required: requiredProps.includes(propName),
              schema: properties[propName],
            });
          }
        }

        if ((action as any).bodySchema) {
          const bodySchemaName = `${toPascalCase(controller.name || controllerKey)}${toPascalCase(actionName)}Body`;
          const bodyJsonSchema = (action as any).bodySchema; // already JSON Schema
          this.schemas[bodySchemaName] = bodyJsonSchema;
          operation.requestBody = {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: `#/components/schemas/${bodySchemaName}` },
              },
            },
          };
        }

        if ((action as any).isStream) {
          operation.description = (operation.description ? operation.description + '\n\n' : '') +
            'This endpoint supports Server-Sent Events (SSE) for real-time updates. ' +
            'It functions as a standard GET request initially, then maintains an open connection for streaming data.';
        }

        paths[path][action.method.toLowerCase()] = operation;
      }
    }
    return paths;
  }
}

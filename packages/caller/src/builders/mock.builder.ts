import type {
  IgniterCallerSchemaBuildResult,
  IgniterCallerSchemaInput,
  IgniterCallerSchemaMapFrom,
  IgniterCallerSchemaRegistry,
} from '../types/schema-builder'
import type {
  IgniterCallerMockPathDefinition,
  IgniterCallerMockRegistry,
} from '../types/mock'
import type {
  IgniterCallerSchemaMap,
  SchemaMapPaths,
} from '../types/schemas'
import { IgniterCallerMockManager } from '../core/mock'

interface IgniterCallerMockBuilderState<
  TSchemas extends IgniterCallerSchemaMap,
> {
  registry: IgniterCallerMockRegistry<TSchemas>
}

/**
 * Builder for typed caller mock registries.
 */
export class IgniterCallerMockBuilder<
  TSchemas extends IgniterCallerSchemaMap = IgniterCallerSchemaMap,
> {
  private constructor(
    private readonly state: IgniterCallerMockBuilderState<TSchemas>,
  ) {}

  /**
   * Creates a new mock builder.
   */
  static create(): IgniterCallerMockBuilder<{}> {
    return new IgniterCallerMockBuilder({ registry: {} })
  }

  /**
   * Sets schemas to enable typed mock definitions.
   *
   * @param _schemas - Schema map or build result.
   */
  withSchemas<TNewSchemas extends IgniterCallerSchemaMap>(
    _schemas: TNewSchemas,
  ): IgniterCallerMockBuilder<TNewSchemas>
  withSchemas<
    TNewSchemas extends IgniterCallerSchemaMap,
    TRegistry extends IgniterCallerSchemaRegistry,
  >(
    _schemas: IgniterCallerSchemaBuildResult<TNewSchemas, TRegistry>,
  ): IgniterCallerMockBuilder<TNewSchemas>
  withSchemas<TNewSchemas extends IgniterCallerSchemaInput>(
    _schemas: TNewSchemas,
  ): IgniterCallerMockBuilder<IgniterCallerSchemaMapFrom<TNewSchemas>> {
    return new IgniterCallerMockBuilder({
      registry: this.state.registry as IgniterCallerMockRegistry<
        IgniterCallerSchemaMapFrom<TNewSchemas>
      >,
    })
  }

  /**
   * Registers mock handlers for a path.
   *
   * @param path - Schema path.
   * @param handlers - Method handlers or static responses.
   */
  mock<TPath extends SchemaMapPaths<TSchemas>>(
    path: TPath,
    handlers: IgniterCallerMockPathDefinition<TSchemas, TPath>,
  ): IgniterCallerMockBuilder<TSchemas> {
    const registry = {
      ...this.state.registry,
      [path]: {
        ...(this.state.registry[path] || {}),
        ...handlers,
      },
    } as IgniterCallerMockRegistry<TSchemas>

    return new IgniterCallerMockBuilder({ registry })
  }

  /**
   * Builds a mock manager instance.
   */
  build(): IgniterCallerMockManager<TSchemas> {
    return new IgniterCallerMockManager(this.state.registry)
  }
}

/**
 * Public entrypoint for the mock builder.
 */
export const IgniterCallerMock = {
  create: IgniterCallerMockBuilder.create,
}

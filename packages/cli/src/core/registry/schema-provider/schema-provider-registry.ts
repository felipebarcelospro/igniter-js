import type {
  SchemaProvider,
  SchemaProviderOptions,
} from "./base-schema-provider";

class SchemaProviderRegistry {
  private readonly providers: Map<string, SchemaProvider>;

  constructor(providers: SchemaProvider[]) {
    this.providers = new Map(
      providers.map((provider) => [provider.id, provider]),
    );
  }

  public static create(): SchemaProviderRegistryBuilder {
    return new SchemaProviderRegistryBuilder();
  }

  public list(): SchemaProvider[] {
    return Array.from(this.providers.values());
  }

  public get(id: string): SchemaProvider | undefined {
    return this.providers.get(id);
  }

  public findBySchemaOption(option: string): SchemaProvider | undefined {
    return this.list().find((provider) => provider.matchesSchemaOption(option));
  }

  public async detectAvailableProviders(
    options: SchemaProviderOptions = {},
  ): Promise<SchemaProvider[]> {
    const results: SchemaProvider[] = [];
    for (const provider of this.list()) {
      if (await provider.isAvailable(options)) {
        results.push(provider);
      }
    }
    return results;
  }
}

class SchemaProviderRegistryBuilder {
  private readonly providers: SchemaProvider[] = [];

  public register(provider: SchemaProvider): this {
    this.providers.push(provider);
    return this;
  }

  public build(): SchemaProviderRegistry {
    return new SchemaProviderRegistry(this.providers);
  }
}

export { SchemaProviderRegistry, SchemaProviderRegistryBuilder };

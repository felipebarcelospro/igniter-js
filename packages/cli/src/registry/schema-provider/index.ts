import { SchemaProviderRegistry } from "@/core/registry/schema-provider/schema-provider-registry";
import { PrismaSchemaProvider } from "./prisma";

export const schemaProviderRegistry = SchemaProviderRegistry.create().register(new PrismaSchemaProvider()).build();
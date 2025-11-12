import { access } from "fs/promises";
import * as path from "path";
import { PrismaProvider } from "./providers/prisma";

const PRISMA_SCHEMA_CANDIDATES = [
  path.join(process.cwd(), "prisma", "schema.prisma"),
  path.join(process.cwd(), "schema.prisma"),
];

export async function hasPrismaSchema(): Promise<boolean> {
  for (const candidate of PRISMA_SCHEMA_CANDIDATES) {
    try {
      await access(candidate);
      return true;
    } catch {
      continue;
    }
  }
  return false;
}

export async function getPrismaModels(): Promise<string[]> {
  try {
    const provider = new PrismaProvider();
    return await provider.listModels();
  } catch (error) {
    // Surface the error to the caller when schema exists but parsing failed.
    if (await hasPrismaSchema()) {
      throw error;
    }
    return [];
  }
}

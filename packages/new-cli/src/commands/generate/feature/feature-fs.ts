import { mkdir, readdir, stat } from "fs/promises";
import * as path from "path";

export function getFeatureDir(featureName: string): string {
  return path.join(process.cwd(), "src", "features", featureName);
}

export async function listFeatureDirectories(): Promise<string[]> {
  const featuresRoot = path.join(process.cwd(), "src", "features");
  try {
    const entries = await readdir(featuresRoot, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
  } catch {
    return [];
  }
}

export async function ensureFeatureStructure(featureDir: string): Promise<void> {
  await mkdir(featureDir, { recursive: true });
  await mkdir(path.join(featureDir, "controllers"), { recursive: true });
  await mkdir(path.join(featureDir, "procedures"), { recursive: true });
}

export async function fileExists(filePath: string): Promise<boolean> {
  try {
    const fileStat = await stat(filePath);
    return fileStat.isFile();
  } catch {
    return false;
  }
}

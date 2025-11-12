import { mkdir, readdir, stat } from "fs/promises";
import * as path from "path";

/**
 * Utility helpers for working with feature directories. The class is abstract
 * to make it non-instantiable while still grouping the behaviour in a single
 * namespace.
 */
export abstract class FeatureWorkspace {
  protected constructor() {
    // Static utility class – no instances allowed.
  }

  /**
   * Returns the absolute path to the feature root directory.
   */
  public static root(): string {
    return path.join(process.cwd(), "src", "features");
  }

  /**
   * Returns the absolute path for a specific feature name.
   */
  public static featureDir(featureName: string): string {
    return path.join(this.root(), featureName);
  }

  /**
   * Ensures that the directory structure required for a feature exists.
   */
  public static async ensureStructure(featureDir: string): Promise<void> {
    await mkdir(featureDir, { recursive: true });
    await mkdir(path.join(featureDir, "controllers"), { recursive: true });
    await mkdir(path.join(featureDir, "procedures"), { recursive: true });
  }

  /**
   * Lists all available feature directories under `src/features`.
   */
  public static async listFeatures(): Promise<string[]> {
    try {
      const entries = await readdir(this.root(), { withFileTypes: true });
      return entries
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
        .sort();
    } catch {
      return [];
    }
  }

  /**
   * Checks if the provided path exists and corresponds to a file.
   */
  public static async fileExists(filePath: string): Promise<boolean> {
    try {
      const fileStat = await stat(filePath);
      return fileStat.isFile();
    } catch {
      return false;
    }
  }
}

import * as fs from 'fs/promises';

export async function isPathEmpty(path: string): Promise<boolean> {
  try {
    const files = await fs.readdir(path);
    return files.length === 0;
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return true;
    }
    throw error;
  }
}
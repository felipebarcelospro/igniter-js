import path from "path";
import fs from "fs";

type SupportedFramework = 'nextjs' | 'tanstack-start' | 'generic';

export function detectFramework(projectDir: string): SupportedFramework {
  // Check if the project is a Next.js project
  if (fs.existsSync(path.join(projectDir, 'next.config.js')) || fs.existsSync(path.join(projectDir, 'next.config.ts'))) {
    return 'nextjs';
  }

  // Precisa ler o package.json e verificar se tem @tanstack/start
  const packageJson = JSON.parse(fs.readFileSync(path.join(projectDir, 'package.json'), 'utf8'));
  if (packageJson.dependencies['@tanstack/react-start']) {
    return 'tanstack-start';
  } else {
    return 'generic';
  }
}

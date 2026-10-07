// Post-build step for static export: mirror every out/llms.mdx/**/*.mdx
// file to its public alias path (out/<page-url>.mdx), e.g.
//   out/llms.mdx/docs/core/quick-start.mdx -> out/docs/core/quick-start.mdx
// Files with an .mdx suffix never collide with route directories, while the
// extensionless handler URLs would. This keeps the Fumadocs ".mdx" URL
// pattern (used by Copy-Markdown buttons and LLM citations) working on any
// static host, with no redirect service required.
import { cpSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';

const outDir = join(process.cwd(), 'out');
const srcDir = join(outDir, 'llms.mdx');

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full);
    else if (entry.endsWith('.mdx')) {
      const rel = relative(srcDir, full);
      const dest = join(outDir, rel);
      mkdirSync(dirname(dest), { recursive: true });
      cpSync(full, dest);
    }
  }
}

walk(srcDir);
console.log('[postbuild] llms.mdx aliases mirrored');

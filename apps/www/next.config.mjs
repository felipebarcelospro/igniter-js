import { createMDX } from "fumadocs-mdx/next";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const withMDX = createMDX();

/** @type {import('next').NextConfig} */
const config = {
  // Static export for free-tier hosting (Render Static Site): no Node
  // server, no API routes, no image optimization, no rewrites.
  output: 'export',
  // Every route becomes a directory with index.html, so a catch-all
  // file route (e.g. /llms.mdx/docs/agents) never collides with its own
  // child routes on disk.
  trailingSlash: true,
  reactStrictMode: true,
  // Render free-tier builders OOM with default worker count (622 static
  // pages); cap workers the same way as Editaliza when building on Render.
  ...(process.env.RENDER ? { experimental: { cpus: 2 } } : {}),
  turbopack: {
    root: __dirname,
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*",
      },
    ],
  },
};

export default withMDX(config);

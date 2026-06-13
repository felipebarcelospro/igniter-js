import { createMDX } from "fumadocs-mdx/next";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const withMDX = createMDX();

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  turbopack: {
    root: __dirname,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*",
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: "/blog/:path*.mdx",
        destination: "/llms.mdx/blog/:path*",
      },
      {
        source: "/docs/:path*.mdx",
        destination: "/llms.mdx/docs/:path*",
      },
      {
        source: "/learn/:path*.mdx",
        destination: "/llms.mdx/learn/course/:path*",
      },
      {
        source: "/changelog/:path*.mdx",
        destination: "/llms.mdx/changelog/:path*",
      },
      {
        source: "/showcase/:path*.mdx",
        destination: "/llms.mdx/showcase/:path*",
      },
      {
        source: "/templates/:path*.mdx",
        destination: "/llms.mdx/templates/:path*",
      },
      // Also support .md extension
      {
        source: "/blog/:path*.md",
        destination: "/llms.mdx/blog/:path*",
      },
      {
        source: "/docs/:path*.md",
        destination: "/llms.mdx/docs/:path*",
      },
      {
        source: "/learn/:path*.md",
        destination: "/llms.mdx/learn/course/:path*",
      },
      {
        source: "/changelog/:path*.md",
        destination: "/llms.mdx/changelog/:path*",
      },
      {
        source: "/showcase/:path*.md",
        destination: "/llms.mdx/showcase/:path*",
      },
      {
        source: "/templates/:path*.md",
        destination: "/llms.mdx/templates/:path*",
      },
    ];
  },
};

export default withMDX(config);

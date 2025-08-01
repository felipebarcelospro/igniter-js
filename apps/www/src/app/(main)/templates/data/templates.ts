export interface Template {
  id: string;
  title: string;
  description: string;
  image: string;
  framework: string;
  useCase: string;
  css: string;
  database?: string;
  demoUrl: string;
  repositoryUrl?: string;
  deployUrl: string;
  tags: string[];
  creator: {
    username: string;
    name?: string;
    avatar?: string;
  };
}

export const templates: Template[] = [
  {
    id: "starter-nextjs",
    title: "Next.js Full-Stack App",
    description: "A full-featured application built using the latest Next.js conventions with end-to-end type safety powered by Igniter.js.",
    image: "/templates/nextjs-base-template.png",
    framework: "Next.js",
    useCase: "Full-Stack",
    css: "Tailwind CSS",
    database: "PostgreSQL",
    demoUrl: "https://github.com/felipebarcelospro/igniter-js/tree/main/apps/starter-nextjs",
    repositoryUrl: "https://github.com/felipebarcelospro/igniter-js/tree/main/apps/starter-nextjs",
    deployUrl: "https://vercel.com/new/clone?repository-url=https://github.com/felipebarcelospro/igniter-js&project-name=igniter-nextjs-starter&repository-name=igniter-nextjs-starter&root-directory=apps/starter-nextjs",
    tags: ["Next.js", "TypeScript", "Prisma", "Redis", "BullMQ"],
    creator: {
      username: "felipebarcelospro"
    }
  },
  {
    id: "starter-bun-react-app",
    title: "Bun + React Full-Stack App",
    description: "A full-stack, type-safe application with Bun and React featuring server-side rendering and unified runtime.",
    image: "/templates/bun-base-template.png",
    framework: "React",
    useCase: "Full-Stack",
    css: "Tailwind CSS",
    demoUrl: "https://github.com/felipebarcelospro/igniter-js/tree/main/apps/starter-bun-react-app",
    repositoryUrl: "https://github.com/felipebarcelospro/igniter-js/tree/main/apps/starter-bun-react-app",
    deployUrl: "https://vercel.com/new/clone?repository-url=https://github.com/felipebarcelospro/igniter-js&project-name=igniter-bun-react-starter&repository-name=igniter-bun-react-starter&root-directory=apps/starter-bun-react-app",
    tags: ["Bun", "React", "SSR", "TypeScript", "Redis"],
    creator: {
      username: "felipebarcelospro"
    }
  },
  {
    id: "starter-tanstack-start",
    title: "TanStack Start App",
    description: "A modern full-stack application built with TanStack Start featuring type-safe routing and server functions.",
    image: "/templates/tanstack-base-template.png",
    framework: "TanStack Start",
    useCase: "Full-Stack",
    css: "Tailwind CSS",
    database: "PostgreSQL",
    demoUrl: "https://github.com/felipebarcelospro/igniter-js/tree/main/apps/starter-tanstack-start",
    repositoryUrl: "https://github.com/felipebarcelospro/igniter-js/tree/main/apps/starter-tanstack-start",
    deployUrl: "https://vercel.com/new/clone?repository-url=https://github.com/felipebarcelospro/igniter-js&project-name=igniter-tanstack-starter&repository-name=igniter-tanstack-starter&root-directory=apps/starter-tanstack-start",
    tags: ["TanStack", "TypeScript", "Prisma", "Vite"],
    creator: {
      username: "felipebarcelospro"
    }
  },
  {
    id: "starter-express-rest-api",
    title: "Express REST API",
    description: "A robust REST API built with Express.js and Igniter.js featuring structured logging and background jobs.",
    image: "/templates/express-base-template.png",
    framework: "Express",
    useCase: "API",
    css: "N/A",
    database: "PostgreSQL",
    demoUrl: "https://github.com/felipebarcelospro/igniter-js/tree/main/apps/starter-express-rest-api",
    repositoryUrl: "https://github.com/felipebarcelospro/igniter-js/tree/main/apps/starter-express-rest-api",
    deployUrl: "https://vercel.com/new/clone?repository-url=https://github.com/felipebarcelospro/igniter-js&project-name=igniter-express-api&repository-name=igniter-express-api&root-directory=apps/starter-express-rest-api",
    tags: ["Express", "REST API", "TypeScript", "Prisma"],
    creator: {
      username: "felipebarcelospro"
    }
  },
  {
    id: "starter-bun-rest-api",
    title: "Bun REST API",
    description: "A high-performance REST API built with Bun runtime and Igniter.js for maximum speed and efficiency.",
    image: "/templates/bun-base-template.png",
    framework: "Bun",
    useCase: "API",
    css: "N/A",
    database: "PostgreSQL",
    demoUrl: "https://github.com/felipebarcelospro/igniter-js/tree/main/apps/starter-bun-rest-api",
    repositoryUrl: "https://github.com/felipebarcelospro/igniter-js/tree/main/apps/starter-bun-rest-api",
    deployUrl: "https://vercel.com/new/clone?repository-url=https://github.com/felipebarcelospro/igniter-js&project-name=igniter-bun-api&repository-name=igniter-bun-api&root-directory=apps/starter-bun-rest-api",
    tags: ["Bun", "REST API", "TypeScript", "Prisma"],
    creator: {
      username: "felipebarcelospro"
    }
  },
  {
    id: "starter-deno-rest-api",
    title: "Deno REST API",
    description: "A secure and modern REST API built with Deno runtime and Igniter.js featuring built-in TypeScript support.",
    image: "/templates/deno-base-template.png",
    framework: "Deno",
    useCase: "API",
    css: "N/A",
    database: "PostgreSQL",
    demoUrl: "https://github.com/felipebarcelospro/igniter-js/tree/main/apps/starter-deno-rest-api",
    repositoryUrl: "https://github.com/felipebarcelospro/igniter-js/tree/main/apps/starter-deno-rest-api",
    deployUrl: "https://vercel.com/new/clone?repository-url=https://github.com/felipebarcelospro/igniter-js&project-name=igniter-deno-api&repository-name=igniter-deno-api&root-directory=apps/starter-deno-rest-api",
    tags: ["Deno", "REST API", "TypeScript", "Prisma"],
    creator: {
      username: "felipebarcelospro"
    }
  },
  {
    id: "saas-boilerplate",
    title: "SaaS Boilerplate",
    description: "Build your SaaS in a weekend. Every SaaS starts with the same basic code - stop reinventing the wheel.",
    image: "https://saas-boilerplate.vibedev.com.br/_next/image?url=%2Fscreenshots%2Fscreenshot-light-dashboard.jpeg&w=3840&q=75",
    framework: "Next.js",
    useCase: "SaaS", 
    css: "Tailwind CSS",
    database: "PostgreSQL",
    demoUrl: "https://saas-boilerplate.vibedev.com.br/",
    deployUrl: "https://saas-boilerplate.vibedev.com.br/",
    tags: ["SaaS", "Next.js", "TypeScript", "Authentication", "Subscriptions", "Dashboard"],
    creator: {
      username: "vibedev"
    }
  }
];

export const frameworks = ["Next.js", "React", "TanStack Start", "Express", "Bun", "Deno"];
export const useCases = ["Full-Stack", "API", "SaaS"];
export const cssFrameworks = ["Tailwind CSS", "N/A"];
export const databases = ["PostgreSQL"];
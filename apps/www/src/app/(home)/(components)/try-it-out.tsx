'use client'

import { CodeBlock, Pre } from "fumadocs-ui/components/codeblock";
import { TerminalIcon } from "lucide-react";

const initCommand = "npx @igniter-js/cli@latest init my-igniter-app";

export function TryItOut() {
  return (
    <section className="container max-w-5xl pt-6">
      <div>
        <p className="text-base sm:text-lg lg:text-2xl tracking-tight leading-snug font-light col-span-full mb-6">
          Igniter.js brings typed APIs, modular backend packages, and consistent
          TypeScript conventions into one codebase. Package-specific guidance
          helps coding agents follow real project patterns, while developers
          stay in control of the design and review.
        </p>
        <div className="p-4 sm:p-6 lg:p-8 bg-linear-to-b from-orange-500/15 rounded-xl col-span-full border-t border-x rounded-b-none">
          <h2 className="text-4xl sm:text-5xl lg:text-6xl text-center mix-blend-overlay font-tinos">
            Try it out.
          </h2>
          <CodeBlock lang="bash" className="mx-auto w-full max-w-[800px] pl-2 sm:pl-4">
            <Pre>{initCommand}</Pre>
          </CodeBlock>
          <CreateAppAnimation />
        </div>
      </div>
    </section>
  );
}

export function CreateAppAnimation() {
  return (
    <div className="mx-auto mt-4 w-full max-w-[800px] px-2 sm:px-0">
      <div className="overflow-hidden rounded-xl border shadow-lg bg-fd-card">
        <div className="flex flex-row items-center gap-2 border-b px-3 py-2 sm:px-4">
          <TerminalIcon className="size-3 sm:size-4" aria-hidden="true" />
          <span className="font-bold text-xs sm:text-sm">Terminal preview</span>
          <span className="ml-auto rounded-full border px-2 py-0.5 text-[10px] text-muted-foreground sm:text-xs">
            Illustrated CLI flow
          </span>
        </div>
        <pre className="max-h-[22rem] overflow-auto p-3 text-[11px] leading-5 sm:p-4 sm:text-xs">
          <code className="grid min-w-max gap-1">
            <span className="text-muted-foreground">$ {initCommand}</span>
            <span aria-hidden="true"> </span>
            <span className="font-semibold">
              ◆ Which starter would you like to use?
            </span>
            <span>│ ● Next.js</span>
            <span>│ ○ Express.js</span>
            <span>│ ○ Deno</span>
            <span>│ ○ Bun</span>
            <span>│ ○ Bun + React (Vite)</span>
            <span>│ ○ TanStack Start</span>
            <span aria-hidden="true"> </span>
            <span className="font-semibold">
              ◆ What add-ons would you like for your project?
            </span>
            <span>│ Choose optional add-ons, or continue without them</span>
            <span aria-hidden="true"> </span>
            <span className="font-semibold">◆ Which package manager?</span>
            <span>│ ○ npm  ○ yarn  ○ pnpm  ○ bun</span>
          </code>
        </pre>
      </div>
    </div>
  );
}

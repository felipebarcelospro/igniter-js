'use client'

import { cn } from "@/lib/utils";
import { CodeBlock, Pre } from "fumadocs-ui/components/codeblock";
import { TerminalIcon } from "lucide-react";
import { Fragment, useEffect, useState, type HTMLAttributes, type ReactElement } from "react";

export function TryItOut() {
  return (
    <section className="container max-w-6xl pt-6">
      <div>
        <p className="text-2xl tracking-tight leading-snug font-light col-span-full md:text-4xl mb-6">
          Igniter.js is the <span className="font-semibold underline decoration-brand/30 underline-offset-4">first AI-native</span>{' '}
          <span className="text-brand font-medium">TypeScript framework</span>{' '}
          with built-in training for <span className="font-medium">15+ Code Agents</span>{' '}
          (Cursor, Claude Code, Copilot). Delivering{' '}
          <span className="italic">zero setup</span>, advanced debugging, and a{' '}
          <span className="font-medium">low-entropy architecture</span>. Build with{' '}
          <span className="text-brand font-medium">type-safe RPC</span>, real-time events,{' '}
          background jobs — works seamlessly with{' '}
          <span className="font-medium">Next.js, Bun, Hono, Express</span>, and beyond.
        </p>
        <div className="p-8 bg-linear-to-b from-orange-500/30 rounded-xl col-span-full border-t border-x rounded-b-none">
          <h2 className="text-6xl text-center mix-blend-overlay font-tinos">
            Try it out.
          </h2>
          <CodeBlock lang="bash" className="mx-auto w-full max-w-[800px]">
            <Pre>npx igniter init</Pre>
          </CodeBlock>
          <CreateAppAnimation />
        </div>
      </div>
    </section>
  )
}


export function CreateAppAnimation() {
  const installCmd = 'npx igniter init';
  const tickTime = 100;
  const timeCommandEnter = installCmd.length;
  const timeCommandRun = timeCommandEnter + 3;
  const timeCommandEnd = timeCommandRun + 3;
  const timeWindowOpen = timeCommandEnd + 1;
  const timeEnd = timeWindowOpen + 1;

  const [tick, setTick] = useState(timeEnd);

  useEffect(() => {
    const timer = setInterval(() => {
      setTick((prev) => (prev >= timeEnd ? prev : prev + 1));
    }, tickTime);

    return () => {
      clearInterval(timer);
    };
  }, [timeEnd]);

  const lines: ReactElement[] = [];

  lines.push(
    <span key="command_type">
      {installCmd.substring(0, tick)}
      {tick < timeCommandEnter && (
        <div className="inline-block h-3 w-1 animate-pulse bg-white" />
      )}
    </span>,
  );

  if (tick >= timeCommandEnter) {
    lines.push(<span key="space"> </span>);
  }

  if (tick > timeCommandRun)
    lines.push(
      <Fragment key="command_response">
        {tick > timeCommandRun + 1 && (
          <>
            <span className="font-bold">◇ Project name</span>
            <span>│ my-igniter-app</span>
          </>
        )}
        {tick > timeCommandRun + 2 && (
          <>
            <span>│</span>
            <span className="font-bold">◆ Choose a runtime</span>
          </>
        )}
        {tick > timeCommandRun + 3 && (
          <>
            <span>│ ● Next.js</span>
            <span>│ ○ Bun</span>
            <span>│ ○ Hono</span>
          </>
        )}
      </Fragment>,
    );

  return (
    <div
      className="relative mt-4 w-full mx-auto max-w-[800px]"
      onMouseEnter={() => {
        if (tick >= timeEnd) {
          setTick(0);
        }
      }}
    >
      {tick > timeWindowOpen && (
        <LaunchAppWindow className="absolute bottom-5 right-4 z-10 animate-in fade-in slide-in-from-top-10" />
      )}
      <pre className="overflow-hidden rounded-xl border text-[13px] shadow-lg bg-fd-card">
        <div className="flex flex-row items-center gap-2 border-b px-4 py-2">
          <TerminalIcon className="size-4" />{' '}
          <span className="font-bold">Terminal</span>
          <div className="grow" />
          <div className="size-2 rounded-full bg-red-400" />
        </div>
        <div className="min-h-52">
          <code className="grid p-4">{lines}</code>
        </div>
      </pre>
    </div>
  );
}

function LaunchAppWindow(props: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={cn(
        'overflow-hidden rounded-md border bg-fd-background shadow-xl',
        props.className,
      )}
    >
      <div className="relative flex h-6 flex-row items-center border-b bg-fd-muted px-4 text-xs text-fd-muted-foreground">
        <p className="absolute inset-x-0 text-center">localhost:3000</p>
      </div>
      <div className="p-4 text-sm">New App launched!</div>
    </div>
  );
}
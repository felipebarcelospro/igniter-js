'use client'

import * as React from "react"

import { ArrowRight, Code2, ArrowUpRight } from "lucide-react"
import { FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export default function Home() {
  return (
    <div className="h-screen grid grid-rows-[auto_1fr_auto] gap-4">
      <header className="border-b bg-black/5 w-full border-x px-3 flex items-center justify-between space-x-4">
        <div className="border-x w-full py-[0.5rem] px-[1rem] flex items-center justify-between space-x-4">
          <div className="flex items-center space-x-2">
            <img src="https://igniterjs.com/logo-light.svg" alt="" className="h-5 invert-1 dark:invert-0" />
          </div>

          <div className="flex items-center space-x-4">
            <a href="https://github.com/felipebarcelospro/igniter-js" target="_blank">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path
                  d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
            </a>
            <a href="https://twitter.com/igniterjs" target="_blank">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path
                  d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
            <Button variant="outline" className="bg-transparent rounded-full !px-5 uppercase font-mono h-6" asChild>
              <a href="/api/v1/docs" target="_blank">
                <span className="opacity-60 text-[10px]">Open Igniter Studio</span>
                <ArrowUpRight className="size-3" />
              </a>
            </Button>
           </div>
        </div>
      </header>

      <main className="flex items-center">
        <div className="container max-w-2xl mx-auto space-y-12">
          <div className="font-mono space-y-1">
            <p className="text-sm text-muted-foreground max-w-md leading-relaxed">
              1. Get started by editing the `app/page.tsx` file.
            </p>

            <p className="text-sm text-muted-foreground max-w-md leading-relaxed">
              2. Save and see your changes on realtime.
            </p>

            <p className="text-sm text-muted-foreground leading-relaxed">
              3. Open the browser and navigate to `http://localhost:3000/api/v1/docs`.
            </p>
          </div>

          <section className="grid gap-4 sm:grid-cols-2" aria-label="Resources">
            <article>
              <Card className="shadow-sm hover:shadow-md transition-shadow bg-transparent">
                <CardContent className="space-y-2">
                  <span className="h-10 w-10 border flex items-center justify-center mb-4 rounded-md">
                    <FileText className="size-3 text-muted-foreground" aria-hidden="true" />
                  </span>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">Documentation</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Explore our documentation covering Igniter.js features, API references, and tutorials.
                  </p>
                  <Button variant="outline" className="w-full !mt-8" asChild>
                    <a href="https://igniterjs.com/docs" target="_blank">
                      Read Docs
                      <ArrowRight className="w-4 h-4 ml-auto" aria-hidden="true" />
                    </a>
                  </Button>
                </CardContent>
              </Card>
            </article>

            <article>
              <Card className="shadow-sm hover:shadow-md transition-shadow bg-transparent">
                <CardContent className="space-y-2">
                  <span className="h-10 w-10 border flex items-center justify-center mb-4 rounded-md">
                    <Code2 className="size-3 text-muted-foreground" aria-hidden="true" />
                  </span>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">Need Help?</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Start your journey with Igniter.js by exploring our quick start guide with step-by-step instructions.
                  </p>
                  <Button variant="outline" className="w-full !mt-8" asChild>
                    <a href="https://igniterjs.com/docs/getting-started/quick-start-guide" target="_blank">
                      Get Started
                      <ArrowRight className="w-4 h-4 ml-auto" aria-hidden="true" />
                    </a>
                  </Button>
                </CardContent>
              </Card>
            </article>
          </section>
        </div>
      </main>
    </div>
  )
}

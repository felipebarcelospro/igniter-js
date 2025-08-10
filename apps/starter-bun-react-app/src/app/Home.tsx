import * as React from "react"

import { ArrowRight, Code2, Github, Twitter, Youtube } from "lucide-react"
import { FileText } from "lucide-react"
import { Button } from "../components/ui/button"
import { Card, CardContent } from "../components/ui/card"

export function App() {
  return (
    <div className="min-h-screen flex flex-col pt-12 space-y-12">
      <header className="max-w-2xl w-full space-y-8 mx-auto my-auto">
        <div className="">
          <img src="https://igniterjs.com/logo-light.svg" className="h-8 mb-8" alt="" />

          <div className="font-mono space-y-1">
            <p className="text-sm text-muted-foreground max-w-md leading-relaxed">
              1. Get started by editing the `app/Home.tsx` file.
            </p>

            <p className="text-sm text-muted-foreground max-w-md leading-relaxed">
              2. Save and see your changes on realtime.
            </p>

            <p className="text-sm text-muted-foreground leading-relaxed">
              3. Open the browser and navigate to `http://localhost:3000/api/v1/docs`.
            </p>
          </div>
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
                  <a href="https://igniterjs.com">
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
                  <h3 className="font-semibold">Igniter CLI</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Enhance your development workflow with our CLI tool. Quickly scaffold projects and automate common tasks with commands.
                </p>
                <Button variant="outline" className="w-full !mt-8" asChild>
                  <a href="https://igniterjs.com/docs/cli-and-tooling">
                    Get Started
                    <ArrowRight className="w-4 h-4 ml-auto" aria-hidden="true" />
                  </a>
                </Button>
              </CardContent>
            </Card>
          </article>
        </section>
      </header>

      <footer className="border-t py-2 bg-black/5 text-center w-full text-sm text-muted-foreground">
        <div className="container max-w-2xl mx-auto flex items-center justify-between">
          <nav aria-label="Footer Links">
            <p className="text-xs">
              Powered by
              <a
                href="https://igniterjs.com"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium underline underline-offset-4 hover:text-primary transition-colors ml-1"
                aria-label="Visit Igniter.js website"
              >
                Igniter.js
              </a>
            </p>
          </nav>

          <div className="flex items-center justify-start gap-2">
            <Button variant="ghost" size="icon" className="rounded-full size-7" asChild>
              <a href="https://github.com/felipebarcelospro/igniter-js" target="_blank" rel="noopener noreferrer">
                <Github className="size-3" />
                <span className="sr-only">GitHub Repository</span>
              </a>
            </Button>
            <Button variant="ghost" size="icon" className="rounded-full size-7" asChild>
              <a href="https://twitter.com/igniterjs" target="_blank" rel="noopener noreferrer">
                <Twitter className="size-3" />
                <span className="sr-only">X (Twitter) Profile</span>
              </a>
            </Button>
          </div>
        </div>
      </footer>
    </div>
  )
}

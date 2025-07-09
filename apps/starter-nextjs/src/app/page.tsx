'use client'

import * as React from "react"
import Link from "next/link"

import { ArrowRight, Code2, Github, Twitter, Youtube } from "lucide-react"
import { FileText } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col pt-12 space-y-12">
      <header className="max-w-2xl w-full space-y-8 mx-auto my-auto">
        <div className="space-y-6 text-center">
          <Badge variant="outline" className="mx-auto rounded-full px-3 py-1 text-sm font-medium bg-cyan-500/10 text-cyan-500 border-cyan-300/10/20" aria-label="Beta version">
            BETA
          </Badge>

          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Welcome to <br />Igniter Boilerplate
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-md mx-auto leading-relaxed">
            Igniter is a modern, type-safe HTTP framework designed to streamline the development of scalable TypeScript applications.
          </p>

          <div className="flex items-center justify-center gap-4">
            <Button variant="outline" size="icon" asChild>
              <a href="https://github.com/felipebarcelospro/igniter-js" target="_blank" rel="noopener noreferrer">
                <Github className="h-4 w-4" />
                <span className="sr-only">GitHub Repository</span>
              </a>
            </Button>
            <Button variant="outline" size="icon" asChild>
              <a href="https://twitter.com/feldbarcelospro" target="_blank" rel="noopener noreferrer">
                <Twitter className="h-4 w-4" />
                <span className="sr-only">X (Twitter) Profile</span>
              </a>
            </Button>
            <Button variant="outline" size="icon" asChild>
              <a href="https://youtube.com/@vibedev.official" target="_blank" rel="noopener noreferrer">
                <Youtube className="h-4 w-4" />
                <span className="sr-only">YouTube Channel</span>
              </a>
            </Button>
          </div>
        </div>

        <section className="grid gap-4 sm:grid-cols-2" aria-label="Resources">
          <article>
            <Card className="rounded-2xl shadow-sm hover:shadow-md transition-shadow bg-card">
              <CardContent className="space-y-2">
                <span className="h-10 w-10 rounded-lg border border-cyan-300/10 bg-cyan-500/10 flex items-center justify-center mb-4">
                  <FileText className="w-5 h-5 text-cyan-500" aria-hidden="true" />
                </span>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">Documentation</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Learn more about Igniter Framework features and API.
                </p>
                <Button variant="outline" className="w-full !mt-8 rounded-xl" asChild>
                  <Link href="https://github.com/felipebarcelospro/igniter-js">
                    Read Docs
                    <ArrowRight className="w-4 h-4 ml-auto" aria-hidden="true" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </article>

          <article>
            <Card className="rounded-2xl shadow-sm hover:shadow-md transition-shadow bg-card">
              <CardContent className="space-y-2">
                <span className="h-10 w-10 rounded-lg border border-cyan-300/10 bg-cyan-500/10 flex items-center justify-center mb-4">
                  <Code2 className="w-5 h-5 text-cyan-500" aria-hidden="true" />
                </span>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">Igniter CLI</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Generate code and manage your Igniter projects.
                </p>
                <Button variant="outline" className="w-full !mt-8 rounded-xl" asChild>
                  <Link href="https://github.com/felipebarcelospro/igniter-cli">
                    Get Started
                    <ArrowRight className="w-4 h-4 ml-auto" aria-hidden="true" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </article>
        </section>
      </header>

      <footer className="border-t py-6 text-center w-full text-sm text-muted-foreground">
        <div className="container max-w-2xl mx-auto flex items-center justify-between">
          <nav aria-label="Footer Links">
            <p>
              Built by{" "}
              <a
                href="https://x.com/feldbarcelospro"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium underline underline-offset-4 hover:text-primary transition-colors"
                aria-label="Visit shadcn/ui website"
              >
                @felipebarcelospro
              </a>
            </p>
          </nav>
        </div>
      </footer>
    </div>
  )
}

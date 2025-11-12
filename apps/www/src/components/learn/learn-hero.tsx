import { BookOpen, Code, Zap, Sparkles, ArrowRight } from 'lucide-react'
import { Button } from '../ui/button'

export function LearnHero() {
  return (
    <div className="mb-16">
      {/* Main Card */}
      <div className="rounded-lg rounded-b-none border border-border bg-linear-to-br from-primary/5 via-background to-background p-6">
        <div className="grid gap-8 md:grid-cols-2 md:items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-md border bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
              <Sparkles className="h-4 w-4" />
              Free Course
            </div>
            
            <div className="space-y-3">
              <h1 className="text-xl font-mono tracking-tight">
                Build a SaaS with Igniter.js
              </h1>
              <p className="text-md text-muted-foreground">
                Go from beginner to expert by building a fully functional link shortening SaaS with authentication, analytics, AI features, and subscriptions.
              </p>

              <Button>
                <ArrowRight className="h-4 w-4" />
                Start Learning
              </Button>
            </div>

            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2 text-sm">
                <BookOpen className="h-4 w-4 text-primary" />
                <span>12 Chapters</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Code className="h-4 w-4 text-primary" />
                <span>Hands-on Project</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Zap className="h-4 w-4 text-primary" />
                <span>Production Ready</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="grid md:grid-cols-3 border-x border-b rounded-b-lg overflow-hidden">
        <div className="bg-card p-6">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg border">
            <BookOpen className="h-5 w-5 text-primary" />
          </div>
          <h3 className="mb-2 font-mono text-sm">Step-by-Step Learning</h3>
          <p className="text-sm text-muted-foreground">
            Each chapter builds on the previous one, guiding you through real-world.
          </p>
        </div>

        <div className="bg-card p-6">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg border">
            <Code className="h-5 w-5 text-primary" />
          </div>
          <h3 className="mb-2 font-mono text-sm">Full-Stack TypeScript</h3>
          <p className="text-sm text-muted-foreground">
            End-to-end type safety from database to UI with Prisma, Igniter.js, and Next.js.
          </p>
        </div>

        <div className="bg-card p-6">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg border">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <h3 className="mb-2 font-mono text-sm">Production Ready</h3>
          <p className="text-sm text-muted-foreground">
            Create a deployable SaaS with authentication, payments, and analytics.
          </p>
        </div>
      </div>
    </div>
  )
}

import Link from "next/link";
import { ArrowLeft, Home, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-[calc(100vh-200px)] flex-col items-center justify-center px-4 py-16">
      <div className="mx-auto max-w-2xl text-center">
        {/* 404 Number */}
        <div className="mb-8">
          <h1 className="text-[10rem] font-bold leading-none tracking-tighter text-primary/10 dark:text-primary/20 sm:text-[12rem]">
            404
          </h1>
        </div>

        {/* Message */}
        <div className="space-y-4 mb-12">
          <h2 className="text-2xl font-mono tracking-tight text-foreground">
            Page Not Found
          </h2>
          <p className="text-md text-muted-foreground max-w-md mx-auto">
            Sorry, we couldn't find the page you're looking for. It might have
            been moved or deleted.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button variant="default" asChild>
            <Link href="/">
              <Home className="h-4 w-4" />
              Back to Home
            </Link>
          </Button>

          <Button variant="outline" asChild>
            <Link
              href="/docs"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-background px-6 py-3 text-sm font-medium text-foreground shadow-sm transition-all hover:bg-accent hover:text-accent-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <Search className="h-4 w-4" />
              Browse Documentation
            </Link>
          </Button>
        </div>

        {/* Helpful Links */}
        <div className="mt-16 pt-8 border-t border-border/50">
          <p className="text-sm text-muted-foreground mb-4">
            Looking for something specific?
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
            <Link
              href="/docs/quick-start"
              className="text-primary hover:text-primary/80 transition-colors underline-offset-4 hover:underline"
            >
              Quick Start Guide
            </Link>
            <span className="text-muted-foreground">•</span>
            <Link
              href="/templates"
              className="text-primary hover:text-primary/80 transition-colors underline-offset-4 hover:underline"
            >
              Templates
            </Link>
            <span className="text-muted-foreground">•</span>
            <Link
              href="/blog"
              className="text-primary hover:text-primary/80 transition-colors underline-offset-4 hover:underline"
            >
              Blog
            </Link>
            <span className="text-muted-foreground">•</span>
            <Link
              href="/showcase"
              className="text-primary hover:text-primary/80 transition-colors underline-offset-4 hover:underline"
            >
              Showcase
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

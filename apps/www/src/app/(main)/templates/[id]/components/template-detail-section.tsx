import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ArrowLeftIcon, ExternalLink, Github, Rocket } from "lucide-react";
import Link from "next/link";
import { Template } from "../../data/templates";
import { TemplateReadme } from "./template-readme";
import { TemplateCreator } from "./template-creator";
import { RelatedTemplates } from "./related-templates";
import { Suspense } from "react";

interface TemplateDetailSectionProps {
  template: Template;
}

export function TemplateDetailSection({ template }: TemplateDetailSectionProps) {
  return (
    <div className="space-y-12">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 border-x border-border">
        {/* Left Column - Template Info */}
        <div className="lg:col-span-1 space-y-6 border-r border-border bg-secondary/20 py-10">
          {/* Template Header */}
          <div className="space-y-4 px-10">
            <Button variant="link" className="!px-0" asChild>
              <Link href="/templates" rel="noopener noreferrer" className="flex items-center">
                <ArrowLeftIcon className="mr-2 h-4 w-4" />
                Back to templates
              </Link>
            </Button>

            <div className="aspect-video rounded-lg bg-muted overflow-hidden">
              <img
                src={template.image}
                alt={template.title}
                className="w-full h-full object-cover"
              />
            </div>

            <div className="space-y-2">
              <h1 className="text-lg font-bold">{template.title}</h1>
              <p className="text-muted-foreground">{template.description}</p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="space-y-3 px-10">
            {template.repositoryUrl && (
              <Button variant="outline" asChild className="w-full bg-background">
                <Link href={template.repositoryUrl} target="_blank" rel="noopener noreferrer" className="w-full flex items-center justify-between">
                  View Repository
                  <Github className="mr-2 h-4 w-4" />
                </Link>
              </Button>
            )}

            <Button variant="outline" asChild className="w-full bg-background">
              <Link href={template.demoUrl} target="_blank" rel="noopener noreferrer" className="w-full flex items-center justify-between">
                View Demo
                <ExternalLink className="mr-2 h-4 w-4" />
              </Link>
            </Button>
          </div>

          {/* Template Details */}
          <div className="p-10 space-y-5 border-y border-border">
              <div>
                <h4 className="font-medium mb-2">Framework</h4>
                <Badge variant="secondary">{template.framework}</Badge>
              </div>

              <Separator />

              <div>
                <h4 className="font-medium mb-2">Use Case</h4>
                <Badge variant="outline">{template.useCase}</Badge>
              </div>

              <Separator />

              <div>
                <h4 className="font-medium mb-2">CSS Framework</h4>
                <Badge variant="outline">{template.css}</Badge>
              </div>

              {template.database && (
                <>
                  <Separator />
                  <div>
                    <h4 className="font-medium mb-2">Database</h4>
                    <Badge variant="outline">{template.database}</Badge>
                  </div>
                </>
              )}

              <Separator />

              <div>
                <h4 className="font-medium mb-2">Tags</h4>
                <div className="flex flex-wrap gap-2">
                  {template.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
          </div>

          {/* Creator Info */}
          <div className="px-10">
            <h3 className="text-lg font-semibold mb-4">Created by</h3>
            <Suspense fallback={<div className="h-32 bg-muted animate-pulse rounded-lg" />}>
              <TemplateCreator creator={template.creator} />
            </Suspense>
          </div>
        </div>

        {/* Right Column - README Content */}
        <div className="lg:col-span-2 py-6 bg-seconda">
          <TemplateReadme templateId={template.id} />
        </div>
      </div>

      {/* Related Templates Section */}
      <div className="mt-16">
        <RelatedTemplates currentTemplate={template} />
      </div>
    </div>
  );
}
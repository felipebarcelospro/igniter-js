import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ArrowLeftIcon, ExternalLink, Github } from "lucide-react";
import Link from "next/link";
import { SerializableTemplate } from "../../(lib)/template-utils";
import { ProjectBuilder } from "./project-builder";
import { getMDXComponents } from '@/mdx-components';
import { createRelativeLink } from 'fumadocs-ui/mdx';
import { source } from '../../source';
import type { InferPageType } from 'fumadocs-core/source';

interface TemplateDetailSectionProps {
  template: SerializableTemplate;
  content: InferPageType<typeof source>['data']['body'];
}

export function TemplateDetailSection({ template, content: MDXContent }: TemplateDetailSectionProps) {
  const imageUrl = `/templates/${template.id}.jpeg`;
  
  // Get the page for relative links
  const page = source.getPage(template.id.split('/'));
  const MDX = MDXContent;

  return (
    <div className="space-y-12">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 border-x border-border">
        {/* Left Column - Template Info */}
        <div className="lg:col-span-1 border-r border-border bg-secondary">
          <div className="lg:sticky lg:top-20 lg:self-start space-y-6">
            {/* Template Header */}
            <div className="space-y-4 px-10">
              <Button variant="link" className="!px-0" asChild>
                <Link href="/templates" rel="noopener noreferrer" className="flex items-center">
                  <ArrowLeftIcon className="mr-2 h-4 w-4" />
                  Back to templates
                </Link>
              </Button>

              <div className="aspect-video rounded-md border border-border overflow-hidden mb-4">
                <img
                  src={imageUrl}
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
              <ProjectBuilder template={template} />

              {template.repository && (
                <Button variant="outline" asChild className="w-full bg-background justify-start">
                  <Link href={template.repository} target="_blank" rel="noopener noreferrer" className="w-full flex items-center gap-2">
                    <Github className="h-4 w-4" />
                    View Repository
                  </Link>
                </Button>
              )}

              <Button variant="outline" asChild className="w-full bg-background justify-start mb-4">
                <Link href={template.demo} target="_blank" rel="noopener noreferrer" className="w-full flex items-center gap-2">
                  <ExternalLink className="h-4 w-4" />
                  View Demo
                </Link>
              </Button>
            </div>

            {/* Template Details */}
            <div className="p-10 space-y-5 border-y border-border">
                <div>
                  <h4 className="font-medium mb-2">Framework</h4>
                  <Badge variant="outline" className="border p-3 rounded-md">{template.framework}</Badge>
                </div>

                <Separator />

                <div>
                  <h4 className="font-medium mb-2">Use Case</h4>
                  <Badge variant="outline" className="border p-3 rounded-md">{template.useCases[0] || 'Full-Stack'}</Badge>
                </div>

                <Separator />

                <div>
                  <h4 className="font-medium mb-2">Stack</h4>
                  <div className="flex flex-wrap gap-2">
                    {template.stack.map((tech) => (
                      <Badge key={tech} variant="outline" className="text-xs border p-3 rounded-md">
                        {tech}
                      </Badge>
                    ))}
                  </div>
                </div>
            </div>
          </div>
        </div>

        {/* Right Column - Template Content */}
        <div className="lg:col-span-2 py-8 px-4 lg:px-10">
          <div className="prose prose-neutral dark:prose-invert max-w-none">
            {page && (
              <MDX
                components={getMDXComponents({
                  a: createRelativeLink(source, page),
                })}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

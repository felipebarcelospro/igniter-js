import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, Github, Rocket } from "lucide-react";
import { SerializableTemplate, toSerializableTemplates } from "../../(lib)/template-utils";
import { source } from "../../source";

interface RelatedTemplatesProps {
  currentTemplateId: string;
  maxResults?: number;
}

function getRelatedTemplates(currentTemplateId: string, allTemplates: SerializableTemplate[], maxResults: number = 3): SerializableTemplate[] {
  const currentTemplate = allTemplates.find(t => t.id === currentTemplateId);
  if (!currentTemplate) return [];

  // Calculate similarity score for each template
  const templatesWithScore = allTemplates
    .filter(template => template.id !== currentTemplateId)
    .map(template => {
      let score = 0;

      // Same framework gets highest score
      if (template.framework === currentTemplate.framework) {
        score += 10;
      }

      // Same use case gets high score
      if (template.useCases.some(useCase => currentTemplate.useCases.includes(useCase))) {
        score += 8;
      }

      // Shared stack items get points
      const sharedStack = template.stack.filter(tech => currentTemplate.stack.includes(tech));
      score += sharedStack.length * 2;

      return { template, score };
    })
    .filter(item => item.score > 0) // Only include templates with some similarity
    .sort((a, b) => b.score - a.score) // Sort by score descending
    .slice(0, maxResults)
    .map(item => item.template);

  return templatesWithScore;
}

export function RelatedTemplates({ currentTemplateId, maxResults = 3 }: RelatedTemplatesProps) {
  const allPages = source.getPages();
  const allTemplates = toSerializableTemplates(allPages);
  const relatedTemplates = getRelatedTemplates(currentTemplateId, allTemplates, maxResults);

  if (relatedTemplates.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight mb-2">Related Templates</h2>
        <p className="text-muted-foreground">
          Discover other templates that might interest you based on similar technologies and use cases.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {relatedTemplates.map((template) => {
          return (
            <Card key={template.id} className="group hover:shadow-lg transition-all duration-200">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg leading-tight group-hover:text-primary transition-colors">
                      {template.title}
                    </CardTitle>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Badge variant="outline" className="text-xs">
                        {template.framework}
                      </Badge>
                      <span>•</span>
                      <span>{template.useCases[0] || 'Full-Stack'}</span>
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <CardDescription className="line-clamp-2">
                  {template.description}
                </CardDescription>

                {/* Tags */}
                <div className="flex flex-wrap gap-1">
                  {template.stack.slice(0, 3).map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                  {template.stack.length > 3 && (
                    <Badge variant="secondary" className="text-xs">
                      +{template.stack.length - 3}
                    </Badge>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2">
                  <Button asChild size="sm" className="flex-1">
                    <Link href={`/templates/${template.id}`}>
                      View Details
                    </Link>
                  </Button>

                  {template.repository && (
                    <Button asChild variant="outline" size="sm">
                      <a
                        href={template.repository}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1"
                      >
                        <Github className="h-3 w-3" />
                      </a>
                    </Button>
                  )}

                  <Button asChild variant="outline" size="sm">
                    <a
                      href={template.demo}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1"
                    >
                      <Rocket className="h-3 w-3" />
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
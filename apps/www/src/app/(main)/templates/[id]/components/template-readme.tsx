import { Suspense } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useMDXComponents } from "../../../../../../mdx-components";
import { Skeleton } from '@/components/ui/skeleton';

interface TemplateReadmeProps {
  templateId: string;
}

// Cache the README content for 1 hour
async function getReadmeContent(templateId: string): Promise<string> {
  const githubUrl = `https://raw.githubusercontent.com/felipebarcelospro/igniter-js/main/apps/${templateId}/README.md`;
  
  try {
    const response = await fetch(githubUrl, {
      next: { revalidate: 3600 }, // Cache for 1 hour
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch README: ${response.status}`);
    }
    
    return await response.text();
  } catch (error) {
    console.error(`Error fetching README for ${templateId}:`, error);
    return `# ${templateId}\n\nREADME content could not be loaded. Please visit the [repository](https://github.com/felipebarcelospro/igniter-js/tree/main/apps/${templateId}) for more information.`;
  }
}

function ReadmeContent({ templateId }: { templateId: string }) {
  return (
    <Suspense fallback={<ReadmeSkeleton />}>
      <ReadmeRenderer templateId={templateId} />
    </Suspense>
  );
}

async function ReadmeRenderer({ templateId }: { templateId: string }) {
  const content = await getReadmeContent(templateId);
  const mdxComponents = useMDXComponents({});

  if (!content) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">README not found for this template.</p>
      </div>
    );
  }

  return (
    <div className="max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        // @ts-expect-error - Expected
        components={mdxComponents}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

function ReadmeSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
      <div className="space-y-2">
        <Skeleton className="h-6 w-1/2" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-6 w-1/3" />
        <Skeleton className="h-32 w-full" />
      </div>
    </div>
  );
}

export function TemplateReadme({ templateId }: TemplateReadmeProps) {
  return <ReadmeContent templateId={templateId} />;
}
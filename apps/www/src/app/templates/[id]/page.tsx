import { Metadata } from "next";
import { notFound } from "next/navigation";
import { source } from "../source";
import { toSerializableTemplate } from "../(lib)/template-utils";
import { TemplateDetailSection } from "./(components)/template-detail-section";
import { generateMetadataWithOG } from '@/lib/metadata';
import { config } from '@/configs/application';

interface TemplatePageProps {
  params: Promise<{
    id: string;
  }>;
}

export async function generateStaticParams() {
  const pages = source.getPages();
  return pages.map((page) => ({
    id: page.slugs.join('/'),
  }));
}

export async function generateMetadata(props: TemplatePageProps): Promise<Metadata> {
  const params = await props.params;
  const page = source.getPage(params.id.split('/'));

  if (!page) {
    return {
      title: "Template Not Found",
    };
  }

  return generateMetadataWithOG({
    title: `${page.data.title} - ${config.projectName} Templates`,
    description: page.data.description || `A ${page.data.framework} template built with ${config.projectName}`,
    path: `/templates/${params.id}`,
    ogImagePath: `/templates/${params.id}.jpeg`,
  });
}

export default async function TemplatePage(props: TemplatePageProps) {
  const params = await props.params;
  const page = source.getPage(params.id.split('/'));

  if (!page) {
    notFound();
  }

  const template = toSerializableTemplate(page);
  const MDXContent = page.data.body;

  return (
    <div className="container mx-auto max-w-screen-2xl">
      <TemplateDetailSection template={template} content={MDXContent} />
    </div>
  );
}

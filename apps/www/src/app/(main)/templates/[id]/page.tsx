import { Metadata } from "next";
import { notFound } from "next/navigation";
import { templates } from "../data/templates";
import { TemplateDetailSection } from "./components/template-detail-section";

interface TemplatePageProps {
  params: Promise<{
    id: string;
  }>;
}

export async function generateStaticParams() {
  return templates.map((template) => ({
    id: template.id,
  }));
}

export async function generateMetadata(props: TemplatePageProps): Promise<Metadata> {
  const params = await props.params;
  const template = templates.find((t) => t.id === params.id);

  if (!template) {
    return {
      title: "Template Not Found",
    };
  }

  return {
    title: `${template.title} - Igniter.js Templates`,
    description: template.description,
    openGraph: {
      title: `${template.title} - Igniter.js Templates`,
      description: template.description,
      images: [template.image],
    },
  };
}

export default async function TemplatePage(props: TemplatePageProps) {
  const params = await props.params;
  const template = templates.find((t) => t.id === params.id);

  if (!template) {
    notFound();
  }

  return (
    <div className="container mx-auto max-w-screen-2xl">
      <TemplateDetailSection template={template} />
    </div>
  );
}
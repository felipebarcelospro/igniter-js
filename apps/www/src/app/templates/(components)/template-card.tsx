"use client";

import { motion } from "framer-motion";
import { ExternalLink, Github, Zap } from "lucide-react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { SerializableTemplate } from "../(lib)/template-utils";

interface TemplateCardProps {
  template: SerializableTemplate;
}

export function TemplateCard({ template }: TemplateCardProps) {
  const imageUrl = template.cover;

  return (
    <Link
      href={
        template.repository ? `/templates/${template.id}` : template.demo
      }
      target={template.repository ? "_self" : "_blank"}
    >
      <Card className="h-full bg-secondary shadow-none flex flex-col group hover:bg-secondary transition-all duration-300 pt-0 border-border/50 hover:border-border cursor-pointer">
        {/* Template Image */}
        <div className="relative overflow-hidden rounded-t-lg border-b">
          <div className="aspect-video flex items-center justify-center">
            <div className="w-16 h-16 border flex items-center justify-center">
              <Zap className="w-8 h-8 text-primary" />
            </div>
          </div>

          <img
            src={imageUrl}
            alt={template.title}
            className="absolute top-0 left-0 w-full h-full object-cover rounded-t-lg"
          />
        </div>

        <CardHeader className="pb-10">
          <div className="space-y-2">
            <h3 className="leading-tight group-hover:text-primary transition-colors">
              {template.title}
            </h3>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {template.description}
            </p>
          </div>
        </CardHeader>

        <CardContent className="flex-1 pb-3">
          <div className="space-y-3">
            {/* Tech Stack */}
            <div className="flex flex-wrap gap-1">
              {template.stack.slice(0, 4).map((tech) => (
                <Badge key={tech} variant="outline" className="text-xs">
                  {tech}
                </Badge>
              ))}
              {template.stack.length > 4 && (
                <Badge variant="outline" className="text-xs">
                  +{template.stack.length - 4}
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

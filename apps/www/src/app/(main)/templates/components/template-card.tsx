"use client";

import { motion } from "framer-motion";
import { ExternalLink, Github, Zap } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Template } from "../data/templates";

interface TemplateCardProps {
  template: Template;
}

export function TemplateCard({ template }: TemplateCardProps) {
  return (
    <Link href={template.repositoryUrl ? `/templates/${template.id}` : template.demoUrl} target={template.repositoryUrl ? "_self" : "_blank"}>
      <Card className="h-full shadow-none bg-secondary/50 flex flex-col group hover:bg-secondary transition-all duration-300 border-border/50 hover:border-border cursor-pointer">
      {/* Template Image */}
      <div className="relative overflow-hidden rounded-t-lg">
        <div className="aspect-video bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
          <div className="w-16 h-16 rounded-lg bg-primary/20 flex items-center justify-center">
            <Zap className="w-8 h-8 text-primary" />
          </div>
        </div>
        
        <img
          src={template.image}
          alt={template.title}
          className="absolute top-0 left-0 w-full h-full object-cover rounded-t-lg"
        />

        {/* Framework Badge */}
        <div className="absolute top-3 left-3">
          <Badge variant="secondary" className="bg-background/90 backdrop-blur-sm">
            {template.framework}
          </Badge>
        </div>
        
        {/* Use Case Badge */}
        <div className="absolute top-3 right-3">
          <Badge variant="outline" className="bg-background/90 backdrop-blur-sm">
            {template.useCase}
          </Badge>
        </div>
      </div>

      <CardHeader className="pb-10">
        <div className="space-y-2">
          <h3 className="font-semibold text-lg leading-tight group-hover:text-primary transition-colors">
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
            <Badge variant="outline" className="text-xs">
              {template.css}
            </Badge>
            {template.database && (
              <Badge variant="outline" className="text-xs">
                {template.database}
              </Badge>
            )}
          </div>
          
          {/* Tags */}
          <div className="flex flex-wrap gap-1">
            {template.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
            {template.tags.length > 3 && (
              <Badge variant="secondary" className="text-xs">
                +{template.tags.length - 3}
              </Badge>
            )}
          </div>
        </div>
      </CardContent>

      <CardFooter className="pt-0 gap-2">
        <div className="flex w-full gap-2">
          <a href={template.creator.username} target="_blank" rel="noopener noreferrer">
            {template.creator.name}
          </a>
        </div>
      </CardFooter>
      </Card>
    </Link>
  );
}
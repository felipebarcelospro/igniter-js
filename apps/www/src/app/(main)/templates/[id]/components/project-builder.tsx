"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, Check, Rocket, ArrowLeft, Twitter, Github, MessageCircle, Share, Sparkles, FileText, Terminal, Linkedin, Lightbulb } from "lucide-react";
import { Template } from "../../data/templates";
import { cn } from "@/lib/utils";

interface ProjectBuilderProps {
  template: Template;
}

interface ProjectConfig {
  projectName: string;
  packageManager: "npm" | "yarn" | "pnpm" | "bun";
  features: {
    store: boolean;
    jobs: boolean;
    mcp: boolean;
    logging: boolean;
    telemetry: boolean;
  };
  database: "none" | "postgresql" | "mysql" | "sqlite";
  orm: "prisma" | "drizzle";
}

export function ProjectBuilder({ template }: ProjectBuilderProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [currentStep, setCurrentStep] = useState<'configure' | 'share'>('configure');
  const [config, setConfig] = useState<ProjectConfig>({
    projectName: "my-project",
    packageManager: "npm",
    features: {
      store: false,
      jobs: false,
      mcp: false,
      logging: true,
      telemetry: true,
    },
    database: "none",
    orm: "prisma",
  });

  const isStarter = template.id.startsWith("starter-");

  const generateCommand = () => {
    let command = `npx @igniter-js/cli init ${config.projectName}`;
    command += ` --template ${template.id}`;

    if (config.packageManager !== "npm") {
      command += ` --pm ${config.packageManager}`;
    }

    // Add features if any are enabled (only for starters)
    if (isStarter) {
      const enabledFeatures = Object.entries(config.features)
        .filter(([_, enabled]) => enabled)
        .map(([key, _]) => key);

      if (enabledFeatures.length > 0) {
        command += ` --features ${enabledFeatures.join(',')}`;
      }

      // Add database if not none
      if (config.database !== "none") {
        command += ` --database ${config.database}`;
      }

      // Add ORM if database is selected
      if (config.database !== "none") {
        command += ` --orm ${config.orm}`;
      }
    }

    // Setup options are always enabled (git, install, docker, force)
    // No need to add flags as these are the defaults

    return command;
  };

  const copyCommand = async () => {
    const command = generateCommand();
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy command:', err);
    }
  };

  const getSelectedTechStack = () => {
    const stack = [];

    // Template/Framework
    const frameworks = {
      'starter-nextjs': { name: 'Next.js', logo: 'https://svgl.app/library/nextjs.svg' },
      'starter-express-rest-api': { name: 'Express', logo: 'https://svgl.app/library/express.svg' },
      'starter-deno-rest-api': { name: 'Deno', logo: 'https://svgl.app/library/deno.svg' },
      'starter-bun-rest-api': { name: 'Bun', logo: 'https://svgl.app/library/bun.svg' },
      'starter-bun-react-app': { name: 'Bun + React', logo: 'https://svgl.app/library/bun.svg' },
      'starter-tanstack-start': { name: 'TanStack Start', logo: 'https://svgl.app/library/tanstack.svg' }
    };

    // Package Manager
    const packageManagers = {
      npm: { name: 'npm', logo: 'https://svgl.app/library/npm.svg' },
      yarn: { name: 'Yarn', logo: 'https://svgl.app/library/yarn.svg' },
      pnpm: { name: 'pnpm', logo: 'https://svgl.app/library/pnpm.svg' },
      bun: { name: 'Bun', logo: 'https://svgl.app/library/bun.svg' }
    };
    stack.push(packageManagers[config.packageManager]);

    // Database
    if (config.database !== 'none') {
      const databases = {
        postgresql: { name: 'PostgreSQL', logo: 'https://svgl.app/library/postgresql.svg' },
        mysql: { name: 'MySQL', logo: 'https://svgl.app/library/mysql.svg' },
        sqlite: { name: 'SQLite', logo: 'https://svgl.app/library/sqlite.svg' }
      };
      stack.push(databases[config.database as keyof typeof databases]);

      // ORM
      const orms = {
        prisma: { name: 'Prisma', logo: 'https://svgl.app/library/prisma.svg' },
        drizzle: { name: 'Drizzle', logo: 'https://svgl.app/library/drizzle-orm_light.svg' }
      };
      stack.push(orms[config.orm]);
    }

    // Features
    if (config.features.store) {
      stack.push({ name: 'Redis', logo: 'https://svgl.app/library/redis.svg' });
    }
    if (config.features.jobs) {
      stack.push({ name: 'BullMQ', logo: 'https://svgl.app/library/redis.svg' });
    }

    return stack;
  };

  const generateSocialPost = () => {
    const stack = getSelectedTechStack();
    const stackNames = stack.map(tech => tech.name).join(', ');

    return `🚀 Starting a new project: ${config.projectName}

Built with @igniterjs and an amazing stack: ${stackNames}

Ready to build in public and share the journey! Who else is shipping something cool this week?

#BuildInPublic #TypeScript #WebDev #OpenSource`;
  };

  const updateFeature = (feature: keyof ProjectConfig["features"], checked: boolean) => {
    setConfig(prev => ({
      ...prev,
      features: {
        ...prev.features,
        [feature]: checked
      }
    }));
  };

  const resetConfig = () => {
    setConfig({
      projectName: "my-project",
      packageManager: "npm",
      features: {
        store: false,
        jobs: false,
        mcp: false,
        logging: true,
        telemetry: true,
      },
      database: "none",
      orm: "prisma",
    });
    setCopied(false);
    setCurrentStep('configure');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
          <div className="w-full flex items-center justify-between">
            Create Project
            <Rocket className="mr-2 h-4 w-4" />
          </div>
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-4xl w-[80vw] h-[75vh] flex flex-col overflow-hidden gap-0 p-0 bg-background">
        <DialogHeader className="p-6 border-b mb-6">
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {currentStep === 'share' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentStep('configure')}
                  className="h-8 w-8 p-0 hover:bg-primary/10"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              )}
              <div className="flex items-center gap-3">
                <div>
                  <div className="font-bold text-sm">
                    {currentStep === 'configure' ? `Create ${template.title}` : 'Ready to Build!'}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {currentStep === 'configure'
                      ? 'Configure your project settings'
                      : 'Your project command is ready'
                    }
                  </div>
                </div>
              </div>
            </div>
            <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
              Step {currentStep === 'configure' ? '1' : '2'} of 2
            </Badge>
          </DialogTitle>
        </DialogHeader>

        {currentStep === 'configure' && (
          <div className="flex-1 overflow-y-auto">
            <div className="relative">
              {/* Timeline Line */}
              <div className="absolute left-6 top-0 bottom-0 w-px bg-border" />

              <div className="space-y-12 pb-32">
              {/* Project Name Section */}
              <section className="relative">
                <div className="absolute left-4 w-4 h-4 bg-background border-2 border-border rounded-full" />

                <div className="ml-12 space-y-6">
                  <div>
                    <h3 className="text-sm font-semibold">Project Details</h3>
                    <span className="text-sm text-muted-foreground">Choose a name for your project directory</span>
                  </div>

                  <Input
                    value={config.projectName}
                    onChange={(e) => setConfig(prev => ({ ...prev, projectName: e.target.value }))}
                    placeholder="my-awesome-project"
                    className="text-base"
                  />
                </div>
              </section>

              {/* Package Manager Section */}
              <section className="relative">
                <div className="absolute left-4 w-4 h-4 bg-background border-2 border-border rounded-full" />

                <div className="ml-12 space-y-6">
                  <div>
                    <h3 className="text-sm">Package Manager</h3>
                  </div>

                  <div className="rounded-md border border-border p-4">
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        {
                          value: "npm",
                          label: "npm",
                          description: "Node's default package manager",
                          logo: "https://svgl.app/library/npm.svg"
                        },
                        {
                          value: "yarn",
                          label: "Yarn",
                          description: "Fast, reliable, and secure dependency management",
                          logo: "https://svgl.app/library/yarn.svg"
                        },
                        {
                          value: "pnpm",
                          label: "pnpm",
                          description: "Efficient and space-saving package manager",
                          logo: "https://svgl.app/library/pnpm.svg"
                        },
                        {
                          value: "bun",
                          label: "Bun",
                          description: "Ultra-fast JavaScript runtime and package manager",
                          logo: "https://svgl.app/library/bun.svg"
                        }
                      ].map((pm) => {
                        const isSelected = config.packageManager === pm.value;
                        const hasSelection = config.packageManager !== "npm" || isSelected;

                        return (
                          <motion.div
                            key={pm.value}
                            className={cn(
                              "relative cursor-pointer transition-all duration-300",
                              !isSelected && hasSelection && "opacity-80"
                            )}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setConfig(prev => ({ ...prev, packageManager: pm.value as ProjectConfig["packageManager"] }))}
                          >
                            <Card className={cn(
                              "h-full shadow-none border-2 transition-all duration-300 bg-card",
                              isSelected && "bg-primary/5 border-primary/15"
                            )}>
                              <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                  <span className="flex items-center justify-center w-10 h-10 border border-border/40 rounded-md text-primary">
                                    <img
                                      src={pm.logo}
                                      alt={pm.label}
                                      className="w-6 h-6 flex-shrink-0"
                                    />
                                  </span>
                                  <div className="flex-1 min-w-0">
                                    <div className="font-medium">{pm.label}</div>
                                    <div className="text-xs text-muted-foreground line-clamp-1">{pm.description}</div>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </section>

              {/* Features Section - Only for starters */}
              {isStarter && (
                <section className="relative">
                  <div className="absolute left-4 w-4 h-4 bg-background border-2 border-border rounded-full" />

                  <div className="ml-12 space-y-6">
                    <div>
                      <h3 className="text-sm">Igniter.js Features</h3>
                    </div>

                    <div className="rounded-md border border-border p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {Object.entries({
                          store: {
                            label: "Store (Redis)",
                            description: "Caching, sessions, and pub/sub messaging",
                            logo: "https://svgl.app/library/redis.svg"
                          },
                          jobs: {
                            label: "Jobs (BullMQ)",
                            description: "Background task processing and job queues",
                            logo: "https://svgl.app/library/redis.svg"
                          },
                          mcp: {
                            label: "MCP Server",
                            description: "AI assistant integration with Model Context Protocol",
                            logo: null
                          },
                          logging: {
                            label: "Enhanced Logging",
                            description: "Advanced console logging with structured output",
                            logo: null
                          },
                          telemetry: {
                            label: "Telemetry",
                            description: "Telemetry for tracking requests and errors",
                            logo: null
                          }
                        }).map(([key, { label, description, logo }]) => {
                          const isSelected = config.features[key as keyof ProjectConfig["features"]];
                          const hasAnySelection = Object.values(config.features).some(Boolean);

                          return (
                            <motion.div
                              key={key}
                              className={cn(
                                "relative cursor-pointer transition-all duration-300",
                                !isSelected && hasAnySelection && "opacity-80"
                              )}
                              whileHover={{ scale: 1.01 }}
                              whileTap={{ scale: 0.99 }}
                              onClick={() => updateFeature(key as keyof ProjectConfig["features"], !isSelected)}
                            >
                              <Card className={cn(
                                "h-full shadow-none border-2 transition-all duration-300 bg-card",
                                isSelected && "bg-primary/5 border-primary/15"
                              )}>
                                <CardContent className="p-4">
                                  <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-2">
                                      <Checkbox
                                        checked={isSelected}
                                        onCheckedChange={(checked) => updateFeature(key as keyof ProjectConfig["features"], checked as boolean)}
                                        onClick={(e) => e.stopPropagation()}
                                        className="opacity-0"
                                      />
                                      {logo ? (
                                        <span className="flex items-center justify-center w-8 h-8 border border-border/40 rounded-md text-primary">
                                          <img
                                            src={logo}
                                            alt={label}
                                            className="w-5 h-5 flex-shrink-0"
                                          />
                                        </span>
                                      ) : (
                                        <span className="flex items-center justify-center w-8 h-8 border border-border/40 rounded-md text-primary">
                                          <div className="w-2 h-2 bg-primary rounded-full" />
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="font-medium">{label}</div>
                                      <div className="text-xs text-muted-foreground line-clamp-1">{description}</div>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {/* Database Section - Only for starters */}
              {isStarter && (
                <section className="relative">
                  <div className="absolute left-4 w-4 h-4 bg-background border-2 border-border rounded-full" />

                  <div className="ml-12 space-y-6">
                    <div>
                      <h3 className="text-sm">Database Provider</h3>
                    </div>

                    <div className="rounded-md border border-border p-4">
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          {
                            value: "none",
                            label: "None",
                            description: "Start without database",
                            logo: null
                          },
                          {
                            value: "postgresql",
                            label: "PostgreSQL",
                            description: "Production-ready relational database",
                            logo: "https://svgl.app/library/postgresql.svg"
                          },
                          {
                            value: "mysql",
                            label: "MySQL",
                            description: "Wide compatibility relational database",
                            logo: "https://svgl.app/library/mysql.svg"
                          },
                          {
                            value: "sqlite",
                            label: "SQLite",
                            description: "Lightweight file-based database",
                            logo: "https://svgl.app/library/sqlite.svg"
                          }
                        ].map((db) => {
                          const isSelected = config.database === db.value;
                          const hasSelection = config.database !== "none" || isSelected;

                          return (
                            <motion.div
                              key={db.value}
                              className={cn(
                                "relative cursor-pointer transition-all duration-300",
                                !isSelected && hasSelection && "opacity-80"
                              )}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => setConfig(prev => ({ ...prev, database: db.value as ProjectConfig["database"] }))}
                            >
                              <Card className={cn(
                                "h-full shadow-none border-2 transition-all duration-300 bg-card",
                                isSelected && "bg-primary/5 border-primary/15"
                              )}>
                                <CardContent className="p-4">
                                  <div className="flex items-center gap-3">
                                    {db.logo ? (
                                      <span className="flex items-center justify-center w-10 h-10 border border-border/40 rounded-md text-primary">
                                        <img
                                          src={db.logo}
                                          alt={db.label}
                                          className="w-6 h-6 flex-shrink-0"
                                        />
                                      </span>
                                    ) : (
                                      <span className="flex items-center justify-center w-10 h-10 border border-border/40 rounded-md text-primary">
                                        <div className="w-3 h-3 bg-primary rounded-full" />
                                      </span>
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <div className="font-medium">{db.label}</div>
                                      <div className="text-xs text-muted-foreground line-clamp-1">{db.description}</div>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {/* ORM Section - Only for starters with database */}
              {isStarter && config.database !== "none" && (
                <section className="relative">
                  <div className="absolute left-4 w-4 h-4 bg-background border-2 border-border rounded-full" />

                  <div className="ml-12 space-y-6">
                    <div>
                      <h3 className="text-sm">ORM Provider</h3>
                    </div>

                    <div className="rounded-md border border-border p-4">
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          {
                            value: "prisma",
                            label: "Prisma",
                            description: "Next-generation ORM with type safety",
                            logo: "https://svgl.app/library/prisma.svg"
                          },
                          {
                            value: "drizzle",
                            label: "Drizzle ORM",
                            description: "TypeScript ORM that feels like writing SQL",
                            logo: "https://svgl.app/library/drizzle-orm_light.svg",
                            comingSoon: true
                          }
                        ].map((orm) => {
                          const isSelected = config.orm === orm.value;
                          const hasSelection = config.orm !== "prisma" || isSelected;

                          return (
                            <motion.div
                              key={orm.value}
                              className={cn(
                                "relative cursor-pointer transition-all duration-300",
                                !isSelected && hasSelection && "opacity-80",
                                orm.comingSoon && "opacity-50 cursor-not-allowed"
                              )}
                              whileHover={!orm.comingSoon ? { scale: 1.02 } : {}}
                              whileTap={!orm.comingSoon ? { scale: 0.98 } : {}}
                              onClick={() => !orm.comingSoon && setConfig(prev => ({ ...prev, orm: orm.value as ProjectConfig["orm"] }))}
                            >
                              <Card className={cn(
                                "h-full shadow-none border-2 transition-all duration-300 bg-card",
                                isSelected && "bg-primary/5 border-primary/15",
                                orm.comingSoon && "border-dashed"
                              )}>
                                <CardContent className="p-4">
                                  <div className="flex items-center gap-3">
                                    <span className="flex items-center justify-center w-10 h-10 border border-border/40 rounded-md text-primary">
                                      <img
                                        src={orm.logo}
                                        alt={orm.label}
                                        className="w-6 h-6 flex-shrink-0"
                                      />
                                    </span>
                                    <div className="flex-1 min-w-0">
                                      <div className="font-medium flex items-center gap-2">
                                        {orm.label}
                                        {orm.comingSoon && (
                                          <Badge variant="secondary" className="text-xs">
                                            Soon
                                          </Badge>
                                        )}
                                      </div>
                                      <div className="text-xs text-muted-foreground line-clamp-1">{orm.description}</div>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </section>
              )}
            </div>
          </div>
        </div>

        )}

        {/* Configuration Step */}
        {currentStep === 'configure' && (
          <motion.div
            className="relative bg-background border-t"
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {/* Timeline Connection */}
            <div className="absolute left-6 top-0 w-px h-6 bg-border" />
            <div className="absolute left-4 top-6 w-4 h-4 bg-primary border-2 border-background rounded-full" />

            <div className="ml-12 mr-6 mb-6 mt-6">
              <div className="space-y-4">
                {/* Tech Stack Icons */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-wrap">
                    {getSelectedTechStack().map((tech, index) => (
                      <motion.div
                        key={`${tech.name}-${index}`}
                        className="flex items-center gap-1 bg-secondary/50 rounded-full px-2 py-1 border"
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <img
                          src={tech.logo}
                          alt={tech.name}
                          className="w-4 h-4"
                        />
                        <span className="text-xs font-medium">{tech.name}</span>
                      </motion.div>
                    ))}
                  </div>

                  <Button
                    onClick={() => setCurrentStep('share')}
                    disabled={!config.projectName.trim()}
                    className="bg-primary hover:bg-primary/90 gap-2 rounded-full"
                  >
                    <Sparkles className="h-4 w-4" />
                    Generate
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Share Step */}
        {currentStep === 'share' && (
          <motion.div
            className="flex-1 flex flex-col h-full"
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            <div className="flex-1 p-6 overflow-y-auto">
              <div className="relative">
                {/* Timeline Line */}
                <div className="absolute left-6 top-0 bottom-0 w-px bg-border" />

                <div className="space-y-6">
                  {/* Step 1: Command Section */}
                  <section className="relative">
                    <div className="absolute left-4 w-4 h-4 bg-primary border-2 border-background rounded-full" />

                    <div className="ml-12 space-y-4">
                      <div className="flex items-center justify-between">
                        <Label className="text-base font-semibold">Run this command</Label>
                        <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                          <Sparkles className="w-3 h-3 mr-1" />
                          Ready!
                        </Badge>
                      </div>

                      <div className="relative group">
                        <pre className="bg-secondary/50 border rounded-lg p-4 overflow-x-auto">
                          <code className="text-sm font-mono text-foreground">
                            <span className="text-muted-foreground"># Run this command in your terminal</span>
                            {'\n'}{generateCommand()}
                          </code>
                        </pre>
                        <Button
                          onClick={copyCommand}
                          size="sm"
                          className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity"
                          variant={copied ? "default" : "secondary"}
                        >
                          {copied ? (
                            <>
                              <Check className="mr-1 h-3 w-3" />
                              Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="mr-1 h-3 w-3" />
                              Copy
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </section>

                  {/* Step 2: Share Journey */}
                  <section className="relative">
                    <div className="absolute left-4 w-4 h-4 bg-background border-2 border-border rounded-full" />

                    <div className="ml-12 space-y-4">
                      <div className="flex items-center justify-between">
                        <Label className="text-base font-semibold">Share your journey</Label>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => {
                              const text = encodeURIComponent(generateSocialPost());
                              window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank');
                            }}
                            size="sm"
                            variant="outline"
                            className="rounded-full w-fit"
                          >
                            <Twitter className="w-4 h-4" />
                          </Button>

                          <Button
                            onClick={() => {
                              const text = encodeURIComponent(generateSocialPost());
                              window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent('https://igniterjs.dev')}&summary=${text}`, '_blank');
                            }}
                            size="sm"
                            variant="outline"
                            className="rounded-full w-fit"
                          >
                            <Linkedin className="w-4 h-4" />
                          </Button>

                          <Button
                            onClick={() => {
                              const text = encodeURIComponent(generateSocialPost());
                              if (navigator.share) {
                                navigator.share({
                                  title: 'My new Igniter.js project',
                                  text: generateSocialPost(),
                                });
                              } else {
                                navigator.clipboard.writeText(generateSocialPost());
                              }
                            }}
                            size="sm"
                            variant="outline"
                            className="rounded-full w-fit"
                          >
                            <Share className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="bg-background border border-border rounded-xl p-4 space-y-4 max-w-md">
                        {/* Post Header */}
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                            <span className="text-sm font-semibold text-muted-foreground">You</span>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm text-foreground">Your Name</span>
                              <span className="text-muted-foreground text-sm">@yourusername · now</span>
                            </div>
                          </div>
                        </div>

                        {/* Post Content */}
                        <div className="text-sm leading-relaxed whitespace-pre-line text-foreground">
                          {generateSocialPost()}
                        </div>
                      </div>

                      <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50 rounded-lg p-3">
                        <div className="flex items-start gap-2">
                          <Lightbulb className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                          <p className="text-sm text-blue-800 dark:text-blue-200">
                            Building in public increases visibility, attracts contributors, and creates valuable connections in the developer community.
                          </p>
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* Step 3: Next Steps */}
                  <section className="relative">
                    <div className="absolute left-4 w-4 h-4 bg-background border-2 border-border rounded-full" />

                    <div className="ml-12 space-y-4">
                      <Label className="text-base font-semibold">Next Steps</Label>

                      <div className="flex flex-wrap gap-2">
                        <Button
                          onClick={() => {
                            window.open('https://github.com/felipebarcelospro/igniter-js', '_blank');
                          }}
                          size="sm"
                          variant="outline"
                          className="rounded-full w-fit"
                        >
                          <Github className="w-4 h-4 mr-2" />
                          Star on GitHub
                        </Button>

                        <Button
                          onClick={() => {
                            window.open('https://igniterjs.dev/docs', '_blank');
                          }}
                          size="sm"
                          variant="outline"
                          className="rounded-full w-fit"
                        >
                          <FileText className="w-4 h-4 mr-2" />
                          Read Docs
                        </Button>

                        <Button
                          onClick={() => {
                            window.open('https://igniterjs.dev/examples', '_blank');
                          }}
                          size="sm"
                          variant="outline"
                          className="rounded-full w-fit"
                        >
                          <Terminal className="w-4 h-4 mr-2" />
                          View Examples
                        </Button>

                        <Button
                          onClick={() => {
                            window.open('https://igniterjs.dev/changelog', '_blank');
                          }}
                          size="sm"
                          variant="outline"
                          className="rounded-full w-fit"
                        >
                          <Sparkles className="w-4 h-4 mr-2" />
                          Changelog
                        </Button>
                      </div>
                    </div>
                  </section>


                </div>
              </div>
            </div>
          </motion.div>
        )}
      </DialogContent>
    </Dialog>
  );
}

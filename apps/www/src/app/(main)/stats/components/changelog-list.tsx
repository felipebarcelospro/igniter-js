"use client";

import { Markdown } from "@/app/(shared)/components/markdown";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RepositoryRelease } from "@/lib/github";
import { formatDate } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

interface ChangelogListProps {
  releases: RepositoryRelease[];
}

export function ChangelogList({ releases }: ChangelogListProps) {
  const [openReleases, setOpenReleases] = useState<string[]>([]);

  const toggleRelease = (id: string) => {
    setOpenReleases((prev) =>
      prev.includes(id)
        ? prev.filter((releaseId) => releaseId !== id)
        : [...prev, id],
    );
  };

  return (
    <motion.div
      className="space-y-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {releases.map((release) => {
        const isOpen = openReleases.includes(release.id.toString());

        return (
          <motion.div
            key={release.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="overflow-hidden">
              <CardHeader
                className="cursor-pointer"
                onClick={() => toggleRelease(release.id.toString())}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between">
                  <CardTitle className="text-lg font-bold">
                    {release.title}
                  </CardTitle>
                  <div className="flex items-center space-x-4 mt-2 sm:mt-0">
                    <Badge variant="secondary">{release.version}</Badge>
                    <span className="text-sm text-muted-foreground">
                      {release.publishDate
                        ? formatDate(release.publishDate)
                        : ""}
                    </span>
                    <motion.div
                      initial={false}
                      animate={{ rotate: isOpen ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronDown className="h-5 w-5" />
                    </motion.div>
                  </div>
                </div>
              </CardHeader>
              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <CardContent>
                      <Markdown>{release.description}</Markdown>
                      <div className="flex flex-wrap items-center gap-4 mt-6">
                        <a
                          href={`https://github.com/felipebarcelospro/drift/releases/tag/${release.version}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline"
                        >
                          View on GitHub
                        </a>
                        <a
                          href={`https://github.com/felipebarcelospro/drift/archive/refs/tags/${release.version}.zip`}
                          className="text-sm text-primary hover:underline"
                        >
                          Download ZIP
                        </a>
                        <a
                          href={`https://github.com/felipebarcelospro/drift/archive/refs/tags/${release.version}.tar.gz`}
                          className="text-sm text-primary hover:underline"
                        >
                          Download TAR
                        </a>
                      </div>
                    </CardContent>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          </motion.div>
        );
      })}
    </motion.div>
  );
}

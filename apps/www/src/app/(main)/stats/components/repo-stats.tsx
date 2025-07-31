"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RepositoryInfo } from "@/lib/github";
import { formatDate } from "@/lib/utils";
import { motion } from "framer-motion";
import { AlertCircle, Clock, GitFork, Star } from "lucide-react";

interface RepoStatsProps {
  repoInfo: RepositoryInfo;
}

export function RepoStats({ repoInfo }: RepoStatsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card>
        <CardHeader className="space-y-0">
          <CardTitle className="text-lg font-semibold">
            Repository Stats
          </CardTitle>
          <CardDescription className="text-sm">
            Key metrics and information about the project repository
          </CardDescription>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-4">
          <StatItem
            icon={<Star className="w-5 h-5" />}
            label="Stars"
            value={repoInfo.starCount}
            index={0}
          />
          <StatItem
            icon={<GitFork className="w-5 h-5" />}
            label="Forks"
            value={repoInfo.forkCount}
            index={1}
          />
          <StatItem
            icon={<AlertCircle className="w-5 h-5" />}
            label="Open Issues"
            value={repoInfo.issueCount}
            index={2}
          />
          <StatItem
            icon={<Clock className="w-5 h-5" />}
            label="Last Update"
            value={formatDate(repoInfo.updatedAt)}
            index={3}
          />
        </CardContent>
      </Card>
    </motion.div>
  );
}

function StatItem({
  icon,
  label,
  value,
  index,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
      whileHover={{ scale: 1.02 }}
      className="flex items-center space-x-2 border border-border p-4 rounded-md"
    >
      <motion.span
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: index * 0.1 + 0.2 }}
        className="bg-primary/10 text-primary p-2 rounded-md"
      >
        {icon}
      </motion.span>
      <div>
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: index * 0.1 + 0.3 }}
          className="text-sm font-semibold"
        >
          {value}
        </motion.p>
      </div>
    </motion.div>
  );
}

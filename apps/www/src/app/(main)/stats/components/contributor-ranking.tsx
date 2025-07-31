"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { config } from "@/configs/application";
import { RepositoryContributor } from "@/lib/github";
import { motion } from "framer-motion";
import { GitCommit, Trophy, Users } from "lucide-react";
import Image from "next/image";

interface ContributorRankingProps {
  contributors: RepositoryContributor[];
}

export function ContributorRanking({ contributors }: ContributorRankingProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card>
        <CardHeader className="space-y-0">
          <CardTitle className="text-lg font-semibold">
            Top Contributors
          </CardTitle>
          <CardDescription className="text-sm">
            Most active project contributors
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {contributors.map((contributor, index) => (
            <ContributorItem
              key={contributor.username}
              rank={index + 1}
              contributor={contributor}
            />
          ))}
        </CardContent>
      </Card>
    </motion.div>
  );
}

function ContributorItem({
  rank,
  contributor,
}: {
  rank: number;
  contributor: RepositoryContributor;
}) {
  const icon =
    rank === 1 ? <Trophy className="w-5 h-5" /> : <Users className="w-5 h-5" />;

  const handleClick = () => {
    window.open(
      `${config.githubUrl}/commits?author=${contributor.username}`,
      "_blank",
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: rank * 0.1 }}
      whileHover={{ scale: 1.02 }}
      className="flex items-center space-x-2 border p-2 px-4 hover:bg-muted rounded-md cursor-pointer group relative"
      onClick={handleClick}
      title={`View ${contributor.username}'s contributions to this project`}
    >
      <motion.div
        className="relative bg-primary rounded-full overflow-hidden"
        whileHover={{ scale: 1.1 }}
      >
        <Image
          src={contributor.avatarUrl}
          alt={contributor.username}
          width={32}
          height={32}
          className="rounded-full transition-opacity group-hover:opacity-70"
        />
      </motion.div>
      <div className="flex-grow">
        <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
          {contributor.username}
        </p>
        <p className="text-xs text-muted-foreground">Rank: {rank}</p>
      </div>
      <div className="flex items-center space-x-1 text-muted-foreground">
        <GitCommit className="w-4 h-4" />
        <span className="text-sm">{contributor.contributionCount}</span>
      </div>

      <motion.span
        className="text-primary"
        whileHover={{ rotate: 360 }}
        transition={{ duration: 0.5 }}
      >
        {icon}
      </motion.span>
    </motion.div>
  );
}

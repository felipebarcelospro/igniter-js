import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { config } from "@/configs/application";
import { motion } from "framer-motion";
import Link from "next/link";

export function QuickLinks() {
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const item = {
    hidden: { opacity: 0, x: -20 },
    show: { opacity: 1, x: 0 },
  };

  return (
    <Card>
      <CardHeader>
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <CardTitle className="text-lg font-semibold">Quick Links</CardTitle>
        </motion.div>
      </CardHeader>
      <CardContent>
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="space-y-2"
        >
          <motion.div variants={item}>
            <Link
              href={config.githubUrl}
              className="block text-sm text-primary hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub Repository
            </Link>
          </motion.div>
          <motion.div variants={item}>
            <Link
              href={`${config.githubUrl}/blob/main/CONTRIBUTING.md`}
              className="block text-sm text-primary hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Contribution Guide
            </Link>
          </motion.div>
          <motion.div variants={item}>
            <Link
              href={`${config.githubUrl}/issues`}
              className="block text-sm text-primary hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Issue Tracker
            </Link>
          </motion.div>
        </motion.div>
      </CardContent>
    </Card>
  );
}

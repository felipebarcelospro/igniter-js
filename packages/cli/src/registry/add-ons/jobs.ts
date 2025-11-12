import { BaseAddOn } from "@/core/registry/add-ons/base-addon";
import path from "path";

export class JobsAddOn extends BaseAddOn {
  name = "Jobs";
  description = "Background task processing and job queues";
  value = "jobs";
  hint = "For background processing";
  templates = [
    {
      template: path.resolve(
        process.cwd(),
        "templates/add-ons/jobs/jobs.ts.hbs",
      ),
      outputPath: "src/services/jobs.ts",
    },
    {
      template: path.resolve(
        process.cwd(),
        "templates/add-ons/jobs/redis.ts.hbs",
      ),
      outputPath: "src/services/redis.ts",
    },
    {
      template: path.resolve(
        process.cwd(),
        "templates/add-ons/jobs/store.ts.hbs",
      ),
      outputPath: "src/services/store.ts",
    },
  ];
  dependencies = [
    {
      name: "@igniter-js/adapter-redis",
      version: "latest",
      type: "dependency",
    },
    {
      name: "@igniter-js/adapter-bullmq",
      version: "latest",
      type: "dependency",
    },
    {
      name: "bullmq",
      version: "5.58.7",
      type: "dependency",
    },
    {
      name: "ioredis",
      version: "5.6.1",
      type: "dependency",
    },
    {
      name: "@types/ioredis",
      version: "4.28.10",
      type: "devDependency",
    },
  ];
  dockerServices = [
    {
      name: "redis",
      image: "redis:7-alpine",
      ports: ["6379:6379"],
      environment: {
        REDIS_PASSWORD: "${REDIS_PASSWORD}",
      },
      volumes: ["redis_data:/data"],
    },
  ];
  envVars = [
    {
      key: "REDIS_URL",
      value: "redis://localhost:6379",
      description: "Redis connection URL",
    },
    {
      key: "REDIS_HOST",
      value: "localhost",
      description: "Redis host",
    },
    {
      key: "REDIS_PORT",
      value: "6379",
      description: "Redis port",
    },
    {
      key: "REDIS_PASSWORD",
      value: "",
      description: "Redis password (leave empty for no password)",
    },
    {
      key: "IGNITER_JOBS_QUEUE_PREFIX",
      value: "igniter",
      description: "Job queue prefix",
    },
  ];
}

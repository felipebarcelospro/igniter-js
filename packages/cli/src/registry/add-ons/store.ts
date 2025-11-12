import path from "path";
import { BaseAddOn } from "@/core/registry/add-ons/base-addon";

export class RedisStoreAddOn extends BaseAddOn {
  name = "Store";
  description = "Caching, sessions, and pub/sub messaging";
  value = "store";
  hint = "Recommended";
  templates = [
    {
      template: path.resolve(
        process.cwd(),
        "templates/add-ons/store/redis.ts.hbs",
      ),
      outputPath: "src/services/redis.ts",
    },
    {
      template: path.resolve(
        process.cwd(),
        "templates/add-ons/store/store.ts.hbs",
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
  ];
}

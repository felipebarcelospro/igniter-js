import type { ProjectSetupConfig } from "@/commands/init/types";
import { getPackageManagerCommand } from "@/core/package-manager";
import { BaseAddOn } from "@/core/registry/add-ons/base-addon";
import { runCommand } from "@/core/terminal";
import path from "path";

export class DatabaseAddOn extends BaseAddOn {
  name = "Database";
  description = "Database integration with multiple ORMs and providers";
  value = "database";
  hint = "Essential for data persistence";
  options = [
    {
      key: "orm",
      message: "Choose your preferred ORM for type-safe database operations",
      multiple: false,
      required: true,
      choices: [
        {
          value: "prisma",
          label: "Prisma",
          hint: "Type-safe, mature, excellent tooling",
          dependencies: [
            {
              name: "dotenv",
              type: "dependency",
              version: "latest",
            },
            {
              name: "prisma",
              type: "dependency",
              version: "^6.19.0",
            },
            {
              name: "@prisma/client",
              type: "dependency",
              version: "^6.19.0",
            }
          ],
          templates: [
            {
              template: path.resolve(
                process.cwd(),
                "templates/add-ons/database/prisma/lib.hbs",
              ),
              outputPath: "src/lib/database.ts",
            },
            {
              template: path.resolve(
                process.cwd(),
                "templates/add-ons/database/prisma/prisma.config.hbs",
              ),
              outputPath: "prisma.config.ts",
            },
            {
              template: path.resolve(
                process.cwd(),
                "templates/add-ons/database/prisma/schema.hbs",
              ),
              outputPath: "prisma/schema.prisma",
            }
          ],
        },
        {
          value: "drizzle",
          label: "Drizzle ORM",
          hint: "Lightweight, modern, SQL-like",
          templates: [
            {
              template: path.resolve(
                process.cwd(),
                "templates/add-ons/database/drizzle/lib.hbs",
              ),
              outputPath: "src/lib/database.ts",
            },
          ],
        },
      ],
    },
    {
      key: "provider",
      message: "Choose the database engine",
      multiple: false,
      required: true,
      choices: [
        {
          value: "postgresql",
          label: "PostgreSQL",
          hint: "Production-ready, full-featured",
          dockerServices: [
            {
              name: "postgres",
              image: "postgres:16-alpine",
              ports: ["5432:5432"],
              environment: {
                POSTGRES_DB: "${DATABASE_NAME}",
                POSTGRES_USER: "${DATABASE_USER}",
                POSTGRES_PASSWORD: "${DATABASE_PASSWORD}",
              },
              volumes: ["postgres_data:/var/lib/postgresql/data"],
            },
          ],
          envVars: [
            {
              key: "DATABASE_URL",
              value:
                "postgresql://igniter:${DATABASE_PASSWORD}@localhost:5432/igniter_db",
              description: "PostgreSQL connection string",
            },
            {
              key: "DATABASE_PASSWORD",
              value: "igniter",
              description: "Database password",
            },
            {
              key: "DATABASE_USER",
              value: "igniter",
              description: "Database username",
            },
          ],
        },
        {
          value: "mysql",
          label: "MySQL",
          hint: "Wide compatibility, popular",
          dockerServices: [
            {
              name: "mysql",
              image: "mysql:8.0",
              ports: ["3306:3306"],
              environment: {
                MYSQL_ROOT_PASSWORD: "${DATABASE_PASSWORD}",
                MYSQL_DATABASE: "${DATABASE_NAME}",
                MYSQL_USER: "${DATABASE_USER}",
                MYSQL_PASSWORD: "${DATABASE_PASSWORD}",
              },
              volumes: ["mysql_data:/var/lib/mysql"],
            },
          ],
          envVars: [
            {
              key: "DATABASE_URL",
              value:
                "mysql://igniter:${DATABASE_PASSWORD}@localhost:3306/igniter_db",
              description: "MySQL connection string",
            },
            {
              key: "DATABASE_PASSWORD",
              value: "docker",
              description: "Database password",
            },
            {
              key: "DATABASE_USER",
              value: "docker",
              description: "Database username",
            },
            {
              key: "DATABASE_NAME",
              value: "docker",
              description: "Database name",
            },
          ],
        },
        {
          value: "sqlite",
          label: "SQLite",
          hint: "Local development, file-based",
          envVars: [
            {
              key: "DATABASE_URL",
              value: "file:./dev.db",
              description: "SQLite database file path",
            },
          ],
        },
      ],
      setup: async (projectDir: string, config: ProjectSetupConfig) => {
        // if database.orm is prisma, we need use prisma cli to setup the database
        if (config.addOnOptions?.database?.orm === "prisma") {
          const command = getPackageManagerCommand(
            config.packageManager,
            "prisma",
          );
          await runCommand(`${command} generate`, { cwd: projectDir });
        }
        // if database.orm is drizzle, we need use drizzle cli to setup the database
        if (config.addOnOptions?.database?.orm === "drizzle") {
          const command = getPackageManagerCommand(
            config.packageManager,
            "drizzle",
          );
          await runCommand(`${command} init`, { cwd: projectDir });
        }
      },
    },
  ];
}

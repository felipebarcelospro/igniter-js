import path from "node:path";
import type { ProjectSetupConfig } from "@/commands/init/types";
import { getPackageManagerCommand } from "@/core/package-manager";
import { BaseAddOn } from "@/core/registry/add-ons/base-addon";
import { parseCommandOptions, runCommand } from "@/core/terminal";
import * as p from "@clack/prompts";

export class AuthAddOn extends BaseAddOn {
  name = "Authentication";
  description = "Authentication and authorization";
  value = "auth";
  hint = "Essential for user authentication and authorization";
  options = [
    {
      key: "provider",
      message: "Choose the authentication provider",
      multiple: false,
      required: true,
      choices: [
        {
          value: "better-auth",
          label: "Better Auth",
          hint: "Universal TypeScript auth, plugin support, secure and extensible—focus on your app.",
          dependencies: [
            {
              name: "better-auth",
              version: "1.3.0",
              type: "dependency",
            },
          ],
          templates: [
            {
              template: "templates/add-ons/auth/better-auth/auth.hbs",
              outputPath: "src/lib/auth.ts",
            },
          ],
          subOptions: [
            {
              key: "plugins",
              message: "Choose the authentication plugins",
              multiple: true,
              required: true,
              choices: [
                {
                  value: "email",
                  label: "Email",
                  hint: "Email authentication",
                },
                {
                  value: "two-factor",
                  label: "Two Factor",
                  hint: "Two-factor authentication",
                },
                {
                  value: "username",
                  label: "Username",
                  hint: "Username authentication",
                },
                {
                  value: "anonymous",
                  label: "Anonymous",
                  hint: "Anonymous authentication",
                },
                {
                  value: "phone-number",
                  label: "Phone Number",
                  hint: "Phone number authentication",
                },
                {
                  value: "magic-link",
                  label: "Magic Link",
                  hint: "Magic link authentication",
                },
                {
                  value: "email-otp",
                  label: "Email OTP",
                  hint: "One-time password email authentication",
                },
                {
                  value: "passkey",
                  label: "Passkey",
                  hint: "Passkey authentication",
                },
                {
                  value: "generic-oauth",
                  label: "Generic OAuth",
                  hint: "Provider-independent OAuth authentication",
                },
                {
                  value: "one-tap",
                  label: "One Tap",
                  hint: "Google One Tap authentication",
                },
                {
                  value: "api-key",
                  label: "API Key",
                  hint: "API Key authentication",
                },
                {
                  value: "admin",
                  label: "Admin",
                  hint: "Admin authentication",
                },
                {
                  value: "organization",
                  label: "Organization",
                  hint: "Organization-based authentication",
                },
                {
                  value: "oidc",
                  label: "OIDC Provider",
                  hint: "OpenID Connect authentication provider",
                },
                {
                  value: "sso",
                  label: "SSO",
                  hint: "Single sign-on authentication (SSO)",
                },
                {
                  value: "bearer",
                  label: "Bearer",
                  hint: "Bearer token authentication",
                },
                {
                  value: "multi-session",
                  label: "Multi Session",
                  hint: "Concurrent multi-session authentication",
                },
                {
                  value: "oauth-proxy",
                  label: "OAuth Proxy",
                  hint: "OAuth proxy authentication",
                },
                {
                  value: "open-api",
                  label: "Open API",
                  hint: "OpenAPI authentication support",
                },
                {
                  value: "jwt",
                  label: "JWT",
                  hint: "JWT authentication",
                },
                {
                  value: "next-cookies",
                  label: "Next.js Cookies",
                  hint: "Cookie support for Next.js",
                },
              ],
            },
          ],
        },
      ],
      setup: async (projectDir: string, config: ProjectSetupConfig) => {
        // we need use better-auth cli to setup the auth
        const command = getPackageManagerCommand(
          config.packageManager,
          "@better-auth/cli",
        );

        // run the command and wait for it to complete with the options
        const result = await runCommand(
          `${command} generate --config src/lib/auth.ts --yes`,
          {
            cwd: projectDir,
          },
        );

        if (result.errorMessage) {
          p.log.error(`Better Auth setup failed: ${result.errorMessage}`);
        }
      },
    },
  ];
}

import type { ProjectSetupConfig } from "@/commands/init/types";
import { getPackageManagerCommand } from "@/core/package-manager";
import { BaseAddOn } from "@/core/registry/add-ons/base-addon";
import { runCommand } from "@/core/terminal";

export class ShadcnAddOn extends BaseAddOn {
  name = "Shadcn/UI";
  description = "Beautifully designed components built with Radix UI and Tailwind CSS.";
  value = "shadcn-ui";
  hint = "Production-grade UI built on top of Shadcn/UI and Radix primitives";
  public async runPostInstall(projectDir: string, options: ProjectSetupConfig): Promise<void> {
    const command = getPackageManagerCommand(
      options.packageManager,
      "shadcn@latest init --base-color zinc --src-dir --silent --yes",
    );
    await runCommand(`${command}`, { cwd: projectDir });
  }
}

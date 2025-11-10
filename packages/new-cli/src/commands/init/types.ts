export type PackageManager = "npm" | "yarn" | "pnpm" | "bun";

export interface AddOnOptionValue {
  [key: string]: any;
}

export interface ProjectSetupConfig {
  projectName: string;
  mode: "install" | "new-project";
  starter: string;
  addOns: string[];
  addOnOptions?: AddOnOptionValue;
  packageManager: PackageManager;
  initGit: boolean;
  initDocker: boolean;
  installDependencies: boolean;
}

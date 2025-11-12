import { appendFile, readFile } from "fs/promises";
import * as path from "path";
import { fileExists } from "./feature-fs";
import { resolveTemplatePath, renderTemplateToFile } from "@/core/template-engine";

type ExportType = "controller" | "procedure" | "interfaces";

function buildExportLine(type: ExportType, fileStem: string): string {
  switch (type) {
    case "controller":
      return `export * from './controllers/${fileStem}'`;
    case "procedure":
      return `export * from './procedures/${fileStem}'`;
    case "interfaces":
      return `export * from './${fileStem}'`;
  }
}

export async function ensureIndexExport(
  featureDir: string,
  type: ExportType,
  fileStem: string,
): Promise<void> {
  const indexPath = path.join(featureDir, "index.ts");
  const exportLine = buildExportLine(type, fileStem);

  if (!(await fileExists(indexPath))) {
    const templatePath = resolveTemplatePath(
      "generate",
      "feature",
      "index.hbs",
    );

    await renderTemplateToFile(
      templatePath,
      {
        hasController: type === "controller",
        controllerFile: type === "controller" ? fileStem : "",
        hasProcedure: type === "procedure",
        procedureFile: type === "procedure" ? fileStem : "",
        hasInterfaces: type === "interfaces",
        interfacesFile: type === "interfaces" ? fileStem : "",
      },
      indexPath,
    );
    return;
  }

  const content = await readFile(indexPath, "utf-8");
  const normalizedContent = content.replace(/\r\n/g, "\n");

  if (
    normalizedContent
      .split("\n")
      .some((line) => line.trim() === exportLine || line.trim() === `${exportLine};`)
  ) {
    return;
  }

  const needsNewline = !normalizedContent.endsWith("\n");
  await appendFile(
    indexPath,
    `${needsNewline ? "\n" : ""}${exportLine}\n`,
    "utf-8",
  );
}

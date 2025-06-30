#!/usr/bin/env node

const fs = require("fs");

function addClientDirective(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const clientDirective = '"use client";\n';

  if (content.startsWith(clientDirective)) return;

  fs.writeFileSync(filePath, `${clientDirective}${content}`, "utf8");
}

function createBarelFile() {
  const mjsContent = `
export * from "./igniter.context";
export * from "./igniter.hooks";
export * from "./igniter.client";
  `;

  const jsContent = `
Object.assign(
  module.exports,
  require("./igniter.context"),
  require("./igniter.hooks"),
  require("./igniter.client")
);
`;

  // TypeScript declaration file
    const dtsContent = `
  export * from "./igniter.context";
  export * from "./igniter.hooks";
  export * from "./igniter.client";
    `;
  
    fs.writeFileSync("dist/client/index.js", jsContent, "utf8");
    fs.writeFileSync("dist/client/index.mjs", mjsContent, "utf8");
    fs.writeFileSync("dist/client/index.d.ts", dtsContent, "utf8");
}

// Aplicar "use client" apenas nos arquivos que realmente precisam (browser-only)
["dist/client/igniter.context.js", "dist/client/igniter.context.mjs"].forEach(addClientDirective);
["dist/client/igniter.hooks.js", "dist/client/igniter.hooks.mjs"].forEach(addClientDirective);

// IMPORTANTE: Não aplicar "use client" nos arquivos .server.ts pois eles são server-only
// O arquivo .browser.ts precisa de "use client" pois contém hooks do React
["dist/client/igniter.client.browser.js", "dist/client/igniter.client.browser.mjs"].forEach(addClientDirective);

// O arquivo principal igniter.client.ts não precisa de "use client" pois faz lazy loading
// O arquivo .server.ts definitivamente NÃO deve ter "use client"

createBarelFile();

process.exit(0);
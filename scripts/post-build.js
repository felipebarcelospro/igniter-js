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

["dist/client/igniter.context.js", "dist/client/igniter.context.mjs"].forEach(addClientDirective);
["dist/client/igniter.hooks.js", "dist/client/igniter.hooks.mjs"].forEach(addClientDirective);

process.exit(0);
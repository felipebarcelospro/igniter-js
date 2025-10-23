#!/usr/bin/env node

/**
 * Script to add 'use client' directive to client-side chunk files
 * that import 'rou3' to ensure Next.js compatibility.
 */

const fs = require('fs');
const path = require('path');

const CLIENT_DIST_DIR = path.join(__dirname, '../dist/client');

function addUseClientDirective() {
  console.log('🔍 Scanning for client chunk files that need "use client" directive...\n');
  
  if (!fs.existsSync(CLIENT_DIST_DIR)) {
    console.error('❌ Client dist directory not found:', CLIENT_DIST_DIR);
    process.exit(1);
  }

  const files = fs.readdirSync(CLIENT_DIST_DIR);
  const chunkFiles = files.filter(file => 
    (file.startsWith('chunk-') && (file.endsWith('.js') || file.endsWith('.mjs')))
  );

  console.log(`📦 Found ${chunkFiles.length} chunk file(s) to check\n`);

  let modifiedCount = 0;

  for (const file of chunkFiles) {
    const filePath = path.join(CLIENT_DIST_DIR, file);
    const content = fs.readFileSync(filePath, 'utf-8');

    // Check if file imports 'rou3' (either require or import)
    const hasRou3Import = 
      content.includes("require('rou3')") || 
      content.includes('require("rou3")') ||
      content.includes("import 'rou3'") ||
      content.includes('import "rou3"') ||
      content.includes("from 'rou3'") ||
      content.includes('from "rou3"');

    // Check if already has 'use client' directive
    const hasUseClient = content.trimStart().startsWith("'use client'") || 
                         content.trimStart().startsWith('"use client"');

    if (hasRou3Import && !hasUseClient) {
      console.log(`✏️  Adding "use client" to: ${file}`);
      
      // Add 'use client' at the very beginning
      const newContent = `'use client';\n\n${content}`;
      fs.writeFileSync(filePath, newContent, 'utf-8');
      
      modifiedCount++;
    } else if (hasRou3Import && hasUseClient) {
      console.log(`✅ Already has "use client": ${file}`);
    } else {
      console.log(`⏭️  Skipping (no rou3 import): ${file}`);
    }
  }

  console.log(`\n✨ Done! Modified ${modifiedCount} file(s)\n`);
}

try {
  addUseClientDirective();
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}

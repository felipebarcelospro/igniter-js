import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

// Helper function to add color to console output
const color = (text, code) => `\x1b[${code}m${text}\x1b[0m`;
const green = (text) => color(text, 32);
const red = (text) => color(text, 31);
const yellow = (text) => color(text, 33);

const projectRoot = process.cwd();
const sourceDir = path.join(projectRoot, 'docs', 'wiki-content');
const wikiDir = path.join(projectRoot, 'wiki');
const repoUrl = 'https://github.com/felipebarcelospro/igniter-js.wiki.git'; // Replace with your repo URL if needed

/**
 * Executes a shell command synchronously and handles errors.
 * @param {string} command The command to execute.
 * @param {import('child_process').ExecSyncOptions} options Options for execSync.
 */
function runCommand(command, options = {}) {
  try {
    console.log(yellow(`> ${command}`));
    execSync(command, { stdio: 'inherit', ...options });
  } catch (error) {
    console.error(red(`Failed to execute command: ${command}`));
    process.exit(1);
  }
}

console.log(green('🚀 Starting wiki synchronization script...'));

// --- Step 1: Verify the local wiki repository ---
if (!fs.existsSync(wikiDir) || !fs.existsSync(path.join(wikiDir, '.git'))) {
  console.error(red(`\nError: The 'wiki' directory does not exist or is not a git repository.`));
  console.log(`Please clone your wiki repository into the project root first:`);
  console.log(yellow(`git clone ${repoUrl} ${path.basename(wikiDir)}`));
  process.exit(1);
}

// --- Step 2: Pull latest changes from the remote wiki ---
console.log(green('\nStep 1: Pulling latest changes from the wiki repository...'));
runCommand('git pull', { cwd: wikiDir });

// --- Step 3: Synchronize files using rsync ---
console.log(green('\nStep 2: Syncing documentation files...'));
// The trailing slashes on the paths are important for rsync's behavior.
const rsyncCommand = `rsync -av --delete --exclude='.git/' "${sourceDir}/" "${wikiDir}/"`;
runCommand(rsyncCommand);

// --- Step 4: Commit and push changes if there are any ---
console.log(green('\nStep 3: Checking for changes and pushing to the wiki repository...'));

// Use 'git status --porcelain' to check for changes. It's more reliable across environments.
const status = execSync('git status --porcelain', { cwd: wikiDir }).toString().trim();

if (status) {
  console.log('Changes detected. Committing and pushing...');

  // You might want to configure your git user locally if not set globally
  // runCommand('git config user.name "Your Name"', { cwd: wikiDir });
  // runCommand('git config user.email "your.email@example.com"', { cwd: wikiDir });

  runCommand('git add .', { cwd: wikiDir });
  runCommand('git commit -m "docs: Sync wiki from local machine"', { cwd: wikiDir });
  runCommand('git push', { cwd: wikiDir });

  console.log(green('\n✅ Wiki synchronization complete!'));
} else {
  console.log('No changes detected. The wiki is already up-to-date.');
  console.log(green('\n✅ Wiki is already up-to-date!'));
}

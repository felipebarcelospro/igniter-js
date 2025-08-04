---
mode: agent
---
# Prompt: Prepare Pull Request (Follow Repository Templates)

## Purpose
Standardize the process of finalizing work and opening a high-quality Pull Request (PR) that adheres to this repository's templates and conventions. Ensure code quality gates are satisfied, commits use Conventional Commits, and the PR description is complete and helpful for reviewers.

## Prerequisites
- Ensure all local changes are saved.
- Confirm tests and lint pass locally for all affected packages.
- Verify you are on a feature branch (not `main`). If not, create one.

## Step-by-Step Instructions

1. Sync and Branch Hygiene
   - Fetch latest changes: `git fetch --all --prune`.
   - Rebase or merge latest `main` into the working branch as appropriate.
   - Confirm a descriptive branch name (e.g., `feat/core-middleware-chaining`).

2. Lint & Test
   - Run monorepo lint: `npm run lint`.
   - Run tests for all packages: `npm run test`.
   - If only some packages changed, run scoped tests: `npm test --filter <pkg>`.
   - Fix any issues before proceeding.

3. Create Conventional Commits
   - Use the `create-conventional-commits` prompt to analyze all changes, group them into atomic commits, and generate Conventional Commit messages with scopes.
   - Ensure each commit message is in English and uses the correct scope (e.g., `core`, `cli`, `adapter-redis`, `www`, `repo`).

4. Summarize Changes
   - Gather the list of commits since the branch diverged from `main`.
   - Categorize commits by type: Features, Fixes, Docs, Refactor, Perf, Tests, Build, CI, Chore, and Breaking Changes.

5. Build PR Title & Description Using Template
   - Title:
     - Prefer an imperative, succinct summary (e.g., `feat(core): add middleware chaining support`).
   - Description:
     - Follow `.github/PULL_REQUEST_TEMPLATE.md` sections.
     - Include: Context/Problem, Solution, Screenshots/Logs (if UI), Breaking Changes, Checklist.
     - Link related issues (e.g., `Closes #123`).

6. Preview & Approval
   - Show the proposed PR title and fully rendered description for review.
   - Ask for approval to open the PR.

7. Open PR
   - If approved, open via GitHub CLI: `gh pr create --title "<title>" --body-file <tempfile> --base main --head <branch>`.
   - Assign reviewers if requested.

## Success Criteria
- All changes are committed with Conventional Commits and correct scopes.
- Lint and test pass locally.
- PR title and description follow the repository template and provide clear context for reviewers.
- The user approves the final PR content before creation.

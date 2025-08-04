---
mode: agent
---
# Prompt: Create a Bug Report Issue (Using Repository Templates)

## Purpose
Guide the creation of a complete, high-quality bug report aligned with this repository's issue templates. Collect all required details, validate clarity and reproducibility, then generate a well-structured GitHub issue body that matches the template fields.

## Prerequisites
- Confirm the repository contains issue templates under `.github/ISSUE_TEMPLATE/`.
- Prefer the template named `bug_report` or equivalent; mirror its sections and required fields.

## Step-by-Step Instructions

1. Gather Problem Context
   - Ask the user for a concise title that captures the defect.
   - Ask for a clear description summarizing the problem and impact.
   - Request repository path(s) or package scope(s) impacted (e.g., `core`, `cli`, `adapter-redis`, `apps/www`, `repo`).

2. Reproduction
   - Collect exact reproduction steps as a numbered list (minimal steps preferred).
   - Request expected behavior versus actual behavior.
   - Ask for reproduction repository/branch or a code snippet if available.

3. Environment Details
   - Ask for environment info such as:
     - OS and version (e.g., macOS 14.x)
     - Node.js/Bun/Deno versions where applicable
     - Package manager and version (npm/pnpm/bun)
     - Igniter.js package versions (if applicable)
     - Any relevant env vars, feature flags, or configuration toggles

4. Logs and Evidence
   - Ask for stack traces, console logs, screenshots, or network traces.
   - If test failures are involved, request the exact failing test name/output.

5. Impact & Severity
   - Ask the user to classify severity (e.g., blocker/critical/major/minor/trivial).
   - Ask for frequency (always/sometimes/rarely) and scope (single package, multiple packages).

6. Triage Metadata
   - Suggest labels/scopes based on provided paths (e.g., `pkg:core`, `app:www`, `kind:bug`).
   - Suggest a milestone (if applicable) and link related issues/PRs.

7. Build Issue Body Using Template
   - Construct a markdown body mirroring the repository bug report template sections:
     - Title
     - Description
     - Steps to Reproduce
     - Expected Behavior
     - Actual Behavior
     - Environment
     - Logs/Screenshots
     - Impact/Severity
     - Additional Context / Related Issues
   - Ensure all sections are present; insert `N/A` for fields not provided.

8. Preview & Approval
   - Show the final issue title, labels, and markdown body for user approval.
   - Ask if you should open the issue now, or copy the content to clipboard.

9. Open Issue
   - If approved, open the issue via GitHub CLI when available: `gh issue create --title "<title>" --body-file <tempfile> --label <labels>`.
   - If GitHub CLI is unavailable, instruct the user to paste the prepared body into a new GitHub issue.

## Success Criteria
- The issue is complete, reproducible, and aligned with the template.
- Severity, scope, and labels are suggested to support triage.
- The user approves the final content before creation.

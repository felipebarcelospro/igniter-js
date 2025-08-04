---
mode: agent
---
# Prompt: Generate Conventional Commits from All Working Directory Changes

## Task Definition
The goal of this task is to analyze all unstaged and staged changes in the Git working directory, interactively group them into logical, atomic commits, stage them, and generate commit messages that strictly adhere to the Conventional Commits specification. This process should be repeated until the working directory is clean.

## Step-by-Step Instructions

1.  **Check Repository Status:**
    *   Run `git status --porcelain` to get a list of all modified, staged, and untracked files.
    *   If the working directory is clean, inform the user and stop the process.

2.  **Analyze and Propose First Logical Commit:**
    *   Review the list of all changed files and their diffs (`git diff <file-path>`).
    *   Identify a small, cohesive set of changes that constitute a single logical unit of work (e.g., a single feature, a bug fix with its test). This will be the first proposed commit.
    *   List the files you propose to include in this commit.

3.  **Determine Commit Type and Scope:**
    *   For the proposed group of files, determine the primary **type** (e.g., `feat`, `fix`, `docs`, `refactor`, `chore`, etc.).
    *   Determine the **scope** based on the location of the changed files (e.g., `core`, `cli`, `adapter-redis`, `www`, `repo`).

4.  **Construct the Commit Message:**
    *   Follow the Conventional Commits v1.0.0 specification precisely.
    *   **Subject:** `type(scope): imperative-mood description`
    *   **Body (Optional):** Explain the "what" and "why".
    *   **Footer (Optional):** Note any `BREAKING CHANGE:` and reference issues.

5.  **Present for Approval:**
    *   Display a clear plan for the **first** commit:
        *   The files to be staged (`git add ...`).
        *   The fully formed `git commit` command.
    *   Ask for explicit approval from the user to proceed with this single commit.

6.  **Execute and Repeat:**
    *   Upon receiving approval, execute the `git add` and `git commit` commands for the proposed group.
    *   After the commit is successful, return to Step 1 and repeat the entire process with the remaining changes.
    *   Continue this loop until all changes have been committed and the working directory is clean.

## Success Criteria
-   The Git working directory is clean at the end of the process.
-   All changes are organized into atomic, logical commits.
-   The user has reviewed and approved each commit individually before it was created.
-   All commit messages perfectly adhere to the Conventional Commits standard.

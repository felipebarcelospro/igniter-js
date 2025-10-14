# Release and Publishing Guide

This document outlines the automated release and publishing workflow for the Igniter.js monorepo.

## Overview

The Igniter.js project uses an automated CI/CD workflow for versioning and publishing packages to NPM. The workflow is designed to:

- Automatically version packages based on changesets
- Generate changelogs following Conventional Commits
- Publish to NPM with appropriate tags (`latest` for stable releases, `beta` for pre-releases)
- Enforce code quality through automated PR validation

## Branch Strategy

### Main Branch (`main`)

- **Purpose**: Stable, production-ready releases
- **NPM Tag**: `latest`
- **Workflow**: Merges to `main` trigger the publication of packages with the `latest` tag
- **Use Case**: Final releases that are ready for production use

### Beta Branches (`beta/*`)

- **Purpose**: Pre-release testing and validation
- **NPM Tag**: `beta`
- **Workflow**: Pushes to `beta/*` branches trigger the publication of packages with the `beta` tag
- **Use Case**: Internal testing, early access features, release candidates

**Example branch names:**
- `beta/v1.2.0` - For release candidate of version 1.2.0
- `beta/feature-x` - For testing a specific feature before merging to main
- `beta/next` - For continuous beta releases

## Making Changes and Releasing

### Step 1: Create a Changeset

When you make a change that should be included in the next release, create a changeset:

```bash
npm run changeset
```

Follow the prompts to:
1. Select which packages have changed
2. Choose the type of change (major, minor, patch)
3. Write a summary of the changes

This creates a changeset file in `.changeset/` that will be used to:
- Determine the version bump
- Generate changelog entries
- Track what changed in the release

### Step 2: Commit and Push

Commit the changeset file along with your code changes:

```bash
git add .
git commit -m "feat: Add new feature with changeset"
git push
```

### Step 3: Merge to Target Branch

#### For Beta Releases

1. Push your changes to a `beta/*` branch:
   ```bash
   git checkout -b beta/my-feature
   git push origin beta/my-feature
   ```

2. The `publish-beta.yml` workflow will automatically:
   - Build all packages
   - Version packages in prerelease mode
   - Publish to NPM with the `beta` tag

3. Install the beta version:
   ```bash
   npm install @igniter-js/core@beta
   ```

#### For Stable Releases

1. Create a pull request to `main`
2. Once merged, the `publish-main.yml` workflow will:
   - Create a "Version Packages" PR with all version bumps and changelog updates
   - When the Version Packages PR is merged, packages are automatically published with the `latest` tag

## Conventional Commits

All pull requests to `main` and `beta/*` branches must have titles that follow the [Conventional Commits](https://www.conventionalcommits.org/) specification.

### Format

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Types

- **feat**: A new feature (triggers a minor version bump)
- **fix**: A bug fix (triggers a patch version bump)
- **docs**: Documentation only changes
- **style**: Changes that don't affect code meaning (formatting, etc.)
- **refactor**: Code change that neither fixes a bug nor adds a feature
- **perf**: Performance improvement
- **test**: Adding or updating tests
- **build**: Changes to build system or dependencies
- **ci**: Changes to CI configuration
- **chore**: Other changes that don't modify src or test files
- **revert**: Reverts a previous commit

### Examples

**Good PR titles:**
- `feat: Add support for WebSocket connections`
- `fix: Resolve memory leak in queue adapter`
- `docs: Update installation guide`
- `refactor: Simplify router type definitions`
- `feat(cli): Add interactive mode to dev command`

**Bad PR titles:**
- `Update code` (missing type)
- `feat add feature` (missing colon)
- `FIX: bug` (type should be lowercase)

## Workflow Files

### `.github/workflows/publish-main.yml`

Handles publishing to NPM when changes are merged to `main`:

- Triggers on push to `main` branch
- Uses Changesets to create Version Packages PR or publish
- Publishes packages with `latest` tag
- Updates CHANGELOG.md files automatically

### `.github/workflows/publish-beta.yml`

Handles publishing to NPM when changes are pushed to `beta/*` branches:

- Triggers on push to `beta/*` branches
- Enters prerelease mode automatically
- Versions packages with beta suffix (e.g., `1.2.0-beta.0`)
- Publishes packages with `beta` tag

### `.github/workflows/validate-pr.yml`

Validates PR titles follow Conventional Commits:

- Triggers on PR open, edit, or sync
- Checks PR title format
- Provides helpful error messages for invalid titles

## NPM Authentication

The workflows require an `NPM_TOKEN` secret to be configured in the repository settings.

### Setting up NPM_TOKEN

1. Generate an automation token on npmjs.com:
   - Go to npmjs.com and login
   - Navigate to Access Tokens
   - Generate New Token → Automation
   - Copy the token

2. Add to GitHub repository secrets:
   - Go to repository Settings → Secrets and variables → Actions
   - Click "New repository secret"
   - Name: `NPM_TOKEN`
   - Value: [paste your token]
   - Click "Add secret"

## Testing Packages Locally

Before publishing, you can test packages locally:

```bash
# Build all packages
npm run build

# Link packages for local testing
cd packages/core
npm link

cd ../your-test-project
npm link @igniter-js/core
```

## Troubleshooting

### Publish Failed

If a publish workflow fails:

1. Check the workflow logs in the Actions tab
2. Common issues:
   - NPM_TOKEN is missing or expired
   - Package version already exists on NPM
   - Build failures (fix the build first)
   - Network issues (re-run the workflow)

### Version Packages PR Not Created

If the Version Packages PR is not created after merging to main:

1. Ensure changeset files exist in `.changeset/`
2. Check the workflow run in Actions tab
3. Verify GITHUB_TOKEN has write permissions

### Beta Version Not Publishing

If beta versions aren't publishing:

1. Verify the branch name follows `beta/*` pattern
2. Check that changeset files exist
3. Review workflow logs for errors

## Best Practices

1. **Create changesets for all user-facing changes**: This ensures proper versioning and changelog generation
2. **Use descriptive changeset summaries**: These become your changelog entries
3. **Test in beta before merging to main**: Use beta branches to validate changes
4. **Follow Conventional Commits**: This maintains consistency and enables automated tooling
5. **Review Version Packages PR carefully**: Check version bumps and changelogs before merging

## Additional Resources

- [Changesets Documentation](https://github.com/changesets/changesets)
- [Conventional Commits Specification](https://www.conventionalcommits.org/)
- [Semantic Versioning](https://semver.org/)
- [NPM Documentation](https://docs.npmjs.com/)

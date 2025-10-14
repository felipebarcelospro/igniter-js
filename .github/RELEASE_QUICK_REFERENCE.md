# Quick Reference: Release Workflows

Quick reference card for Igniter.js automated release workflows.

## 🎯 Quick Decision Tree

**Q: Where should I work?**
- Testing a feature → `beta/*` branch
- Ready for production → PR to `main`

**Q: How do I publish?**
- Beta version → Push to `beta/*` branch
- Stable version → Merge to `main` (then merge Version PR)

**Q: Do I need a changeset?**
- Changed package code → **Yes, run `npm run changeset`**
- Docs/tests only → **No**

## 📋 Common Commands

```bash
# Create a changeset for your changes
npm run changeset

# Preview what version bumps will happen
npx changeset status

# Build all packages
npm run build

# Test all packages
npm test

# Lint code
npm run lint
```

## 🔀 Branch Workflow

### Beta Release (Testing)
```bash
# Create beta branch
git checkout -b beta/my-feature

# Make changes and create changeset
npm run changeset

# Commit and push
git add .
git commit -m "feat: Add new feature"
git push origin beta/my-feature

# ✨ Auto-publishes with @beta tag
```

### Stable Release (Production)
```bash
# Create feature branch
git checkout -b feature/my-feature

# Make changes and create changeset
npm run changeset

# Commit and push
git add .
git commit -m "feat: Add new feature"
git push origin feature/my-feature

# Create PR to main with Conventional Commit title
# After merge to main:
# → Workflow creates "Version Packages" PR
# → Review and merge Version PR
# → ✨ Auto-publishes with @latest tag
```

## 📝 Conventional Commit Types

| Type | Description | Version Bump | Example |
|------|-------------|--------------|---------|
| `feat` | New feature | Minor | `feat: Add WebSocket support` |
| `fix` | Bug fix | Patch | `fix: Resolve memory leak` |
| `docs` | Documentation | None | `docs: Update API guide` |
| `refactor` | Code refactoring | None | `refactor: Simplify router` |
| `perf` | Performance | Patch | `perf: Optimize query caching` |
| `test` | Tests | None | `test: Add integration tests` |
| `chore` | Maintenance | None | `chore: Update dependencies` |
| `ci` | CI/CD | None | `ci: Update workflow` |
| `build` | Build system | None | `build: Configure bundler` |

### Breaking Changes
Add `!` after type or `BREAKING CHANGE:` in footer → **Major** version bump

```
feat!: Redesign authentication API

BREAKING CHANGE: Authentication tokens now use JWT format
```

## 🏷️ NPM Tags

| Branch | NPM Tag | Installation |
|--------|---------|--------------|
| `main` | `latest` | `npm install @igniter-js/core` |
| `beta/*` | `beta` | `npm install @igniter-js/core@beta` |

## ⚡ Quick Troubleshooting

**PR validation failed?**
→ Check PR title follows Conventional Commits format

**Changeset not sure which bump?**
- New feature → `minor`
- Bug fix → `patch`
- Breaking change → `major`

**Want to publish manually?**
```bash
# Don't! Use the automated workflow
# But if you must:
npm run build
npx changeset publish
```

**Need to test locally?**
```bash
cd packages/core
npm link

cd ~/my-test-project
npm link @igniter-js/core
```

## 📚 Full Documentation

- **Detailed Guide**: [RELEASE.md](./RELEASE.md)
- **Changesets**: [.changeset/README.md](./.changeset/README.md)
- **Contributing**: [CONTRIBUTING.md](./CONTRIBUTING.md)

## 🆘 Help

Questions? Check:
1. [RELEASE.md](./RELEASE.md) for detailed workflows
2. [GitHub Discussions](https://github.com/felipebarcelospro/igniter-js/discussions)
3. [Changesets Docs](https://github.com/changesets/changesets)

---

**Remember**: All PRs to `main` must have Conventional Commit titles and changesets for package changes!

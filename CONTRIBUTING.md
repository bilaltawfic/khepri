# Contributing to Khepri

Thank you for your interest in contributing to Khepri! This document explains how to contribute effectively.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [AI Conversation Logging](#ai-conversation-logging)
- [Commit Convention](#commit-convention)
- [License Compliance](#license-compliance)
- [Pull Request Process](#pull-request-process)

## Code of Conduct

Be respectful, inclusive, and constructive. We're building something to help athletes train better - let's keep that positive energy in our community.

## Getting Started

1. Fork the repository
2. Clone your fork
3. Install dependencies: `pnpm install`
4. Create a feature branch: `git checkout -b feat/my-feature`
5. Make your changes
6. Submit a pull request

## AI Conversation Logging

**This is required for all contributors.**

Khepri is built transparently with AI assistance. We log significant Claude conversations to help others learn how to build with AI.

### When to Log

Log conversations that:
- Make architectural decisions
- Implement significant features
- Solve tricky problems
- Produce interesting insights
- Fail in instructive ways (mistakes are valuable!)

Don't bother logging:
- Simple file edits
- Typo fixes
- Routine operations

### How to Log

1. Create a file in `claude-convos/YYYY-MM-DD/`
2. Name format: `YYYY-MM-DDTHH-MM-SSZ-short-description.md`
3. Use UTC timestamps
4. Follow the template in [claude-convos/README.md](./claude-convos/README.md)

### Example

```
claude-convos/2026-02-10/2026-02-10T14-30-00Z-add-wellness-slider.md
```

### Template

```markdown
# Session: [Short Description]

**Date:** 2026-02-10T14:30:00Z
**Duration:** ~30 minutes
**Agent(s) Used:** general-purpose

## Goal
Add a wellness slider component to the daily check-in screen.

## Key Prompts & Responses
[Include the important parts of your conversation]

## Outcome
- Created `WellnessSlider.tsx` component
- Added to check-in screen
- Wrote unit tests

## Learnings
- Breaking the task into smaller steps worked better
- Claude suggested using react-native-reanimated which we hadn't considered
```

## Commit Convention

We use [Conventional Commits](https://www.conventionalcommits.org/). All commits must follow this format:

```
type(scope): description
```

### Types

| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `style` | Formatting, no code change |
| `refactor` | Code restructuring |
| `perf` | Performance improvement |
| `test` | Adding tests |
| `build` | Build system changes |
| `ci` | CI configuration |
| `chore` | Maintenance tasks |

### Scopes

| Scope | Description |
|-------|-------------|
| `mobile` | React Native/Expo app |
| `core` | Shared packages |
| `ai-client` | AI/Claude integration |
| `supabase` | Database/backend |
| `mcp` | MCP servers |
| `docs` | Documentation |
| `deps` | Dependencies |

### Examples

```
feat(mobile): add daily check-in screen
fix(ai): correct CTL calculation in context builder
docs(readme): add installation instructions
chore(deps): update expo to v52
test(core): add unit tests for wellness calculations
refactor(supabase): simplify auth flow
```

## License Compliance

**This is required for all contributors.**

Before adding any dependency or copying code:

### Acceptable Licenses (no review needed)
- GPL-3.0 (same as ours)
- LGPL
- MIT
- Apache 2.0
- BSD (2-clause, 3-clause)
- ISC
- CC0 / Public Domain

### Note on GPL-3.0
Khepri is licensed under GPL-3.0, which is a copyleft license. This means:
- Derivative works must also be GPL-3.0
- Source code must be made available
- This is intentional - we want Khepri to remain open source
- Create an issue to discuss before adding

### Never Acceptable
- Proprietary licenses
- No license specified (assume all rights reserved)

### What to Do

1. Check the license of any library before adding it
2. If using GPL/LGPL/MPL, create an issue first
3. Document attribution requirements in `NOTICE.md`
4. Never copy code without verifying the license permits it

## Pull Request Process

1. **Create feature branch** from `main`
   ```bash
   git checkout -b feat/my-feature
   ```

2. **Make changes** with appropriate tests

3. **Verify license compatibility** for any new dependencies

4. **Log significant Claude conversations** to `claude-convos/`

5. **Run checks locally**
   ```bash
   pnpm lint
   pnpm typecheck
   pnpm test
   ```

6. **Commit with conventional format**
   ```bash
   git commit -m "feat(mobile): add wellness slider component"
   ```

7. **Push and create PR**
   ```bash
   git push origin feat/my-feature
   ```

8. **Fill out PR template** with:
   - Summary of changes
   - Related issues
   - Testing done
   - Screenshots (for UI changes)

9. **Wait for CI checks** - PRs require:
   - Conventional commit validation (commitlint)
   - GitHub Copilot code review

10. **Address review feedback** from both human and AI reviewers

11. **Squash and merge** with a conventional commit message

## CI/CD Pipeline

### Automated Checks

Every PR runs these checks:

| Check | Purpose |
|-------|---------|
| **Commitlint** | Validates commits follow conventional format |
| **Build & Test** | Builds the project and runs unit tests |
| **Claude Convos Check** | Reminds to log AI conversations for significant changes |
| **Copilot Review** | AI code review for suggestions and issues |

### GitHub Copilot Code Review

We use GitHub Copilot for automated code review. For repository maintainers:

1. Go to **Settings > Copilot > Code review**
2. Enable "Copilot code review"
3. Optionally enable auto-review on all PRs

If Copilot review doesn't trigger automatically, you can manually request it by adding `github-copilot[bot]` as a reviewer on the PR

## Questions?

Open an issue or start a discussion. We're happy to help!

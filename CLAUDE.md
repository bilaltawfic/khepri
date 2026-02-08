# Khepri - Project Instructions for Claude

This file contains instructions for Claude Code when working in this repository.

## Commit Convention

Always use conventional commits: `type(scope): description`

**Types:**
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation only
- `style` - Formatting, no code change
- `refactor` - Code restructuring
- `perf` - Performance improvement
- `test` - Adding tests
- `build` - Build system changes
- `ci` - CI configuration
- `chore` - Maintenance tasks

**Scopes:**
- `mobile` - React Native/Expo app
- `core` - Shared packages
- `ai-client` - AI/Claude integration
- `supabase` - Database/backend
- `mcp` - MCP servers
- `docs` - Documentation
- `deps` - Dependencies

**Examples:**
```
feat(mobile): add daily check-in screen
fix(ai): correct CTL calculation in context builder
docs(readme): add installation instructions
chore(deps): update expo to v52
```

## Code Style

- TypeScript strict mode everywhere
- Functional React components with hooks
- Use Biome for formatting (run `pnpm lint`)
- Prefer named exports over default exports

## Testing

- Run `pnpm test` before committing
- **Unit tests are required for all new code** - no exceptions
- Add tests for new features
- Maintain existing test coverage
- Bug fixes must include a test that would have caught the bug

## Pull Request Guidelines

### PR Size
- Keep PRs small and focused (aim for <200 lines changed)
- Each PR should do one thing well
- Atomic tasks = atomic PRs (see `claude-plan-detailed.md` for task breakdown)

### Copilot Code Review Workflow
After creating or updating a PR:
1. Wait ~3 minutes for Copilot to review (smaller PRs = faster reviews)
2. Check for comments: `gh api repos/bilaltawfic/khepri/pulls/{PR}/comments`
3. Address all comments with code changes
4. Reply to comments explaining what was done
5. Resolve threads via GraphQL: `resolveReviewThread(input: {threadId: "..."})`
6. Repeat until all comments are resolved

## License Compliance

- Always check the license of any library before adding it as a dependency
- Ensure library licenses are compatible with GPL-3.0 (our license)
- Acceptable licenses: GPL-3.0, LGPL, MIT, Apache 2.0, BSD, ISC, CC0
- Note: GPL-3.0 is copyleft - derivative works must also be GPL-3.0
- Never copy code from repositories without checking their license first
- Document any libraries with attribution requirements in NOTICE.md

## AI Transparency

- Log significant conversations to `claude-convos/`
- Include prompts that led to major decisions
- Format: `claude-convos/YYYY-MM-DD/YYYY-MM-DDTHH-MM-SSZ-description.md`

## Architecture

```
khepri/
├── apps/mobile/          # React Native + Expo app
├── packages/
│   ├── core/             # Shared types & utilities
│   ├── ai-client/        # Claude API wrapper
│   └── supabase-client/  # Database queries
├── supabase/             # Backend (functions, migrations)
├── mcp-servers/          # MCP server integrations
└── docs/                 # Documentation
```

## Common Commands

```bash
pnpm dev          # Start development
pnpm build        # Build all packages
pnpm test         # Run tests
pnpm lint         # Lint and format
pnpm typecheck    # Type checking
```

## Git Branch Management

Before starting a new PR, always clean up local branches:

```bash
# Fetch and prune deleted remote branches
git fetch origin --prune

# Switch to main and pull latest
git checkout main && git pull origin main

# Delete local branches that have been merged
# (branch shows as "gone" after fetch --prune)
git branch -vv | grep ': gone]' | awk '{print $1}' | xargs -r git branch -D
```

**Rules:**
- Always delete merged branches locally after PR is merged
- Never delete `main`
- Never delete unmerged branches without confirmation
- If a branch shows "not fully merged" but remote is gone and PR was merged (squash/rebase), it's safe to force delete with `git branch -D`

## Important Files

- `claude-plan.md` - The locked-in implementation plan (high-level)
- `claude-plan-detailed.md` - Granular task breakdown with 1-2 hour tasks
- `CONTRIBUTING.md` - Contribution guidelines
- `NOTICE.md` - Third-party license attributions

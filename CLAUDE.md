# Khepri - Project Instructions for Claude

## CRITICAL: Always Create a Pull Request

**NEVER commit directly to main.** All changes require a Pull Request.

**Complete workflow for every task:**
1. Create/use a feature branch
2. Implement with tests
3. Create conversation log in `claude-convos/YYYY-MM-DD/YYYY-MM-DDTHH-MM-SSZ-description.md`
4. Commit code + log together
5. Push and create PR: `git push -u origin <branch> && gh pr create`
6. Wait ~6 min for Copilot review, check: `gh api repos/{owner}/{repo}/pulls/<pr-number>/comments`
7. Address feedback, resolve threads, ensure all checks pass

**A task is NOT complete until the PR is created and passing CI.**

## Commit Convention

Format: `type(scope): description`

**Types:** feat, fix, docs, style, refactor, perf, test, build, ci, chore

**Scopes:** mobile, core, ai-client, supabase, mcp, docs, deps

## Code Style

- TypeScript strict mode
- Functional React components with hooks
- Biome for formatting (`pnpm lint`)
- Named exports over default exports

## Testing

- Run `pnpm test` before committing
- **Unit tests required for all new code** - no exceptions
- Bug fixes must include a regression test

## Pull Request Guidelines

- Keep PRs small (<200 lines) and focused
- Each PR does one thing well

### Copilot Review
Replying to review comments is pre-approved—do not ask for confirmation.

After creating a PR:
1. Check for comments: `gh api repos/{owner}/{repo}/pulls/<pr-number>/comments`
2. Address comments with code changes
3. Reply in the thread (not a standalone PR comment) explaining what was done
4. Resolve threads: `gh api graphql -f query='mutation { resolveReviewThread(input: {threadId: "..."}) { thread { isResolved } } }'`

## License Compliance

- Check library licenses before adding dependencies
- Compatible: GPL-3.0, LGPL, MIT, Apache 2.0, BSD, ISC, CC0
- Document attribution requirements in NOTICE.md

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

Before starting new work:
```bash
git fetch origin --prune
git checkout main && git pull origin main
git branch -vv | grep ': gone]' | awk '{print $1}' | xargs -r git branch -d
```

## Phase Completion Review

Run `/principal-review` at the end of each major phase. Address critical items with `/action-review` before the next phase.

## Important Files

- `plans/claude-plan.md` - Implementation plan
- `plans/claude-plan-detailed.md` - Task breakdown
- `CONTRIBUTING.md` - Contribution guidelines

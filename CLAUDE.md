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
- Add tests for new features
- Maintain existing test coverage

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

## Important Files

- `claude-plan.md` - The locked-in implementation plan
- `CONTRIBUTING.md` - Contribution guidelines
- `NOTICE.md` - Third-party license attributions

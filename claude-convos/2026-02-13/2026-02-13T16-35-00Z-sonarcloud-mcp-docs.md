# SonarCloud MCP Server Documentation

## Date
2026-02-13

## Goal
Add documentation for the SonarCloud MCP server setup to the README, enabling contributors to access code quality metrics directly in Claude Code.

## Key Decisions

1. **Placement in README** - Added as an "Optional" section after Quick Start, similar to how other optional developer tools are documented.

2. **Docker-based setup** - Documented the official `mcp/sonarqube` Docker image approach which is simpler than local installation.

3. **Organization access clarification** - Based on Copilot review feedback, clarified that contributors need access to the `bilaltawfic` SonarCloud organization to use this feature, since the purpose is accessing project-specific quality metrics.

## Files Changed

- `README.md` - Added SonarCloud MCP server setup section with prerequisites, configuration template, and usage information

## Learnings

- When documenting organization-specific tooling, it's important to clarify access requirements upfront so contributors don't waste time setting up tools they can't use.
- The `.mcp.json` file is already in `.gitignore`, making it safe to document token placement without risk of accidental commits.

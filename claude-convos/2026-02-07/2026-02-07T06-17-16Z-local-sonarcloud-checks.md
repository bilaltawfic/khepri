# Local SonarCloud Checks Setup

**Date:** 2026-02-07
**Goal:** Enable running SonarCloud-like checks locally to shorten feedback loops

## Context

User wanted to run SonarCloud analysis locally instead of waiting for PR CI actions.

## Research Findings

Searched SonarSource documentation and found:

1. **SonarQube for IDE (formerly SonarLint)** - Official recommendation for local analysis
   - VS Code extension with real-time feedback
   - Connected Mode syncs with SonarCloud project
   - Cannot be invoked by Claude Code (IDE extension only)

2. **sonar-scanner CLI** - Designed to upload to SonarCloud/SonarQube Server
   - No true offline mode (removed by SonarSource)
   - Replaced by SonarLint for local analysis

3. **Local SonarQube Server (Docker)** - Full local experience
   - Requires running Docker container
   - Heavier weight solution

4. **ESLint + eslint-plugin-sonarjs** - CLI-based SonarJS rules
   - Can be run by Claude Code before commits
   - Uses actual SonarSource rules
   - Lightweight, integrates with existing tooling

## Decision

Chose **Option 4 (ESLint + SonarJS plugin)** because:
- Claude Code can run it via CLI before commits
- Uses official SonarSource rules
- Lightweight - no Docker or server required
- Integrates with existing pnpm scripts

## Implementation

### Files Changed

1. **package.json** - Added dependencies and script:
   - `eslint@^9.39.2`
   - `@eslint/js@^9.39.2`
   - `eslint-plugin-sonarjs@^3.0.6`
   - `typescript-eslint@^8.54.0`
   - New script: `pnpm lint:sonar`

2. **eslint.config.js** - New ESLint flat config:
   - TypeScript + JSX parsing support
   - SonarJS recommended rules
   - Custom rules set to warning level for active development
   - Disabled rules that conflict with Biome

### Rules Configuration

Set to **warning** (not error) for active development:
- `sonarjs/cognitive-complexity` - threshold 15
- `sonarjs/no-duplicate-string` - threshold 3 occurrences
- `sonarjs/todo-tag` - TODOs expected during development
- `sonarjs/fixme-tag` - FIXMEs expected during development
- `sonarjs/no-invariant-returns` - Stub functions allowed
- `sonarjs/pseudo-random` - Math.random() fine for non-crypto

## Usage

```bash
# Run SonarJS checks locally
pnpm lint:sonar

# Example output
✖ 96 problems (0 errors, 96 warnings)
```

## Sources

- [SonarQube for IDE Connected Mode](https://docs.sonarsource.com/sonarqube-cloud/improving/connected-mode)
- [SonarScanner CLI Documentation](https://docs.sonarsource.com/sonarqube-cloud/advanced-setup/ci-based-analysis/sonarscanner-cli)
- [Sonar Community: Offline mode discussion](https://community.sonarsource.com/t/run-sonar-scanner-against-code-locally-that-has-not-been-committed/30525)

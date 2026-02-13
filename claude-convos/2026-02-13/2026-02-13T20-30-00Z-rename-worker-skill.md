# Rename worker-start to worker-go and make it end-to-end

**Date:** 2026-02-13

## Goals

- Ensure `/worker-start` always completes the full PR lifecycle (not just implementation)
- Rename the skill from `worker-start` to `worker-go`
- Remove the now-redundant `worker-done` skill

## Key Decisions

1. **Merged worker-done into worker-start** - The original worker-start stopped at "Begin Implementation" and relied on the user to manually invoke `/worker-done` and `/check-pr`. Now all phases are in one skill.
2. **Added Phase 4: Ensure PR is Mergeable** - Explicit steps for CI checks, SonarCloud issues, Copilot comment resolution, and a retry loop until everything passes.
3. **Deleted worker-done** - Every step it covered is now in worker-go, which goes further (SonarCloud, thread resolution, retry loop).
4. **Renamed to worker-go** - Shorter, reflects that it's the single command to "go" on a task.

## Files Changed

- `.claude/skills/worker-go/SKILL.md` - New skill combining worker-start + worker-done + check-pr lifecycle
- `.claude/skills/worker-start/SKILL.md` - Deleted (replaced by worker-go)
- `.claude/skills/worker-done/SKILL.md` - Deleted (redundant)

## Learnings

1. Skills that stop mid-workflow lead to incomplete PRs — always include the full lifecycle in one skill
2. Adding allowed-tools (`Write`, `Edit`, `mcp__sonarqube__search_sonar_issues_in_projects`) is necessary for the PR review phase

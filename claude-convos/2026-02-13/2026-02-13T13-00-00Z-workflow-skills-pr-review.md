# Workflow Skills PR Review Fixes

**Date:** 2026-02-13
**PR:** #52 - feat(docs): add workflow automation skills for Claude Code

## Goals

- Check PR #52 status using `/check-pr` skill
- Address all Copilot review comments
- Enhance the check-pr skill to auto-fix issues

## Key Decisions

1. **TodoWrite tool added to worker-start** - Copilot noted that Step 5 referenced TodoWrite but it wasn't in `allowed-tools`

2. **PR number capture added to worker-done** - Added explicit step to capture PR number via `gh pr view --json number,url -q '.number'` after creating PR

3. **Safe delete in cleanup-branches** - Changed `git branch -D` (force) to `git branch -d` (safe) to avoid deleting unmerged work

4. **SonarCloud terminology clarified** - Fixed inconsistent "SonarQube MCP tool" reference to "SonarCloud MCP tool"

5. **Enhanced check-pr skill** - Added automated fix workflow:
   - Steps 7-11 now handle fixing issues, committing, pushing
   - Added Edit tool to allowed-tools
   - Auto-resolves Copilot comment threads after fixing

## Files Changed

- `.claude/skills/worker-start/SKILL.md` - Added TodoWrite to allowed-tools
- `.claude/skills/worker-done/SKILL.md` - Added PR number capture step
- `.claude/skills/cleanup-branches/SKILL.md` - Changed -D to -d for safe delete
- `.claude/skills/check-pr/SKILL.md` - Clarified terminology + added auto-fix workflow
- `.claude/skills/log-convo/SKILL.md` - New skill to log conversations to claude-convos
- `.github/workflows/claude-convos-check.yml` - Now requires log for ALL PRs (not just code directories)
- `README.md` - Added Claude Code Skills section documenting all 7 commands

## Learnings

1. **Claude Code skills** - The `allowed-tools` frontmatter must include ALL tools referenced in the skill steps
2. **Copilot review workflow** - Use GraphQL `resolveReviewThread` mutation with thread IDs (not comment IDs) to resolve threads
3. **CI consistency** - Previous claude-convos check was too narrow (only apps/packages/supabase) - now checks all PRs for transparency

# Add Principal Review Skills

**Date:** 2026-02-13T18:15:00Z

## Goals
- Create a `/principal-review` skill for periodic project health assessments
- Create a `/action-review` skill to work through review action items
- Establish `plans/review-outcomes/` directory for storing reviews

## Key Decisions

1. **Skill Scope**: The principal review covers both administrative health (CI/tests/lint) and architectural concerns (security, DDD, modularization)

2. **Action Item Format**: Used priority prefixes (CRIT/HIGH/MED/LOW) with numbered IDs for easy reference and tracking

3. **Review Output Location**: `plans/review-outcomes/YYYY-MM-DD-review.md` to keep reviews alongside project plans

4. **Action Review Modes**: Supports three modes - full review by date, single item by ID, or interactive (most recent)

## Files Changed
- `.claude/skills/principal-review/SKILL.md` - New skill for project reviews
- `.claude/skills/action-review/SKILL.md` - New skill to action review items
- `.claude/skills/plan-next/SKILL.md` - Updated to run cleanup-branches first
- `.claude/skills/worker-start/SKILL.md` - Updated to run cleanup-branches first
- `.claude/settings.json` - Shared project-wide Claude settings
- `.gitignore` - Added `.claude/settings.local.json` to ignore user-specific settings
- `CLAUDE.md` - Added phase completion review requirement
- `plans/review-outcomes/README.md` - Documentation for review outcomes directory

## Learnings
- Skills use YAML frontmatter for metadata (name, description, allowed-tools)
- The project has specific allowed scopes for PR titles (mobile, core, ai-client, supabase, mcp, docs, deps)
- "skills" is not a valid scope; used "docs" instead since these are documentation/process files
- Skills in `.claude/skills/` are already tracked in git and shared with contributors
- `settings.local.json` should stay user-specific (in .gitignore); `settings.json` for shared project settings
- Embedding cleanup steps in other skills ensures git hygiene without requiring explicit invocation

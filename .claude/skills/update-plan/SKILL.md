---
name: update-plan
description: Create a PR to update phase plan documents with current progress
disable-model-invocation: true
allowed-tools: Read, Glob, Grep, Bash, Write, Edit
---

# Update Plan Progress

Create a PR to update all phase plan documents with current completion status.

## Steps

### 1. Ensure Clean State

```bash
git checkout main
git pull origin main
git status
```

### 2. Create Documentation Branch

```bash
git checkout -b docs/update-phase-{N}-status
```

### 3. Analyze Completed Work

Check git log and merged PRs to identify what's been completed:
```bash
gh pr list --state merged --limit 20 --json number,title,mergedAt
git log --oneline -20
```

### 4. Update Plan Files

Update the following files with accurate status:

**Main tracker** (`plans/claude-plan-detailed.md`):
- Mark completed tasks with checkmarks
- Add PR numbers to completed tasks
- Update phase status (Not Started / In Progress / Complete)

**Phase-specific plans** (`plans/phase-{N}/*.md`):
- Update task status in each workstream file
- Add completion notes where relevant
- Mark completed subphase plans as done

### 5. Preserve Subphase Plans

Do **NOT** delete subphase plan files — they are referenced by conversation logs and serve as historical records. Leave all files in `plans/phase-{N}/subphases/` in place.

### 6. Commit and Push

```bash
git add plans/
git commit -m "docs(plans): update phase {N} status with completed PRs"
git push -u origin docs/update-phase-{N}-status
```

### 7. Create PR

```bash
gh pr create --title "docs(plans): update phase {N} completion status" --body "$(cat <<'EOF'
## Summary
- Updated task completion status in plan documents
- Added PR numbers to completed tasks
- Marked completed subphase plans as done

## Changes
- [List specific files updated]

Generated with Claude Code
EOF
)"
```

### 8. Report

Provide summary of:
- Current phase completion percentage
- Tasks remaining in current phase
- Next phase readiness

---
name: action-review
description: Work through action items from a principal engineer review
argument-hint: <review-date-or-item-id>
disable-model-invocation: true
allowed-tools: Bash, Read, Edit, Write, Glob, Grep
---

# Action Review Items

Work through action items from a principal engineer review outcome. Can address all items from a review or a specific item by ID.

**Argument:** $ARGUMENTS (either a date like `2026-02-13` or item ID like `CRIT-001`)

## Steps

### 1. Load Review Outcome

If argument is a date, load the review file:
```
plans/review-outcomes/YYYY-MM-DD-review.md
```

If argument is an item ID (e.g., `CRIT-001`, `HIGH-002`), find the most recent review containing that item.

If no argument provided, use the most recent review:
```bash
ls -t plans/review-outcomes/*-review.md 2>/dev/null | head -1
```

### 2. Parse Action Items

Read the review file and identify all unchecked action items:
- `[ ]` = not started
- `[x]` = completed

Group by priority: Critical > High > Medium > Low

### 3. Work Through Items

For each unchecked item, in priority order:

#### 3.1 Understand the Issue

Read the referenced file(s) and understand the context of the issue.

#### 3.2 Implement the Fix

Make the necessary code changes following project conventions:
- Run lint after changes: `pnpm lint`
- Run tests if applicable: `pnpm test`
- Ensure changes don't break the build

#### 3.3 Mark as Complete

Update the review file to mark the item as done:
```markdown
- [x] **[ITEM-ID]** [Description] - *Affects: [area]* ✓ Fixed in commit abc123
```

### 4. Commit Changes

After addressing items, commit with appropriate message:
```bash
git add <changed-files>
git commit -m "$(cat <<'EOF'
fix: address review items [ITEM-IDs]

- [List of fixes made]

Review: plans/review-outcomes/YYYY-MM-DD-review.md

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

### 5. Summary Report

After completing work:

1. List items addressed
2. List items remaining (if any)
3. Note any items that couldn't be addressed (and why)
4. Recommend next steps

## Modes

### Full Review Mode (date argument)

Address all items from a specific review, working through priority order.
Stop after addressing all critical and high priority items, or after 1 hour of work.

### Single Item Mode (item ID argument)

Address only the specific item identified.
Useful for focused fixes or when items have dependencies.

### Interactive Mode (no argument)

Show the most recent review summary and ask which items to address.

## Notes

- Always verify changes with lint and tests before committing
- Some items may require multiple commits
- If an item is blocked, note the blocker in the review file
- Large refactoring items should become their own branches/PRs
- Update the review file as you work to track progress

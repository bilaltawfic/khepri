---
name: worker-go
description: Start work on a task — implement, create PR, and ensure it's mergeable
argument-hint: <branch-name>
disable-model-invocation: true
allowed-tools: Bash, Read, Write, Edit, Glob, Grep, TodoWrite, mcp__sonarqube__search_sonar_issues_in_projects
---

# Start Worker Task

Switch to a task branch, implement the work, create a PR, and ensure it's mergeable.

**A task is NOT complete until the PR is created, all checks pass, and all review comments are resolved.**

**Branch:** $ARGUMENTS

## Phase 1: Setup

### 0. Clean Up Git State (REQUIRED)

Before starting work, run the `/cleanup-branches` skill to clean up merged branches.

This ensures we don't have stale local branches cluttering the workspace. Using the `/cleanup-branches` skill keeps cleanup behavior consistent across skills.

### 1. Fetch Latest and Switch Branch

```bash
git fetch origin
git checkout $ARGUMENTS
git pull origin $ARGUMENTS
```

### 2. Find and Read the Plan

Look for the plan file in `plans/phase-*/subphases/`:
```bash
find plans -name "*.md" -path "*/subphases/*" | head -10
```

Read the plan file that corresponds to this branch/task.

### 3. Understand the Context

From the plan, identify:
- **Goal**: What this task accomplishes
- **Files to Create**: New files needed
- **Files to Modify**: Existing files to change
- **Dependencies**: What packages/hooks this builds on
- **Testing Requirements**: What tests to write

### 4. Read Relevant Existing Files

Read the files that will be modified to understand current state.
Read related files mentioned in the plan for patterns to follow.

### 5. Create Todo List

Use the TodoWrite tool to create a task list based on the plan's steps. Include these post-implementation tasks:
- "Run all checks (lint, test, typecheck, build)"
- "Create conversation log"
- "Commit and push changes"
- "Create pull request"
- "Wait for CI and address review feedback"
- "Ensure PR is mergeable"

## Phase 2: Implementation

### 6. Implement the Feature

Start with the first task in the plan. Follow these patterns:
- Write tests alongside implementation (not after)
- Follow existing code patterns in the codebase
- Use conventional commits for each logical change
- Keep changes focused on the task scope

## Phase 3: Verification and PR

### 7. Run All Checks Locally

Run all checks and fix any failures before proceeding:
```bash
pnpm lint
pnpm test
pnpm typecheck
pnpm build
```

If any check fails, fix the issue and re-run. Do NOT proceed until all checks pass.

### 8. Create Conversation Log

Create a conversation log for AI transparency (required by CI):

```bash
mkdir -p claude-convos/$(date -u +"%Y-%m-%d")
```

Create a file at `claude-convos/YYYY-MM-DD/YYYY-MM-DDTHH-MM-SSZ-<description>.md` with:
- Goals, Key Decisions, Files Changed, Learnings

### 9. Commit and Push

```bash
git add <specific-files>
git commit -m "$(cat <<'EOF'
type(scope): description

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
git push -u origin $ARGUMENTS
```

### 10. Create Pull Request

```bash
gh pr create --title "type(scope): short description" --body "$(cat <<'EOF'
## Summary
- [What this PR does]

## Test plan
- [ ] Tests pass locally
- [ ] Lint passes
- [ ] Build succeeds

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

Capture the PR number:
```bash
gh pr view --json number,url -q '.number'
```

## Phase 4: Ensure PR is Mergeable (REQUIRED)

**Do NOT stop after creating the PR. You MUST complete this phase.**

### 11. Wait for CI and Copilot Review

Wait ~3 minutes, then check build status:
```bash
gh pr checks <pr-number>
```

If checks are failing, investigate and fix the failures, then push again.

### 12. Check for SonarCloud Issues

Use the SonarCloud MCP tool (`mcp__sonarqube__search_sonar_issues_in_projects`) to check for issues.
Any issues with severity > INFO (MEDIUM, HIGH, BLOCKER) must be fixed.

### 13. Check for Copilot Review Comments

After ~6 minutes total from PR creation, check for review comments:
```bash
gh api repos/bilaltawfic/khepri/pulls/<pr-number>/comments
```

For each unresolved comment:
1. Read the file and understand the feedback
2. Make the necessary code fix using the Edit tool
3. Reply to the comment explaining what was done:
   ```bash
   gh api repos/bilaltawfic/khepri/pulls/comments/<comment-id>/replies -f body="Fixed: [explanation]"
   ```

### 14. Resolve Comment Threads

Query thread IDs:
```bash
gh api graphql -f query='
query {
  repository(owner: "bilaltawfic", name: "khepri") {
    pullRequest(number: <pr-number>) {
      reviewThreads(first: 20) {
        nodes {
          id
          isResolved
          comments(first: 1) {
            nodes { path }
          }
        }
      }
    }
  }
}'
```

Resolve each unresolved thread:
```bash
gh api graphql -f query='mutation { resolveReviewThread(input: {threadId: "THREAD_ID"}) { thread { isResolved } } }'
```

### 15. Push Fixes and Re-verify

If any fixes were made:
```bash
git add <changed-files>
git commit -m "$(cat <<'EOF'
fix: address PR review feedback

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
git push origin HEAD
```

Wait ~3 minutes and re-check:
```bash
gh pr checks <pr-number>
```

**Repeat steps 11-15 until all checks pass and all comments are resolved.**

### 16. Final Status Report

Confirm the PR is mergeable by reporting:
- **PR**: #number - URL
- **Build Status**: All checks passing
- **SonarCloud**: No issues above INFO
- **Copilot Comments**: All resolved
- **Mergeable**: Yes

If the PR is NOT mergeable, explain what's blocking it and continue fixing.

## Important Reminders

- Run `pnpm lint` before committing
- Run `pnpm test` to verify tests pass
- Mark component props as `readonly`
- Add `accessibilityRole` to interactive elements
- Use `!= null` for nullish checks (not truthy checks)
- Use `.js` extensions in ESM import paths (including test files)
- Validate external data before type assertions
- Guard against division by zero and null values

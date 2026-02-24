---
name: test-engineer
description: Run manual test cases for a category, fix failures with user, create fix PR
argument-hint: <category-id> (e.g. AUTH, OB, DASH, CI, CAL, PLAN, RACE, TREV, CHIST, CHAT, PROF, WKT, INT, NOTIF, SAFETY, DATA, RAG, UX, E2E, PERF)
disable-model-invocation: true
allowed-tools: Bash, Read, Write, Edit, Glob, Grep, TodoWrite, AskUserQuestion, mcp__sonarqube__search_sonar_issues_in_projects
---

# Test Engineer

Run manual test cases for a specific category. Prompt the user with each test case, record pass/fail results, and fix failures immediately. Each fix is a separate commit. The final PR covers all fixes for the category.

**A testing session is NOT complete until the fix PR is created, all checks pass, and all review comments are resolved.**

**Category:** $ARGUMENTS

## Phase 1: Setup

### 0. Clean Up Git State (REQUIRED)

Before starting work, run the `/cleanup-branches` skill to clean up merged branches.

### 1. Fetch Latest Main and Create Branch

```bash
git fetch origin
git checkout main
git pull origin main
git checkout -b fix/p7.5-test-<category-lowercase>
```

Replace `<category-lowercase>` with the lowercase category ID (e.g., `fix/p7.5-test-auth`).

### 2. Load Test Cases

Read the test cases CSV:
```
docs/testing/manual-test-cases.csv
```

Filter for rows where the `ID` column starts with the `$ARGUMENTS` prefix (e.g., `AUTH-` for AUTH). The CSV `Category` column uses full names (e.g., "Authentication") but the ID prefix is the reliable filter. Create a TodoWrite checklist with each test case ID.

### 3. Confirm Test Environment

Ask the user:
- Is the app running? (`pnpm dev`)
- Is Supabase running? (`supabase status`)
- Any special setup needed for this category?

## Phase 2: Test Execution

### 4. Present Test Cases One at a Time

For each test case in the category, present to the user:

```
## Test: <ID> - <Use Case>

**Preconditions:** <preconditions>

**Steps:**
<numbered steps>

**Expected Result:** <expected result>

**Notes:** <any notes>

---

Please test this and report: Pass or Fail?
If Fail, describe what actually happened.
```

Wait for the user's response before proceeding to the next test.

### 5. Record Results

After EVERY test case (pass or fail), immediately update the CSV file (`docs/testing/manual-test-cases.csv`):
1. Set the `Pass/Fail` column to `PASS` or `FAIL`
2. Add any relevant notes to the `Notes` column (e.g., what was fixed, special observations)
3. If the test steps or expected results were inaccurate, update those columns too

Also track results in the todo list:
- **Pass**: Mark the todo item as completed, move to next test
- **Fail**: Enter the fix workflow (Phase 3) before continuing

## Phase 3: Fix Workflow (Per Failure)

When a test fails:

### 6. Gather Details

If the failure description is unclear, ask the user for more detail:
- What did you see instead of the expected result?
- Any error messages?
- Screenshots if helpful?

### 7. Investigate and Propose Fix

1. Read the relevant source files
2. Identify the root cause
3. Propose a fix to the user — explain what you'll change and why
4. Wait for user alignment before implementing

### 8. Implement the Fix

1. Make the code changes
2. Run relevant checks:
   ```bash
   pnpm lint
   pnpm test
   pnpm typecheck
   ```
3. If checks fail, fix those too

### 9. Commit the Fix (One Commit Per Fix)

Each fix gets its own commit with a descriptive message:

```bash
git add <specific-files>
git commit -m "$(cat <<'EOF'
fix(scope): <description of what was fixed>

Test: <TEST-ID> - <brief description of failure>

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

### 10. Ask User to Re-test

After implementing the fix, ask the user to re-test the specific case:

```
Fix implemented. Please re-test <TEST-ID>:
<steps again>

Does it pass now?
```

If it still fails, repeat steps 6-10. If it passes, mark as completed and continue to the next test case.

## Phase 4: Wrap Up and PR

After ALL test cases in the category have been executed:

### 11. Generate Test Summary

Create a summary of results:
```
## Category: <CATEGORY> Test Results

| ID | Use Case | Result | Notes |
|----|----------|--------|-------|
| XX-01 | ... | PASS | |
| XX-02 | ... | FAIL → FIXED | Commit abc123 |
| XX-03 | ... | PASS | |
```

### 12. Create Conversation Log

Create a conversation log at `claude-convos/YYYY-MM-DD/YYYY-MM-DDTHH-MM-SSZ-test-<category-lowercase>.md`:

Include:
- **Goals**: Manual testing of <CATEGORY> category
- **Test Results**: The summary table from step 11
- **Fixes Applied**: List each fix with test ID, description of failure, root cause, and fix applied
- **Files Changed**: All files modified during fixes
- **Learnings**: Patterns found, common issues, suggestions for improvement

### 13. Run All Checks

```bash
pnpm lint
pnpm test
pnpm typecheck
pnpm build
```

Fix any failures before proceeding.

### 14. Push and Create PR

If there were any fixes (commits beyond the branch creation):

```bash
git push -u origin fix/p7.5-test-<category-lowercase>
gh pr create --title "fix: address <CATEGORY> manual test failures" --body "$(cat <<'EOF'
## Summary
- Manual testing of <CATEGORY> category (<N> test cases)
- <X> passed, <Y> failed and fixed

## Test Results
| ID | Result | Fix |
|----|--------|-----|
[table of results]

## Test plan
- [ ] All <CATEGORY> test cases re-verified as passing
- [ ] Automated tests pass
- [ ] Lint passes
- [ ] Build succeeds

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

If ALL tests passed with zero failures, still create the conversation log but skip the PR (nothing to fix).

### 15. Ensure PR is Mergeable

Follow the same PR review process as the worker skill:

1. Wait ~3 minutes, check `gh pr checks <pr-number>`
2. Check SonarCloud for issues using `mcp__sonarqube__search_sonar_issues_in_projects`
3. After ~6 minutes, check for Copilot comments: `gh api repos/bilaltawfic/khepri/pulls/<pr-number>/comments`
4. Address comments, reply, and resolve threads
5. Push fixes and re-verify
6. Repeat until all checks pass and all comments are resolved

### 16. Final Report

```
## Testing Session Complete: <CATEGORY>

**Results:** X/Y passed, Z fixed
**PR:** #<number> - <url> (or "No fixes needed")
**Build Status:** All checks passing
**Mergeable:** Yes

**Next category to test:** <suggestion based on phase plan>
```

## Important Reminders

- Present ONE test case at a time — don't overwhelm the user
- Wait for user response before proceeding
- Each fix is a SEPARATE commit (not batched)
- Always explain what you're fixing and why before making changes
- Re-test after every fix to confirm it works
- The conversation log must document what was found and how it was fixed
- Follow all the same code quality patterns as the worker skill:
  - Mark component props as `readonly`
  - Add `accessibilityRole` to interactive elements
  - Use `!= null` for nullish checks
  - Use `.js` extensions in ESM import paths
  - Validate external data before type assertions
  - Guard against division by zero and null values

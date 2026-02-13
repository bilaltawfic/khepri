---
name: check-pr
description: Check PR status including SonarCloud issues and Copilot review comments
argument-hint: <pr-number>
disable-model-invocation: true
allowed-tools: Bash, Read, Edit, mcp__sonarqube__search_sonar_issues_in_projects
---

# Check Pull Request Status

Comprehensively check a PR's status including CI checks, SonarCloud issues, and Copilot review comments. Automatically fix issues and push changes.

**PR Number:** $ARGUMENTS

## Steps

### 1. Get PR Overview

```bash
gh pr view $ARGUMENTS --json state,mergeable,statusCheckRollup,reviews,title,headRefName
```

### 2. Check CI Build Status

```bash
gh pr checks $ARGUMENTS
```

If any checks are failing, investigate the failure details.

### 3. Check SonarCloud Issues

Use the SonarCloud MCP tool (`mcp__sonarqube__search_sonar_issues_in_projects`) to search for issues:
- Filter by severity: HIGH, BLOCKER (must fix), MEDIUM (should fix)
- Ignore INFO level unless specifically asked
- Check if any new issues were introduced

If issues exist with severity > INFO, list them with:
- File and line number
- Issue description
- Suggested fix

### 4. Check Copilot Review Comments

Fetch all review comments on the PR:
```bash
gh api repos/bilaltawfic/khepri/pulls/$ARGUMENTS/comments
```

For each unresolved comment:
- Show the comment body
- Show the file and line it references
- Assess if it needs code changes or just a reply

### 5. Check for Pending Reviews

```bash
gh api repos/bilaltawfic/khepri/pulls/$ARGUMENTS/reviews
```

### 6. Summary Report

Provide a clear summary:
- **Build Status**: Passing/Failing
- **SonarCloud**: X issues (Y blocking, Z should fix)
- **Copilot Comments**: X unresolved comments
- **Mergeable**: Yes/No
- **Action Required**: List specific actions needed before merge

## Fixing Issues (Automated)

If there are Copilot comments or SonarCloud issues to address:

### 7. Fix All Issues

For each issue identified:
1. Read the relevant file
2. Make the necessary code changes using Edit tool
3. Track what was changed

### 8. Commit and Push Fixes

After making all fixes:
```bash
git add <changed-files>
git commit -m "$(cat <<'EOF'
fix: address PR review feedback

- [List of fixes made]

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
git push origin HEAD
```

### 9. Reply to Copilot Comments

For each comment that was addressed, reply explaining what was done:
```bash
gh api repos/bilaltawfic/khepri/pulls/$ARGUMENTS/comments/<comment-id>/replies -f body="Fixed: [explanation of fix]"
```

### 10. Resolve Comment Threads

After addressing comments, resolve the threads:
```bash
gh api graphql -f query='mutation { resolveReviewThread(input: {threadId: "THREAD_ID"}) { thread { isResolved } } }'
```

### 11. Wait for CI and Re-check

Wait ~3 minutes for CI to run on the new changes, then re-check:
```bash
gh pr checks $ARGUMENTS
```

If all checks pass and no new comments, report that the PR is ready for merge.
If new issues arise, repeat the fix cycle.

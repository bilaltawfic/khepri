---
name: check-pr
description: Check PR status including SonarCloud issues and Copilot review comments
argument-hint: <pr-number>
disable-model-invocation: true
allowed-tools: Bash, Read, mcp__sonarqube__search_sonar_issues_in_projects
---

# Check Pull Request Status

Comprehensively check a PR's status including CI checks, SonarCloud issues, and Copilot review comments.

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

Use the SonarQube MCP tool to search for issues:
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

## After Addressing Issues

If code changes were made:
1. Push the changes
2. Wait ~2-3 minutes for CI
3. Run `/check-pr $ARGUMENTS` again

To resolve Copilot comment threads after addressing:
```bash
gh api graphql -f query='mutation { resolveReviewThread(input: {threadId: "THREAD_ID"}) { thread { isResolved } } }'
```

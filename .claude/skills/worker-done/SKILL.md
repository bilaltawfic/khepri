---
name: worker-done
description: Complete worker task by creating PR and checking review status
disable-model-invocation: true
allowed-tools: Bash, Read, Write
---

# Complete Worker Task

Finish the current task by committing, pushing, creating a PR, and checking its status.

## Steps

### 1. Verify Work is Complete

Run all checks locally:
```bash
pnpm lint
pnpm test
pnpm typecheck
pnpm build
```

Fix any failures before proceeding.

### 2. Check Git Status

```bash
git status
git diff --stat
```

Ensure all intended changes are staged and no unintended files are included.

### 3. Commit Changes

If there are uncommitted changes, commit them with conventional commit format:
```bash
git add <specific-files>
git commit -m "$(cat <<'EOF'
type(scope): description

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

### 4. Push Branch

```bash
git push origin HEAD
```

### 5. Create Pull Request and Capture PR Number

```bash
gh pr create --title "type(scope): short description" --body "$(cat <<'EOF'
## Summary
- [What this PR does]

## Test plan
- [ ] Tests pass locally
- [ ] Lint passes
- [ ] Build succeeds

Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

After creating the PR, capture the PR number:
```bash
gh pr view --json number,url -q '.number'
```

Store this number to use in subsequent commands.

### 6. Wait for Initial Checks

Wait approximately 2-3 minutes for CI to start, then check status using the captured PR number:
```bash
gh pr checks <captured-pr-number>
```

### 7. Initial Review Check

After ~6 minutes, check for Copilot review comments using the captured PR number:
```bash
gh api repos/bilaltawfic/khepri/pulls/<captured-pr-number>/comments
```

### 8. Report PR Status

Provide:
- PR number and URL
- Build status
- Any immediate issues to address

## Next Steps

Inform user that they should:
1. Wait for full CI completion (~5 min)
2. Run `/check-pr <number>` to see full status
3. Address any Copilot comments or SonarCloud issues
4. Merge when all checks pass

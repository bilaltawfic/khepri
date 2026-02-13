---
name: cleanup-branches
description: Delete merged git branches and sync with main
disable-model-invocation: true
allowed-tools: Bash
---

# Cleanup Merged Branches

Clean up local git state after PRs have been merged.

## Steps

1. **Fetch and prune deleted remote branches:**
   ```bash
   git fetch origin --prune
   ```

2. **Switch to main and pull latest:**
   ```bash
   git checkout main && git pull origin main
   ```

3. **Delete local branches that have been merged** (branch shows as "gone" after fetch --prune):
   ```bash
   git branch -vv | grep ': gone]' | awk '{print $1}' | xargs -r git branch -d
   ```

4. **Show current branch status:**
   ```bash
   git branch -vv
   ```

5. **Report what was cleaned up** and confirm we're on main with a clean state.

## Important

- NEVER delete `main`
- NEVER delete unmerged branches without user confirmation
- If a branch shows "not fully merged" but remote is gone and PR was merged (squash/rebase), it's safe to force delete

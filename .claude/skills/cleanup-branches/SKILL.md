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
   git branch -vv | grep ': gone]' | awk '{print $1}' | while read branch; do git branch -d "$branch"; done
   ```

4. **Show current branch status:**
   ```bash
   git branch -vv
   ```

5. **Report what was cleaned up** and confirm we're on main with a clean state.

## Important

- NEVER delete `main`
- NEVER delete unmerged branches (including with `git branch -D`) without explicit user confirmation
- If a branch shows "not fully merged" but the remote is gone and you have verified that the PR was merged (e.g., via squash/rebase and the changes are present on `main`), you may optionally force-delete it with `git branch -D <branch-name>` - this still counts as deleting an unmerged branch and must only be done after explicit user confirmation

# Switch from Commit Linting to PR Title Validation

**Date:** 2026-02-05
**Branch:** ci/add-pr-checks
**PR:** #2

## Context

The PR #2 added CI workflows for conventional commits and AI review. The commitlint workflow was failing because it validated every individual commit, but the project uses squash merges.

## Decision

Switch from `wagoid/commitlint-github-action` (validates all commits) to `amannn/action-semantic-pull-request` (validates PR titles only).

**Rationale:** Since PRs are squash-merged, only the PR title matters for the final commit message. Validating individual commits during development is unnecessary friction.

## Changes Made

1. **Updated `.github/workflows/commitlint.yml`**
   - Renamed workflow from "Lint Commits" to "Lint PR Title"
   - Replaced commitlint action with action-semantic-pull-request
   - Added trigger types: `opened, edited, synchronize, reopened`
   - Configured allowed types and scopes inline (no external config needed)

2. **Deleted `.commitlintrc.json`**
   - No longer needed since config is in the workflow

3. **Updated `NOTICE.md`**
   - Changed dependency from commitlint-github-action to action-semantic-pull-request

## Commit

```
ci: switch to PR title validation for squash merges

Replace commitlint (which validated every commit) with
action-semantic-pull-request to validate PR titles only,
since we use squash merges.
```

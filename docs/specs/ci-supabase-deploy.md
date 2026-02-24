# Spec: GitHub Action for Supabase Deployment

## Overview

Create a GitHub Action workflow that automatically deploys Supabase database migrations and edge functions when changes are pushed to `main`.

## Trigger

The workflow should run on pushes to `main` when files in `supabase/` are modified:

```yaml
on:
  push:
    branches: [main]
    paths:
      - 'supabase/migrations/**'
      - 'supabase/functions/**'
      - 'supabase/config.toml'
```

Also support manual trigger (`workflow_dispatch`) for ad-hoc deployments.

## Required GitHub Secrets

These must be configured in the repository settings before the workflow will work:

| Secret | Description | How to Get |
|--------|-------------|------------|
| `SUPABASE_ACCESS_TOKEN` | Personal access token for Supabase CLI | [supabase.com/dashboard/account/tokens](https://supabase.com/dashboard/account/tokens) |
| `SUPABASE_PROJECT_REF` | Project reference ID (e.g., `abcdefgh`) | Supabase Dashboard > Settings > General |
| `SUPABASE_DB_PASSWORD` | Database password set during project creation | Set when creating the project |

## Workflow Steps

### Job: `deploy`

**Runs on:** `ubuntu-latest`

**Steps:**

1. **Checkout code**
   ```yaml
   - uses: actions/checkout@v4
   ```

2. **Install Supabase CLI**
   - Pin to a specific version (e.g., `v2.76.8`) for reproducible builds
   - Do NOT use `version: latest`
   ```yaml
   - uses: supabase/setup-cli@v1
     with:
       version: 2.76.8
   ```

3. **Link to Supabase project**
   ```yaml
   - run: supabase link --project-ref ${{ secrets.SUPABASE_PROJECT_REF }}
     env:
       SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
       SUPABASE_DB_PASSWORD: ${{ secrets.SUPABASE_DB_PASSWORD }}
   ```

4. **Push database migrations**
   - Only if migration files changed
   ```yaml
   - run: supabase db push
     env:
       SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
       SUPABASE_DB_PASSWORD: ${{ secrets.SUPABASE_DB_PASSWORD }}
   ```

5. **Deploy edge functions**
   - Only if function files changed
   ```yaml
   - run: supabase functions deploy
     env:
       SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
   ```

## Important Constraints

- **Pin the Supabase CLI version** — never use `latest` (per project conventions)
- **Secrets must NOT be logged** — use `env:` blocks, not inline `${{ secrets.X }}`
- **File:** `.github/workflows/deploy-supabase.yml`
- **Follows existing workflow patterns** — see `.github/workflows/test.yml` and `.github/workflows/integration-test.yml` for reference on Node version, pnpm setup, etc.

## Conditional Execution

Use path filters or `git diff` to only run relevant steps:

- If only `supabase/migrations/**` changed → run `db push` only
- If only `supabase/functions/**` changed → run `functions deploy` only
- If both changed → run both

One approach is to use `dorny/paths-filter@v3` action, or check with `git diff`:

```yaml
- name: Check changed paths
  id: changes
  uses: dorny/paths-filter@v3
  with:
    filters: |
      migrations:
        - 'supabase/migrations/**'
      functions:
        - 'supabase/functions/**'

- name: Push migrations
  if: steps.changes.outputs.migrations == 'true'
  run: supabase db push

- name: Deploy functions
  if: steps.changes.outputs.functions == 'true'
  run: supabase functions deploy
```

## Reference Files

Look at these existing workflows for patterns:
- `.github/workflows/test.yml` — basic CI setup
- `.github/workflows/integration-test.yml` — uses Supabase CLI, good reference for setup
- `.github/workflows/sonarcloud.yml` — secrets usage pattern

## Testing the Workflow

1. Create the workflow file on a feature branch
2. Merge to `main`
3. Check GitHub Actions tab for successful run
4. Verify in Supabase dashboard:
   - Migrations applied (check table structure)
   - Edge functions deployed (check Functions tab)

## Expected Output

A single workflow file: `.github/workflows/deploy-supabase.yml`

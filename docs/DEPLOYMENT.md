# Deployment Guide

This guide covers deploying the Khepri backend (Supabase) and mobile app.

## Architecture Overview

```
Mobile App (Expo Go / EAS Build)
    │
    ├── Supabase Auth (email/password)
    ├── Supabase Database (Postgres + pgvector)
    ├── Supabase Edge Functions (Deno)
    │     ├── ai-coach (Claude API)
    │     ├── ai-orchestrator (Claude API + MCP tools)
    │     ├── generate-embedding (OpenAI API)
    │     ├── semantic-search (OpenAI API)
    │     ├── credentials (AES-GCM encryption)
    │     ├── mcp-gateway (Intervals.icu proxy)
    │     └── generate-plan (training periodization)
    │
    └── Supabase Storage (future)
```

## Prerequisites

- [Supabase CLI](https://supabase.com/docs/guides/cli) installed (`brew install supabase/tap/supabase`)
- A [Supabase](https://supabase.com) account
- API keys: [Anthropic](https://console.anthropic.com/) and [OpenAI](https://platform.openai.com/)

## Step 1: Create Supabase Project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Click "New Project" (or restore a paused project)
3. Choose a name, database password, and region
4. Wait for the project to finish provisioning

Note down from **Settings > API**:
- **Project URL** (e.g., `https://abcdefgh.supabase.co`)
- **Publishable key** (cloud projects: `sb_publishable_...`; local dev: JWT starting with `eyJ...`)
- **Secret key** (cloud projects: `sb_secret_...`; local dev: JWT starting with `eyJ...` — keep secret)

Note from **Settings > General**:
- **Project Ref** (e.g., `abcdefgh`)

## Step 2: Link Project

```bash
npx supabase link --project-ref <PROJECT_REF>
```

You'll be prompted for your database password.

## Step 3: Push Database Migrations

```bash
npx supabase db push
```

This applies all migrations in `supabase/migrations/`:
1. Core schema (athletes, goals, constraints, daily_checkins, training_plans)
2. Conversations and messages
3. Encrypted credential storage
4. pgvector extension
5. Embeddings table for RAG
6. Training plan enhancements

All tables have Row-Level Security (RLS) enabled — users can only access their own data.

## Step 4: Set Edge Function Secrets

```bash
# Generate an encryption key for Intervals.icu credential storage
ENCRYPTION_KEY=$(openssl rand -hex 32)

npx supabase secrets set \
  ANTHROPIC_API_KEY=<your-anthropic-key> \
  OPENAI_API_KEY=<your-openai-key> \
  ENCRYPTION_KEY=$ENCRYPTION_KEY
```

| Secret | Used By | Purpose |
|--------|---------|---------|
| `ANTHROPIC_API_KEY` | ai-coach, ai-orchestrator | Claude API for coaching |
| `OPENAI_API_KEY` | generate-embedding, semantic-search | Embeddings for RAG |
| `ENCRYPTION_KEY` | credentials | AES-GCM encryption of Intervals.icu keys |

Note: `SUPABASE_URL`, `SUPABASE_ANON_KEY` (publishable key), and `SUPABASE_SERVICE_ROLE_KEY` are automatically available to edge functions.

## Step 5: Deploy Edge Functions

```bash
npx supabase functions deploy
```

This deploys all 7 functions. To deploy individually:

```bash
npx supabase functions deploy ai-coach
npx supabase functions deploy ai-orchestrator
npx supabase functions deploy credentials
npx supabase functions deploy generate-embedding
npx supabase functions deploy generate-plan
npx supabase functions deploy mcp-gateway
npx supabase functions deploy semantic-search
```

## Step 6: Seed Knowledge Base (Optional)

The knowledge base powers RAG-grounded coaching responses. To seed it:

```bash
export OPENAI_API_KEY=<your-key>
export SUPABASE_URL=<your-project-url>
export SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>

cd supabase/seed
npx tsx seed-knowledge.ts
```

## Step 7: Configure Mobile App

Create or update `apps/mobile/.env` (this file is gitignored):

```env
EXPO_PUBLIC_SUPABASE_URL=https://<PROJECT_REF>.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable-key-from-step-1>
```

Then start the app:

```bash
cd apps/mobile
npx expo start
```

Scan the QR code with Expo Go on your phone. The app will connect to the hosted Supabase backend.

## CI/CD Deployment

A GitHub Action automatically deploys database migrations and edge functions when changes are pushed to `main`. See `.github/workflows/deploy-supabase.yml`.

### Required GitHub Secrets

| Secret | Where to Find |
|--------|---------------|
| `SUPABASE_ACCESS_TOKEN` | [supabase.com/dashboard/account/tokens](https://supabase.com/dashboard/account/tokens) |
| `SUPABASE_PROJECT_REF` | Settings > General > Reference ID |
| `SUPABASE_DB_PASSWORD` | The password you set when creating the project |

### What Gets Deployed

The workflow triggers on pushes to `main` that modify files in:
- `supabase/migrations/**` — runs `supabase db push`
- `supabase/functions/**` — runs `supabase functions deploy`

## Environments

| Environment | Supabase Plan | Purpose |
|-------------|---------------|---------|
| Local | `supabase start` | Development with local DB |
| Staging | Free plan | Testing with hosted backend |
| Production | Pro ($25/month) | Live users, no auto-pause |

### Free Plan Limits

- 2 active projects (paused projects don't count)
- Projects pause after 7 days of inactivity
- 500 MB database storage
- 50,000 monthly active users
- 500,000 edge function invocations/month

## Troubleshooting

**"Network request failed" on physical device**
- Ensure your phone has internet access
- Verify the Supabase URL in `.env` is the hosted URL (not `127.0.0.1`)
- Check that the Supabase project is not paused (visit the dashboard)

**Edge functions return 500**
- Check function logs: `npx supabase functions logs <function-name> --project-ref <ref>`
- Verify secrets are set: `npx supabase secrets list`

**Migrations fail to push**
- Check for conflicts: `npx supabase db diff`
- If the remote DB has diverged, you may need to resolve manually

**Supabase project paused**
- Free projects pause after 7 days of inactivity
- Restore from the dashboard — data is preserved for 90 days

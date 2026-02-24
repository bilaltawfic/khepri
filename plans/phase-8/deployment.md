# Phase 8: Deployment Plan

## Context

Manual testing revealed that local Supabase is impractical for physical device testing (networking issues between phone and localhost). Deploying to hosted Supabase solves this and better reflects production behavior.

## Goals

1. Deploy Supabase backend (database + edge functions) to hosted environment
2. Configure mobile app to connect to hosted backend via Expo Go
3. Set up CI/CD to auto-deploy backend changes on merge to main
4. Prepare for future App Store / Play Store release

## Phase 8a: Backend Deployment (Testing)

### Tasks

| # | Task | Branch | PR Size |
|---|------|--------|---------|
| 1 | Create/restore Supabase project on supabase.com | Manual (no code) | N/A |
| 2 | Link project and push migrations | Manual CLI | N/A |
| 3 | Set edge function secrets (ANTHROPIC_API_KEY, OPENAI_API_KEY, ENCRYPTION_KEY) | Manual CLI | N/A |
| 4 | Deploy all edge functions | Manual CLI | N/A |
| 5 | Seed knowledge base for RAG features | Manual CLI | N/A |
| 6 | Update mobile `.env` with hosted Supabase URL/key | Local only (gitignored) | N/A |
| 7 | Verify auth flows work via Expo Go on physical device | Manual test | N/A |

### Verification

- Sign up / login works on physical device
- Edge functions respond (check-in generates AI recommendation)
- RLS policies enforce data isolation

## Phase 8b: CI/CD Backend Deployment

### Tasks

| # | Task | Branch | PR Size |
|---|------|--------|---------|
| 1 | Create GitHub Action for Supabase migration + function deployment | `ci/supabase-deploy` | ~80 lines |
| 2 | Add required secrets to GitHub repository settings | Manual | N/A |

### Dependencies

- Supabase project must exist (Phase 8a, Task 1)
- GitHub secrets: `SUPABASE_PROJECT_REF`, `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`

## Phase 8c: Production Mobile Build (Future)

### Tasks

| # | Task | Branch | PR Size |
|---|------|--------|---------|
| 1 | Configure `eas.json` production profile with env vars | `feat/eas-production` | ~30 lines |
| 2 | Set up EAS Secrets for Supabase credentials | Manual | N/A |
| 3 | Configure iOS provisioning / Android keystore | Manual | N/A |
| 4 | Create EAS build + submit workflow | `ci/eas-build` | ~60 lines |
| 5 | Upgrade Supabase to Pro plan ($25/month) | Manual | N/A |

### Supabase Free Plan Constraints

- 2 free projects (paused projects don't count)
- Projects pause after 7 days of inactivity
- 500 MB database, 50K MAU, 500K edge function invocations/month
- Fine for testing; production needs Pro ($25/month) to prevent pausing

## Current Status

- [ ] Phase 8a: Backend Deployment
- [ ] Phase 8b: CI/CD Backend Deployment
- [ ] Phase 8c: Production Mobile Build

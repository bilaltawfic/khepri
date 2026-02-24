# Deployment Plan and Documentation

**Date:** 2026-02-16
**Type:** Documentation

## Goals

Create deployment plan, documentation, and CI/CD spec for deploying the Khepri backend to hosted Supabase and preparing for production mobile builds.

## Key Decisions

- **Phase 8a** (now): Deploy Supabase backend to hosted environment for testing via Expo Go
- **Phase 8b**: Automate deployments with GitHub Actions
- **Phase 8c** (future): EAS production builds for App Store / Play Store
- **Free plan for testing**, Pro ($25/month) for production — free plan pauses after 7 days of inactivity
- **CI/CD spec as a separate document** (`docs/specs/ci-supabase-deploy.md`) to hand off to another Claude instance for implementation

## Files Changed

- `plans/phase-8/deployment.md` — Deployment plan with phases and tasks
- `plans/README.md` — Updated structure to include Phase 7.5 and Phase 8
- `docs/DEPLOYMENT.md` — Step-by-step deployment guide (Supabase + mobile app)
- `docs/specs/ci-supabase-deploy.md` — Implementation spec for GitHub Action workflow

## Learnings

- Supabase free plan allows 2 projects, but they pause after 7 days of inactivity
- Local Supabase is impractical for physical device testing — hosted Supabase is the right path
- Edge functions need 3 external secrets: ANTHROPIC_API_KEY, OPENAI_API_KEY, ENCRYPTION_KEY
- Supabase auto-provides SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY to edge functions

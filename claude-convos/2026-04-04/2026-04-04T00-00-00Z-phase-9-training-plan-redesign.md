# Session: Phase 9 — Training Plan Redesign Product Discussion & Planning

**Date:** 2026-04-04
**Duration:** ~3 hours
**Agent(s) Used:** Explore, general-purpose (research)

## Goal

Design the next major feature for Khepri: replace the generic periodization skeleton with a season-based planning system that generates specific daily workouts, syncs bidirectionally with Intervals.icu, tracks compliance, and supports AI coach adaptations.

## Key Decisions

### 1. Season as Top-Level Concept
- One active season per athlete, defaults to calendar year (Dec 31 end)
- All goals (race, performance, fitness, health) are season-scoped
- Season contains a skeleton (high-level phase allocation) and race blocks (detailed workouts)

### 2. Staged Planning
- Plan the full season skeleton upfront (phases across the year)
- Generate detailed workouts one race block at a time
- Review performance between blocks, adjust targets, plan next block
- Blocks progress through lifecycle: draft → locked → in_progress → completed

### 3. Two-Tier Workout Generation
- **Paid tier:** Claude generates custom workouts per athlete context
- **Free tier:** Pre-built templates parameterized with athlete's zones
- Both output valid Intervals.icu DSL format (critical for device sync)
- WorkoutStructure JSON is source of truth; DSL serialized from it

### 4. Intervals.icu DSL is the Format
- Research revealed: description text IS the structured workout input — Intervals.icu parses it into `workout_doc` which pushes to Garmin/Zwift
- All workouts must use valid DSL syntax (not plain English descriptions)
- DSL validated before push; fallback to simplified description on failure

### 5. Bidirectional Sync Architecture
- Webhooks + 30-min polling (belt and suspenders)
- Last-write-wins conflict resolution with full audit trail
- Every plan change logged with before/after snapshots for rollback
- Documented in ADR-001

### 6. Compliance Tracking (TrainingPeaks-inspired)
- Per-workout: green (80-120%), amber (50-79%/121-150%), red (<50%/>150%)
- Metric priority: TSS > Duration > Distance
- Weekly and block compliance scores computed (TrainingPeaks' gap = our opportunity)

### 7. Onboarding Simplified to 3 Steps
- Welcome → Connect Intervals.icu → Fitness Numbers
- Removed: Goals, Events, Plan steps
- Season setup moves to dashboard CTA post-onboarding

### 8. Coach Adaptations with Audit Trail
- Coach suggests daily modifications based on check-in + wellness
- All suggestions require athlete acceptance
- Full before/after snapshots stored for support rollback
- Accepted changes synced to Intervals.icu

### 9. Execution Waves (Parallelism)
- Wave 1: Data model (solo)
- Wave 2: Onboarding + Season Setup + Workout Gen + Sync Engine (4 parallel)
- Wave 3: Block Planning (convergence)
- Wave 4: Compliance + Coach Adaptations (2 parallel)
- Wave 5: Dashboard Redesign (solo)

## Files Created

### Design & Architecture
- `docs/adr/001-intervals-icu-sync-architecture.md` — Full sync ADR
- `docs/design/training-plan-redesign.md` — Complete product design doc

### Implementation Plans
- `plans/phase-9/README.md` — Phase 9 overview with dependency graph and execution waves
- `plans/phase-9/subphases/p9a-data-model.md` — Migration SQL, types, queries
- `plans/phase-9/subphases/p9b-onboarding-simplification.md` — 3-step onboarding
- `plans/phase-9/subphases/p9c-season-setup-flow.md` — Guided season setup
- `plans/phase-9/subphases/p9d-workout-generation.md` — DSL serializer, templates, Claude gen
- `plans/phase-9/subphases/p9e-block-planning-flow.md` — Block setup → review → lock-in
- `plans/phase-9/subphases/p9f-sync-engine.md` — Webhook, push, cron reconciliation
- `plans/phase-9/subphases/p9g-compliance-tracking.md` — Green/amber/red scoring
- `plans/phase-9/subphases/p9h-coach-adaptations.md` — Daily suggestions, rollback
- `plans/phase-9/subphases/p9i-dashboard-redesign.md` — New dashboard layout

### Updated Plans
- `plans/claude-plan.md` — Added Phase 9 with dependency graph
- `plans/claude-plan-detailed.md` — Added 60+ granular tasks (P9-A through P9-I)

## Research Conducted

1. **Intervals.icu API & Workout Formats** — Discovered DSL description is parsed by server into workout_doc for device push. Documented syntax rules.
2. **Intervals.icu Webhooks** — Confirmed webhook support for activity/event/wellness changes. Recommended webhooks + polling approach.
3. **TrainingPeaks Compliance Model** — Green/yellow/orange/red system with 80-120%/50-79%/<50% thresholds. No computed weekly scores (our differentiator).

## Learnings

1. **Intervals.icu DSL is critical path** — Without valid DSL syntax, workouts won't push to devices. This must be right from day one, not a "migrate to later" feature.
2. **WorkoutStructure → DSL (not the reverse)** — Generating structured data first and serializing to DSL is more reliable than parsing DSL text.
3. **Compliance tracking is a real differentiator** — TrainingPeaks leaves weekly/plan compliance as visual-only. Computing actual scores adds clear value.
4. **Season-scoped goals simplify everything** — Goals floating independently created confusion. Tying them to a season gives context and lifecycle.
5. **Onboarding should be fast** — Planning a full season is too complex for a setup wizard. Dashboard CTA is the right entry point.

# Khepri Implementation Plans

This directory contains all implementation plans for the Khepri project.

## Structure

```
plans/
├── README.md                    # This file
├── claude-plan.md               # High-level project plan
├── claude-plan-detailed.md      # Granular task breakdown
└── phase-1/                     # Phase 1: Foundation
    └── p1-b-supabase-client.md  # Supabase client package
```

## How Plans Work

1. **High-level plan** (`claude-plan.md`) - Overall architecture, phases, milestones
2. **Detailed breakdown** (`claude-plan-detailed.md`) - Numbered tasks with dependencies
3. **Phase plans** (`phase-N/`) - Specific implementation plans for each sub-phase

## Adding New Plans

When starting a new sub-phase:

1. Create a new file in the appropriate phase directory (e.g., `phase-2/p2-a-onboarding.md`)
2. Include: Goal, Current State, Tasks (with branches), Testing Approach, Verification
3. Reference key files and dependencies
4. Each task should produce a small, focused PR (<200 lines)

## Current Status

See `claude-plan-detailed.md` for up-to-date task status.

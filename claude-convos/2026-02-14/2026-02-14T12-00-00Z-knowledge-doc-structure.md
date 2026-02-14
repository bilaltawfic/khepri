# Knowledge Base Document Structure

**Date:** 2026-02-14
**Task:** P5-B-01 - Create Exercise Science Document Structure

## Goals

Create the `docs/knowledge/` directory with structured Markdown documents containing exercise science content for RAG-based AI coaching. Establish metadata format aligned with the embeddings pipeline.

## Key Decisions

1. **Metadata format** uses YAML front-matter with fields: title, category, tags, sport, difficulty, source_id — all aligned with the `embeddings.metadata` JSONB column
2. **Document structure** uses H2 headers as chunk boundaries for embedding-friendly chunking (200-500 words per section)
3. **Content scope** covers three categories: training-load (3 docs), recovery (3 docs), injury-prevention (2 docs) — 8 total
4. **Sport field** uses "triathlon" for sport-specific content and "general" for universal principles
5. **source_id** follows directory-path convention (e.g., "training-load/progressive-overload") for stable re-indexing

## Files Created

- `docs/knowledge/README.md` — Knowledge base overview, metadata spec, contribution guide
- `docs/knowledge/training-load/progressive-overload.md` — 10% rule, sport-specific progression
- `docs/knowledge/training-load/periodization-basics.md` — Base/build/peak/taper phases
- `docs/knowledge/training-load/triathlon-training-distribution.md` — 80/20 model, swim/bike/run split
- `docs/knowledge/recovery/sleep-and-recovery.md` — Sleep recommendations, hygiene tips
- `docs/knowledge/recovery/active-recovery.md` — Zone 1 sessions, recovery modalities
- `docs/knowledge/recovery/deload-weeks.md` — Scheduling, volume reduction guidelines
- `docs/knowledge/injury-prevention/common-triathlon-injuries.md` — Run/swim/bike injuries
- `docs/knowledge/injury-prevention/return-to-training.md` — Graduated return protocols, pain scale

## Learnings

- Documentation-only PRs are straightforward but still need CI conversation log check
- Pre-existing lint and typecheck issues on main don't block documentation PRs
- Each document designed so H2 sections are independently embeddable chunks

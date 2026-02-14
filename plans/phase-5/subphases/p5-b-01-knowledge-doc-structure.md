# P5-B-01: Create Exercise Science Document Structure

## Goal

Create a structured knowledge base directory (`docs/knowledge/`) containing exercise science content that will be embedded into the vector database. These documents are the "R" in RAG — the retrieval source that gives Khepri's AI coach grounded, evidence-based training knowledge.

The focus is on **structure and initial content** — enough to validate the embedding pipeline end-to-end while establishing a scalable pattern for future content.

## Current State

- `docs/` directory has `database-schema.md` and `GETTING-STARTED.md`
- No `docs/knowledge/` directory exists
- Embedding pipeline is ready: `generate-embedding` edge function (P5-A-03 ✅)
- Embeddings table supports `metadata` JSONB for category, tags, sport, etc.
- Content type `'knowledge'` is the target for shared knowledge base

## Target State

- `docs/knowledge/` directory with structured Markdown files
- Documents organized by topic with front-matter metadata
- Each document designed for chunking (clear section boundaries)
- Content validated by the triathlon coaching domain
- Metadata format aligned with the `embeddings.metadata` JSONB column

## Files to Create

| File | Purpose |
|------|---------|
| `docs/knowledge/README.md` | Knowledge base overview, contribution guide, metadata spec |
| `docs/knowledge/training-load/progressive-overload.md` | Training load fundamentals |
| `docs/knowledge/training-load/periodization-basics.md` | Periodization concepts |
| `docs/knowledge/training-load/triathlon-training-distribution.md` | Swim/bike/run balance |
| `docs/knowledge/recovery/sleep-and-recovery.md` | Sleep's role in adaptation |
| `docs/knowledge/recovery/active-recovery.md` | Active vs passive recovery |
| `docs/knowledge/recovery/deload-weeks.md` | When and how to deload |
| `docs/knowledge/injury-prevention/common-triathlon-injuries.md` | Injury awareness |
| `docs/knowledge/injury-prevention/return-to-training.md` | Graduated return protocols |

## Files to Modify

None — this is a documentation-only task.

## Implementation Steps

### Step 1: Create Directory Structure

```
docs/knowledge/
├── README.md
├── training-load/
│   ├── progressive-overload.md
│   ├── periodization-basics.md
│   └── triathlon-training-distribution.md
├── recovery/
│   ├── sleep-and-recovery.md
│   ├── active-recovery.md
│   └── deload-weeks.md
└── injury-prevention/
    ├── common-triathlon-injuries.md
    └── return-to-training.md
```

### Step 2: Define Metadata Format

Each knowledge document uses YAML front-matter that maps to the `embeddings.metadata` JSONB column:

```yaml
---
title: "Progressive Overload Principles"
category: "training-load"
tags: ["volume", "intensity", "progression", "10-percent-rule"]
sport: "triathlon"            # or "running", "cycling", "swimming", "general"
difficulty: "beginner"        # beginner | intermediate | advanced
source_id: "training-load/progressive-overload"
---
```

**Metadata fields:**
- `title` — Human-readable title (maps to `embeddings.title`)
- `category` — Top-level category matching directory name
- `tags` — Array of keywords for filtering and discovery
- `sport` — Which sport(s) this applies to
- `difficulty` — Athlete experience level
- `source_id` — Unique identifier for the document (used by `deleteEmbeddingsBySource` for re-indexing)

### Step 3: Write README.md

The README should document:
1. Purpose of the knowledge base
2. How documents are structured
3. Metadata format specification
4. Chunking guidelines (section headers = chunk boundaries)
5. How to add new content
6. How documents flow through the embedding pipeline

### Step 4: Write Knowledge Documents

Each document should follow these guidelines:

**Structure for embedding-friendly chunking:**
- Clear H2 (`##`) section headers that can serve as chunk boundaries
- Each section is self-contained (makes sense without surrounding context)
- Sections are 200-500 words (within the ~8000 token embedding limit)
- Key concepts are stated explicitly, not referenced implicitly

**Content requirements:**
- Evidence-based (cite principles, not specific studies initially)
- Actionable for an AI coach (include thresholds, rules-of-thumb, protocols)
- Relevant to triathlon athletes (swim/bike/run specific where applicable)
- Include safety considerations that the AI should always mention

**Example document structure:**

```markdown
---
title: "Progressive Overload Principles"
category: "training-load"
tags: ["volume", "intensity", "progression"]
sport: "triathlon"
difficulty: "beginner"
source_id: "training-load/progressive-overload"
---

# Progressive Overload Principles

## What Is Progressive Overload

[Self-contained explanation of the concept...]

## The 10% Rule

[Practical guideline with specific numbers...]

## Applying Progressive Overload to Triathlon

[Sport-specific application...]

## Warning Signs of Overtraining

[Safety-critical content the AI coach must know...]

## Key Takeaways

[Summary of actionable rules-of-thumb...]
```

### Step 5: Content for Each Document

#### training-load/progressive-overload.md
- What progressive overload means for endurance athletes
- The 10% rule for weekly volume increases
- How to progress intensity vs volume
- Specific examples for swim/bike/run
- Warning signs of progressing too fast

#### training-load/periodization-basics.md
- Linear vs block vs undulating periodization
- Macro/meso/micro cycle definitions
- Base → build → peak → taper phases
- How periodization applies to triathlon seasons
- When to adjust the plan

#### training-load/triathlon-training-distribution.md
- Polarized training model (80/20 easy/hard)
- How to split time between swim/bike/run
- Brick workouts (bike-to-run transitions)
- Training volume by race distance (sprint → Ironman)
- Balancing three sports to avoid overuse

#### recovery/sleep-and-recovery.md
- Sleep as the primary recovery mechanism
- How sleep quality affects adaptation
- Minimum sleep recommendations for endurance athletes
- Sleep hygiene tips specific to athletes
- Signs of insufficient recovery

#### recovery/active-recovery.md
- Active vs passive recovery explained
- Easy zone 1 sessions for recovery
- When to take a complete rest day
- Recovery modalities (foam rolling, stretching, etc.)
- Post-workout recovery windows

#### recovery/deload-weeks.md
- What a deload week is and why it matters
- When to schedule deload weeks (every 3-4 weeks)
- How much to reduce volume (typically 40-60%)
- Maintaining some intensity during deloads
- Signs you need an unplanned deload

#### injury-prevention/common-triathlon-injuries.md
- Runner's knee, IT band, shin splints
- Swimmer's shoulder, rotator cuff issues
- Cycling-related lower back and knee problems
- Risk factors specific to multisport athletes
- When to flag a concern to the athlete

#### injury-prevention/return-to-training.md
- Graduated return-to-training protocols
- Pain scale guidelines (when to stop vs modify)
- Cross-training around injuries
- Communication between AI coach and athlete about pain
- When to recommend professional medical advice

## Testing Requirements

**This is a documentation-only task — no automated tests required.**

However, validate:
1. All documents have valid YAML front-matter
2. `source_id` values are unique across all documents
3. Metadata follows the defined schema
4. Content is well-structured with clear H2 section headers
5. Documents build successfully (no broken links)

Optional: Write a simple script or test that parses all knowledge docs, validates front-matter, and checks for duplicate `source_id` values. This would live at `docs/knowledge/__tests__/validate-docs.test.ts` but is NOT required for this task.

## Verification

1. `docs/knowledge/` directory exists with README and 8 documents
2. All documents have valid YAML front-matter with required fields
3. `source_id` values are unique
4. Documents follow the chunking-friendly structure (clear H2 sections)
5. Content is accurate, actionable, and relevant to triathlon coaching
6. `pnpm lint` passes (no lint errors in markdown files)
7. Each document is 300-800 words (right size for embedding chunks)

## Dependencies

None — this is a standalone documentation task.

## Downstream Tasks

- **P5-B-02** (training load management content) — extends content in `training-load/`
- **P5-B-03** (recovery protocols content) — extends content in `recovery/`
- **P5-B-04** (seed knowledge base) — will embed all documents from `docs/knowledge/`

## Estimated Scope

~8 Markdown documents × ~500 words each = ~4000 words total + README. Documentation-only, no code changes. Should fit within a single focused PR.

## Notes

- The initial content provides a foundation; P5-B-02 and P5-B-03 will expand it
- Documents are designed so that each H2 section can be independently embedded as a chunk
- The metadata format aligns with the existing `embeddings.metadata` JSONB schema
- `source_id` serves as the stable identifier for re-indexing via `deleteEmbeddingsBySource`

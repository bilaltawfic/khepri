# Khepri Knowledge Base

This directory contains structured exercise science content that powers Khepri's AI coaching through Retrieval-Augmented Generation (RAG). Documents here are embedded into a vector database and retrieved at inference time to give the AI coach grounded, evidence-based training knowledge.

## Directory Structure

```
docs/knowledge/
├── README.md                          # This file
├── training-load/                     # Volume, intensity, periodization
│   ├── progressive-overload.md
│   ├── periodization-basics.md
│   └── triathlon-training-distribution.md
├── recovery/                          # Sleep, rest, deload strategies
│   ├── sleep-and-recovery.md
│   ├── active-recovery.md
│   └── deload-weeks.md
└── injury-prevention/                 # Common injuries, return-to-training
    ├── common-triathlon-injuries.md
    └── return-to-training.md
```

## Document Format

Every knowledge document uses YAML front-matter followed by Markdown content.

### Required Metadata Fields

```yaml
---
title: "Human-Readable Title"
category: "training-load"                           # matches directory name
tags: ["keyword1", "keyword2"]                      # for filtering and discovery
sport: "triathlon"                                  # triathlon | running | cycling | swimming | general
difficulty: "beginner"                              # beginner | intermediate | advanced
source_id: "training-load/progressive-overload"     # unique ID for re-indexing
---
```

| Field | Type | Description |
|-------|------|-------------|
| `title` | string | Human-readable title, maps to `embeddings.title` |
| `category` | string | Top-level category matching directory name |
| `tags` | string[] | Keywords for filtering and discovery |
| `sport` | string | Which sport this applies to |
| `difficulty` | string | Target athlete experience level |
| `source_id` | string | Unique ID used by `deleteEmbeddingsBySource` for re-indexing |

### Embedding Pipeline

Documents flow through the system as follows:

1. Content is read from `docs/knowledge/` with its front-matter metadata
2. Each H2 (`##`) section becomes an independent chunk
3. Chunks are sent to the `generate-embedding` edge function with `content_type: 'knowledge'`
4. Embeddings are stored in the `embeddings` table with the document's metadata in the `metadata` JSONB column
5. At inference time, relevant chunks are retrieved by semantic similarity and injected into the AI coach's context

## Writing Guidelines

### Structure for Embedding-Friendly Chunking

- Use H2 (`##`) headers to define chunk boundaries
- Each section should be self-contained (understandable without surrounding context)
- Keep sections between 200-500 words (within the ~8000 token embedding limit)
- State key concepts explicitly rather than referencing them implicitly

### Content Requirements

- Evidence-based: cite principles and established guidelines, not specific studies
- Actionable: include thresholds, rules-of-thumb, and protocols the AI can apply
- Triathlon-relevant: address swim/bike/run specifics where applicable
- Safety-conscious: include warnings and contraindications the AI must always surface

### Target Document Size

Each document should be 300-800 words total, providing enough depth for meaningful retrieval without overwhelming a single topic.

## Adding New Content

1. Choose the appropriate category directory (or create a new one)
2. Create a new `.md` file with YAML front-matter following the schema above
3. Ensure `source_id` is unique across all knowledge documents
4. Structure content with clear H2 sections for chunking
5. Keep content evidence-based and actionable
6. Submit via pull request for review

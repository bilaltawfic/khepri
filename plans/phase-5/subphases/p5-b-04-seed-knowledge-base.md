# P5-B-04: Seed Knowledge Base with Embeddings

## Goal

Create a TypeScript seed script that reads all exercise science documents from `docs/knowledge/`, chunks them by H2 sections, generates embeddings via the `generate-embedding` edge function, and inserts them into the `embeddings` table. After seeding, knowledge should be searchable via the `semantic-search` edge function.

## Dependencies

- ✅ P5-A-03: Embedding generation function (complete)
- ✅ P5-B-01/02/03: Knowledge documents (complete - 9 docs in `docs/knowledge/`)

## Files to Create

| File | Purpose |
|------|---------|
| `supabase/seed/seed-knowledge.ts` | Main seed script |
| `supabase/seed/chunk-parser.ts` | Markdown parsing & chunking logic |
| `supabase/seed/chunk-parser.test.ts` | Unit tests for chunking |
| `supabase/seed/seed-knowledge.test.ts` | Tests for seed orchestration |

## Implementation Steps

### Step 1: Create Markdown Chunk Parser (`chunk-parser.ts`)

Parse YAML front-matter and split markdown content by H2 (`##`) headers.

```typescript
interface DocumentMetadata {
  readonly title: string;
  readonly category: string;
  readonly tags: readonly string[];
  readonly sport: string;
  readonly difficulty: string;
  readonly source_id: string;
}

interface DocumentChunk {
  readonly title: string;        // "Document Title > Section Title"
  readonly content: string;      // Section text (200-500 words)
  readonly chunk_index: number;  // 0-based position
  readonly metadata: DocumentMetadata;
}

function parseKnowledgeDocument(
  filePath: string,
  rawContent: string
): DocumentChunk[];
```

**Logic:**
1. Extract YAML front-matter between `---` delimiters
2. Split remaining markdown at `## ` boundaries
3. For each section:
   - Use `"Document Title > Section Header"` as chunk title
   - Trim whitespace, skip empty sections
   - Preserve sub-headers (H3+) within sections
4. Return array of `DocumentChunk` objects

### Step 2: Create Seed Script (`seed-knowledge.ts`)

Orchestrate reading docs and calling the embedding function.

```typescript
interface SeedConfig {
  readonly supabaseUrl: string;
  readonly supabaseServiceKey: string;
  readonly knowledgeDir: string;
  readonly dryRun?: boolean;
}

interface SeedResult {
  readonly documentsProcessed: number;
  readonly chunksGenerated: number;
  readonly embeddingsCreated: number;
  readonly errors: readonly SeedError[];
}

async function seedKnowledgeBase(config: SeedConfig): Promise<SeedResult>;
```

**Logic:**
1. Read all `.md` files from `docs/knowledge/` (recursively, skip README.md)
2. Parse each file into chunks using `parseKnowledgeDocument()`
3. For each document:
   a. Call `deleteEmbeddingsBySource(sourceId)` for idempotent re-runs
   b. For each chunk, call `generate-embedding` edge function:
      ```
      POST /functions/v1/generate-embedding
      {
        content: chunk.content,
        title: chunk.title,
        content_type: "knowledge",
        source_id: chunk.metadata.source_id,
        chunk_index: chunk.chunk_index,
        metadata: {
          category: chunk.metadata.category,
          tags: chunk.metadata.tags,
          sport: chunk.metadata.sport,
          difficulty: chunk.metadata.difficulty
        }
      }
      ```
   c. Log progress: `[3/9] training-load/progressive-overload: 4 chunks embedded`
4. Return summary with counts and any errors

**Error handling:**
- Retry failed API calls up to 3 times with exponential backoff
- Continue on individual chunk failure (log error, don't abort)
- Add 200ms delay between API calls to respect rate limits

### Step 3: Add npm Script

Add to root `package.json` or `supabase/seed/package.json`:
```json
{
  "scripts": {
    "seed:knowledge": "npx tsx supabase/seed/seed-knowledge.ts"
  }
}
```

### Step 4: Write Tests

**`chunk-parser.test.ts`:**
- Parses YAML front-matter correctly
- Splits at H2 boundaries
- Generates correct chunk titles (document > section)
- Handles documents with no H2 sections (single chunk)
- Handles empty sections (skips them)
- Preserves H3+ sub-headers within chunks
- Sets correct chunk_index (0-based)

**`seed-knowledge.test.ts`:**
- Reads all `.md` files from knowledge directory
- Skips README.md
- Calls deleteEmbeddingsBySource before re-inserting
- Calls generate-embedding for each chunk
- Returns correct summary counts
- Handles API errors gracefully (continues on failure)
- Dry run mode doesn't call API

## Testing Requirements

- Unit tests for chunk parsing with various document structures
- Mock-based tests for seed orchestration (mock fetch calls)
- Integration verification: after seeding, `semantic-search` returns relevant results for queries like "what is progressive overload?" or "how much sleep do athletes need?"

## Verification

1. Run `pnpm seed:knowledge` against local/staging Supabase
2. Query: `POST /functions/v1/semantic-search { query: "progressive overload" }`
3. Verify results include content from `progressive-overload.md`
4. Query: `POST /functions/v1/semantic-search { query: "sleep recovery athletes" }`
5. Verify results include content from `sleep-and-recovery.md`
6. Confirm all 9 documents are represented in embeddings table

## Key Considerations

- **Idempotency**: Always delete existing embeddings for a source_id before re-inserting
- **Authentication**: Use service role key (shared knowledge has `athlete_id = NULL`)
- **Rate limiting**: Add delays between OpenAI API calls (via generate-embedding function)
- **Document format**: All 9 docs use consistent YAML front-matter with `source_id` field
- **Chunk size**: H2 sections are 200-500 words each (within embedding model limits)

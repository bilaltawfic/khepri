# P5-A-04: Add Semantic Search Edge Function

## Goal

Create a Supabase Edge Function that accepts a natural-language query, generates an embedding via OpenAI, and searches the `embeddings` table for semantically similar content. This is the retrieval layer of the RAG system — the AI coach will call this function to find relevant exercise science knowledge before generating responses.

## Current State

- pgvector extension enabled (P5-A-01 ✅)
- `embeddings` table with `match_embeddings` RPC function (P5-A-02 ✅)
- `generate-embedding` edge function generates and stores embeddings (P5-A-03 ✅)
- `searchEmbeddings` TypeScript query in `packages/supabase-client` calls `match_embeddings`
- No edge function exists for search — clients have no HTTP endpoint for semantic search

## Target State

- New `semantic-search` edge function that:
  1. Accepts a text query and optional filters
  2. Generates a query embedding via OpenAI `text-embedding-3-small`
  3. Calls the existing `match_embeddings` DB function
  4. Returns ranked results with similarity scores
- Authenticated via Supabase JWT
- Supports filtering by content_type and athlete_id
- Reuses patterns from `generate-embedding` for consistency

## Files to Create

| File | Purpose |
|------|---------|
| `supabase/functions/semantic-search/index.ts` | Main edge function handler |
| `supabase/functions/semantic-search/types.ts` | Request/response type definitions |
| `supabase/functions/semantic-search/validate.ts` | Runtime request validation |
| `supabase/functions/semantic-search/__tests__/validate.test.ts` | Validation unit tests |
| `supabase/functions/semantic-search/__tests__/types.test.ts` | Constants unit tests |
| `supabase/functions/semantic-search/__tests__/index.test.ts` | Handler integration tests |

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/jest.config.js` | Add `semantic-search` to test paths if needed |

## Implementation Steps

### Step 1: Define Types (`types.ts`)

Follow the same pattern as `generate-embedding/types.ts` with readonly interfaces.

```typescript
/** Request body for the semantic-search edge function */
export interface SemanticSearchRequest {
  /** The natural-language query to search for */
  readonly query: string;
  /** Maximum number of results to return (default: 5, max: 20) */
  readonly match_count?: number;
  /** Minimum similarity threshold 0-1 (default: 0.7) */
  readonly match_threshold?: number;
  /** Filter results by content type */
  readonly content_type?: 'knowledge' | 'conversation' | 'activity';
  /** Include personal embeddings for this athlete (also includes shared knowledge) */
  readonly athlete_id?: string;
}

/** A single search result */
export interface SearchResult {
  readonly id: string;
  readonly content_type: string;
  readonly title: string;
  readonly content: string;
  readonly metadata: Record<string, unknown>;
  readonly similarity: number;
}

/** Response body on successful search */
export interface SemanticSearchResponse {
  readonly results: readonly SearchResult[];
  readonly query_tokens: number;
  readonly model: string;
}

/** Reuse embedding constants from generate-embedding */
export const EMBEDDING_MODEL = 'text-embedding-3-small';
export const EMBEDDING_DIMENSIONS = 1536;
export const MAX_QUERY_LENGTH = 2000;
export const MAX_MATCH_COUNT = 20;
export const DEFAULT_MATCH_COUNT = 5;
export const DEFAULT_MATCH_THRESHOLD = 0.7;
export const VALID_CONTENT_TYPES = ['knowledge', 'conversation', 'activity'] as const;
```

### Step 2: Create Validation (`validate.ts`)

Separate module for testability, same pattern as `generate-embedding/validate.ts`.

```typescript
import {
  MAX_QUERY_LENGTH,
  MAX_MATCH_COUNT,
  DEFAULT_MATCH_COUNT,
  DEFAULT_MATCH_THRESHOLD,
  VALID_CONTENT_TYPES,
} from './types.ts';

export function validateRequest(body: unknown): string | null {
  if (body == null || typeof body !== 'object') {
    return 'Request body must be an object';
  }

  const b = body as Record<string, unknown>;

  // Required: query (non-empty string, max 2000 chars)
  if (typeof b.query !== 'string' || b.query.trim().length === 0) {
    return 'query is required and must be a non-empty string';
  }
  if (b.query.length > MAX_QUERY_LENGTH) {
    return `query exceeds maximum length of ${MAX_QUERY_LENGTH} characters`;
  }

  // Optional: match_count (positive integer, max 20)
  if (b.match_count != null) {
    if (typeof b.match_count !== 'number' || !Number.isInteger(b.match_count) || b.match_count < 1) {
      return 'match_count must be a positive integer';
    }
    if (b.match_count > MAX_MATCH_COUNT) {
      return `match_count must not exceed ${MAX_MATCH_COUNT}`;
    }
  }

  // Optional: match_threshold (number between 0 and 1)
  if (b.match_threshold != null) {
    if (typeof b.match_threshold !== 'number' || b.match_threshold < 0 || b.match_threshold > 1) {
      return 'match_threshold must be a number between 0 and 1';
    }
  }

  // Optional: content_type (one of valid types)
  if (b.content_type != null) {
    if (
      typeof b.content_type !== 'string' ||
      !VALID_CONTENT_TYPES.includes(b.content_type as (typeof VALID_CONTENT_TYPES)[number])
    ) {
      return `content_type must be one of: ${VALID_CONTENT_TYPES.join(', ')}`;
    }
  }

  // Optional: athlete_id (string)
  if (b.athlete_id != null && typeof b.athlete_id !== 'string') {
    return 'athlete_id must be a string';
  }

  return null;
}
```

### Step 3: Create Edge Function (`index.ts`)

Follow the same pattern as `generate-embedding/index.ts`:

1. **CORS preflight** handling
2. **POST-only** method check
3. **Environment variable** verification (OPENAI_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY)
4. **JWT authentication** via Supabase anon client
5. **Request parsing and validation** via `validateRequest()`
6. **Athlete ownership verification** if `athlete_id` provided (same pattern as generate-embedding)
7. **Generate query embedding** via OpenAI API (same API call pattern)
8. **Call `match_embeddings` RPC** via Supabase service role client
9. **Return results** with similarity scores

Key differences from generate-embedding:
- Uses GET-like semantics (search, not create) but POST for body
- Does NOT store the query embedding (it's ephemeral)
- Calls the `match_embeddings` RPC instead of inserting into `embeddings`
- Returns 200 (not 201) with array of results
- Empty results are valid (return empty array, not error)
- Shorter max content length (2000 chars for queries vs 30000 for documents)

```typescript
// Key section: calling match_embeddings RPC
const { data: matches, error: rpcError } = await supabase.rpc('match_embeddings', {
  query_embedding: embeddingVector,
  match_count: request.match_count ?? DEFAULT_MATCH_COUNT,
  match_threshold: request.match_threshold ?? DEFAULT_MATCH_THRESHOLD,
  filter_content_type: request.content_type ?? null,
  filter_athlete_id: request.athlete_id ?? null,
});

if (rpcError != null) {
  return errorResponse(`Search failed: ${rpcError.message}`, 500);
}

const response: SemanticSearchResponse = {
  results: matches ?? [],
  query_tokens: tokensUsed,
  model: EMBEDDING_MODEL,
};

return jsonResponse(response, 200);
```

### Step 4: Write Tests

#### A. Validation Tests (`__tests__/validate.test.ts`)

1. Missing `query` → error
2. Empty/whitespace `query` → error
3. Query exceeds max length → error
4. Valid query → null (passes)
5. `match_count` not a number → error
6. `match_count` < 1 → error
7. `match_count` > 20 → error
8. `match_count` valid → null
9. `match_threshold` out of range → error
10. `match_threshold` valid → null
11. Invalid `content_type` → error
12. Valid `content_type` values → null
13. `athlete_id` not a string → error
14. All optional fields omitted → null
15. Body is not an object → error
16. Body is null → error

#### B. Constants Tests (`__tests__/types.test.ts`)

1. EMBEDDING_MODEL is 'text-embedding-3-small'
2. EMBEDDING_DIMENSIONS is 1536
3. MAX_QUERY_LENGTH is 2000
4. MAX_MATCH_COUNT is 20
5. DEFAULT_MATCH_COUNT is 5
6. DEFAULT_MATCH_THRESHOLD is 0.7
7. VALID_CONTENT_TYPES has exactly 3 entries

#### C. Handler Tests (`__tests__/index.test.ts`)

**Authentication:**
1. Missing Authorization header → 401
2. Invalid JWT → 401
3. Valid JWT → proceeds

**Request Validation:**
4. Invalid JSON → 400
5. Missing query → 400
6. Valid request → proceeds

**Athlete Ownership (when athlete_id provided):**
7. athlete_id doesn't belong to user → 403
8. athlete_id belongs to user → proceeds
9. No athlete_id → proceeds (shared knowledge only)

**OpenAI API:**
10. Successful embedding generation → continues to search
11. OpenAI error → 502
12. Network failure → 502
13. Unexpected dimensions → 500

**Search Results:**
14. Matches found → 200 with results array
15. No matches → 200 with empty results array
16. RPC error → 500

**Response Format:**
17. Response includes `results`, `query_tokens`, `model`
18. Each result has `id`, `content_type`, `title`, `content`, `metadata`, `similarity`
19. CORS headers present

#### Mock Strategy

Reuse patterns from `generate-embedding/__tests__/`:

```typescript
// Mock OpenAI API response (same as generate-embedding)
const mockEmbedding = new Array(1536).fill(0.1);
const mockOpenAIResponse = {
  data: [{ embedding: mockEmbedding, index: 0 }],
  model: 'text-embedding-3-small',
  usage: { prompt_tokens: 5, total_tokens: 5 },
};

// Mock match_embeddings RPC response
const mockSearchResults = [
  {
    id: 'emb-1',
    content_type: 'knowledge',
    title: 'Training Load Management',
    content: 'Progressive overload should follow the 10% rule...',
    metadata: { category: 'training', tags: ['load', 'progression'] },
    similarity: 0.92,
  },
  {
    id: 'emb-2',
    content_type: 'knowledge',
    title: 'Recovery Protocols',
    content: 'Sleep is the most important recovery factor...',
    metadata: { category: 'recovery', tags: ['sleep', 'rest'] },
    similarity: 0.85,
  },
];
```

## Code Patterns to Follow

- **ESM imports from esm.sh** (e.g., `import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4'`)
- **Deno.serve()** for entry point
- **Readonly interfaces** for all type definitions
- **Nullish checks** with `!= null` (not truthy checks)
- **Separate validation module** for testability
- **Jest tests** (not Deno test) — monorepo test runner
- **CORS headers** on all responses
- **Service role client** for RPC calls (match_embeddings uses SECURITY DEFINER)
- **Error codes** not messages for assertions in tests

## Testing Requirements

- Unit tests with mocked OpenAI API and Supabase client
- No real API calls in tests
- Follow existing test patterns from `generate-embedding/__tests__/`
- All tests pass with `pnpm test`
- Linting passes with `pnpm lint`

## Security Considerations

- **Authentication required** — all requests must include valid JWT
- **Athlete ownership** — personal embedding search requires matching athlete_id
- **Query length limit** — prevents abuse via very long queries
- **Match count limit** — prevents returning entire knowledge base
- **No query storage** — query embeddings are ephemeral, not persisted

## Verification

1. `pnpm test` passes with new tests
2. `pnpm lint` passes
3. Edge function handles all error cases gracefully
4. Search returns relevant results ordered by similarity
5. Empty results return 200 with empty array (not 404)
6. Athlete filter includes both personal AND shared knowledge
7. CORS headers present on all responses

## Dependencies

- P5-A-01 ✅ (pgvector extension)
- P5-A-02 ✅ (embeddings table + match_embeddings function)
- P5-A-03 ✅ (generate-embedding for understanding patterns)

## Downstream Tasks

- **P5-B-04** (seed knowledge base) will verify search works end-to-end
- **AI Orchestrator** will call semantic-search to augment prompts with knowledge

## Estimated Scope

~120 lines of edge function code + ~50 lines of types + ~40 lines of validation + ~300 lines of tests. Should fit within a single focused PR (<200 lines of production code).

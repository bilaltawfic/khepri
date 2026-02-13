# P5-A-03: Add Embedding Generation Edge Function

## Goal

Create a Supabase Edge Function that generates vector embeddings from text content using OpenAI's `text-embedding-3-small` model and stores them in the `embeddings` table. This is the core building block for the RAG (Retrieval-Augmented Generation) system that will provide Khepri's AI coach with exercise science knowledge.

## Current State

- pgvector extension enabled (P5-A-01 ✅)
- `embeddings` table with 1536-dimension vector column, RLS policies, and `match_embeddings` DB function (P5-A-02 ✅)
- `packages/supabase-client/src/queries/embeddings.ts` has TypeScript queries: `insertEmbedding`, `searchEmbeddings`, `deleteEmbeddingsBySource`
- No edge function exists for generating embeddings
- No OpenAI API integration exists in the project yet

## Target State

- New `generate-embedding` edge function that accepts text and returns a stored embedding
- Supports both shared knowledge (no athlete_id) and personal embeddings (athlete-specific)
- Uses OpenAI `text-embedding-3-small` (1536 dimensions, matching table schema)
- Authenticated via Supabase JWT
- Proper error handling for OpenAI API failures

## Files to Create

| File | Purpose |
|------|---------|
| `supabase/functions/generate-embedding/index.ts` | Main edge function handler |
| `supabase/functions/generate-embedding/types.ts` | Request/response type definitions |
| `supabase/functions/generate-embedding/__tests__/index.test.ts` | Unit tests |

## Files to Modify

| File | Changes |
|------|---------|
| `.env.example` | Add `OPENAI_API_KEY` variable |

## Implementation Steps

### Step 1: Define Types (`types.ts`)

```typescript
export interface GenerateEmbeddingRequest {
  /** The text content to embed */
  content: string;
  /** Title for the embedding record */
  title: string;
  /** Content classification */
  content_type: 'knowledge' | 'conversation' | 'activity';
  /** Optional reference to source document/conversation/activity */
  source_id?: string;
  /** Chunk index for documents split into parts (default: 0) */
  chunk_index?: number;
  /** Flexible metadata (tags, category, sport, etc.) */
  metadata?: Record<string, unknown>;
  /** NULL for shared knowledge, athlete UUID for personal embeddings */
  athlete_id?: string;
}

export interface GenerateEmbeddingResponse {
  /** UUID of the created embedding record */
  embedding_id: string;
  /** Vector dimensions (should always be 1536) */
  dimensions: number;
  /** Model used for embedding */
  model: string;
  /** Token count from OpenAI response */
  tokens_used: number;
}

export interface OpenAIEmbeddingResponse {
  data: Array<{
    embedding: number[];
    index: number;
  }>;
  model: string;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

export const EMBEDDING_MODEL = 'text-embedding-3-small';
export const EMBEDDING_DIMENSIONS = 1536;
export const MAX_CONTENT_LENGTH = 30000; // ~8000 tokens, safe limit for text-embedding-3-small

export const VALID_CONTENT_TYPES = ['knowledge', 'conversation', 'activity'] as const;
```

### Step 2: Create Edge Function (`index.ts`)

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';
import {
  EMBEDDING_DIMENSIONS,
  EMBEDDING_MODEL,
  GenerateEmbeddingRequest,
  GenerateEmbeddingResponse,
  MAX_CONTENT_LENGTH,
  OpenAIEmbeddingResponse,
  VALID_CONTENT_TYPES,
} from './types.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function errorResponse(error: string, status: number): Response {
  return jsonResponse({ error }, status);
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  // Verify environment variables
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (openaiApiKey == null) {
    return errorResponse('OPENAI_API_KEY not configured', 500);
  }
  if (supabaseUrl == null || supabaseServiceRoleKey == null) {
    return errorResponse('Supabase configuration missing', 500);
  }

  // Authenticate request
  const authHeader = req.headers.get('Authorization');
  if (authHeader == null) {
    return errorResponse('Missing authorization header', 401);
  }

  const supabaseAnon = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user }, error: authError } = await supabaseAnon.auth.getUser();
  if (authError != null || user == null) {
    return errorResponse('Unauthorized', 401);
  }

  // Parse and validate request body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse('Invalid JSON in request body', 400);
  }

  const validationError = validateRequest(body);
  if (validationError != null) {
    return errorResponse(validationError, 400);
  }

  const request = body as GenerateEmbeddingRequest;

  // Validate athlete_id ownership (if personal embedding)
  if (request.athlete_id != null) {
    const { data: athlete } = await supabaseAnon
      .from('athletes')
      .select('id')
      .eq('id', request.athlete_id)
      .eq('auth_user_id', user.id)
      .single();

    if (athlete == null) {
      return errorResponse('athlete_id does not belong to authenticated user', 403);
    }
  }

  // Call OpenAI Embeddings API
  let embeddingVector: number[];
  let tokensUsed: number;
  try {
    const openaiResponse = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: request.content,
        encoding_format: 'float',
      }),
    });

    if (!openaiResponse.ok) {
      const errorBody = await openaiResponse.text();
      return errorResponse(
        `OpenAI API error (${openaiResponse.status}): ${errorBody}`,
        502,
      );
    }

    const openaiData: OpenAIEmbeddingResponse = await openaiResponse.json();
    embeddingVector = openaiData.data[0].embedding;
    tokensUsed = openaiData.usage.total_tokens;

    if (embeddingVector.length !== EMBEDDING_DIMENSIONS) {
      return errorResponse(
        `Unexpected embedding dimensions: ${embeddingVector.length} (expected ${EMBEDDING_DIMENSIONS})`,
        500,
      );
    }
  } catch (err) {
    return errorResponse(
      `Failed to generate embedding: ${err instanceof Error ? err.message : 'Unknown error'}`,
      502,
    );
  }

  // Store embedding using service role client (bypasses RLS for shared knowledge)
  const supabaseService = createClient(supabaseUrl, supabaseServiceRoleKey);
  const embeddingString = `[${embeddingVector.join(',')}]`;

  const { data: inserted, error: insertError } = await supabaseService
    .from('embeddings')
    .insert({
      content_type: request.content_type,
      source_id: request.source_id ?? null,
      chunk_index: request.chunk_index ?? 0,
      title: request.title,
      content: request.content,
      metadata: request.metadata ?? {},
      embedding: embeddingString,
      athlete_id: request.athlete_id ?? null,
    })
    .select('id')
    .single();

  if (insertError != null) {
    return errorResponse(`Failed to store embedding: ${insertError.message}`, 500);
  }

  const response: GenerateEmbeddingResponse = {
    embedding_id: inserted.id,
    dimensions: EMBEDDING_DIMENSIONS,
    model: EMBEDDING_MODEL,
    tokens_used: tokensUsed,
  };

  return jsonResponse(response, 201);
});

function validateRequest(body: unknown): string | null {
  if (body == null || typeof body !== 'object') {
    return 'Request body must be an object';
  }

  const b = body as Record<string, unknown>;

  if (typeof b.content !== 'string' || b.content.length === 0) {
    return 'content is required and must be a non-empty string';
  }
  if (b.content.length > MAX_CONTENT_LENGTH) {
    return `content exceeds maximum length of ${MAX_CONTENT_LENGTH} characters`;
  }
  if (typeof b.title !== 'string' || b.title.length === 0) {
    return 'title is required and must be a non-empty string';
  }
  if (typeof b.content_type !== 'string' || !VALID_CONTENT_TYPES.includes(b.content_type as typeof VALID_CONTENT_TYPES[number])) {
    return `content_type must be one of: ${VALID_CONTENT_TYPES.join(', ')}`;
  }
  if (b.source_id != null && typeof b.source_id !== 'string') {
    return 'source_id must be a string';
  }
  if (b.chunk_index != null && (typeof b.chunk_index !== 'number' || b.chunk_index < 0)) {
    return 'chunk_index must be a non-negative number';
  }
  if (b.metadata != null && typeof b.metadata !== 'object') {
    return 'metadata must be an object';
  }
  if (b.athlete_id != null && typeof b.athlete_id !== 'string') {
    return 'athlete_id must be a string';
  }

  return null;
}
```

### Step 3: Write Tests (`__tests__/index.test.ts`)

#### Test Categories

**A. Request Validation Tests:**
1. Missing `content` → 400 error
2. Empty `content` → 400 error
3. Content exceeds max length → 400 error
4. Missing `title` → 400 error
5. Invalid `content_type` → 400 error
6. Valid content types: 'knowledge', 'conversation', 'activity' → passes
7. Invalid `chunk_index` (negative) → 400 error
8. Invalid `metadata` (not object) → 400 error
9. Invalid JSON body → 400 error

**B. Authentication Tests:**
10. Missing Authorization header → 401
11. Invalid JWT → 401
12. Valid JWT → proceeds to embedding generation

**C. Authorization Tests:**
13. Personal embedding with wrong `athlete_id` → 403
14. Personal embedding with correct `athlete_id` → proceeds
15. Shared knowledge (no `athlete_id`) → proceeds

**D. OpenAI API Tests:**
16. Successful embedding generation → 201 with embedding_id
17. OpenAI rate limit (429) → 502 error
18. OpenAI auth failure (401) → 502 error
19. OpenAI network failure → 502 error
20. Unexpected dimensions → 500 error

**E. Database Storage Tests:**
21. Successful insert → returns embedding_id
22. DB insert failure → 500 error
23. Embedding stored with correct `content_type`, `title`, `content`
24. Null `athlete_id` for shared knowledge
25. Default `chunk_index` of 0

**F. Response Format Tests:**
26. Response includes `embedding_id`, `dimensions`, `model`, `tokens_used`
27. Status code is 201 on success
28. CORS headers present in response

#### Mock Strategy

```typescript
// Mock fetch for OpenAI API
const mockOpenAIResponse = {
  data: [{ embedding: new Array(1536).fill(0.1), index: 0 }],
  model: 'text-embedding-3-small',
  usage: { prompt_tokens: 10, total_tokens: 10 },
};

// Mock Supabase client
const mockSupabase = {
  auth: {
    getUser: jest.fn().mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    }),
  },
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  single: jest.fn(),
  insert: jest.fn().mockReturnThis(),
};
```

### Step 4: Update `.env.example`

Add OpenAI API key:

```bash
# OpenAI API (for embeddings generation)
OPENAI_API_KEY=your-openai-api-key
```

## Testing Requirements

- Unit tests with mocked OpenAI API and Supabase client
- No real API calls in tests
- Follow existing edge function test patterns (see `ai-orchestrator/__tests__/`)
- Use Jest (monorepo test runner), not Deno test
- All tests pass with `pnpm test`
- Linting passes with `pnpm lint`

## Security Considerations

- **Authentication required** - All requests must include valid JWT
- **Ownership verification** - Personal embeddings require athlete_id matching auth user
- **Service role for inserts** - Uses service role client to handle both shared and personal embeddings
- **Content length limit** - Prevents abuse via excessively large content
- **No API key exposure** - OpenAI key stays server-side in environment variables

## Verification

1. `pnpm test` passes with new tests
2. `pnpm lint` passes
3. Edge function handles all error cases gracefully
4. Embedding vector has correct dimensions (1536)
5. Stored embedding can be retrieved via `searchEmbeddings` query
6. CORS headers work for browser clients
7. Authentication and authorization enforced

## Dependencies

- P5-A-01 ✅ (pgvector extension)
- P5-A-02 ✅ (embeddings table schema)

## Downstream Tasks

- **P5-A-04** (semantic search function) will use this to embed queries
- **P5-B-04** (seed knowledge base) will call this to index documents

## Estimated Scope

~150 lines of edge function code + ~50 lines of types + ~250 lines of tests. Should fit within a single focused PR.

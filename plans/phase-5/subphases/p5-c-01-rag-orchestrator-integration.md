# P5-C-01: Wire RAG Search into AI Orchestrator

## Goal

Add a `search_knowledge` tool to the MCP gateway and AI orchestrator so Claude can search the exercise science knowledge base during conversations. This completes the RAG pipeline: knowledge docs → embeddings → semantic search → available to Claude in conversations.

## Dependencies

- ✅ P5-A-04: Semantic search edge function exists
- ⬜ P5-B-04: Knowledge base seeded with embeddings (tool can be wired without data, but won't return useful results until seeded)

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `supabase/functions/mcp-gateway/tools/search-knowledge.ts` | Create | MCP tool handler |
| `supabase/functions/mcp-gateway/tools/search-knowledge.test.ts` | Create | Handler tests |
| `supabase/functions/mcp-gateway/tools/index.ts` | Modify | Register new tool |
| `supabase/functions/ai-orchestrator/prompts.ts` | Modify | Add tool definition + update system prompt |
| `packages/ai-client/src/tools/knowledge-tools.ts` | Create | Tool definition for reuse |
| `packages/ai-client/src/tools/knowledge-tools.test.ts` | Create | Definition tests |

## Implementation Steps

### Step 1: Create Tool Definition (`knowledge-tools.ts`)

```typescript
export const SEARCH_KNOWLEDGE_TOOL: Tool = {
  name: 'search_knowledge',
  description: `Search the exercise science knowledge base for training principles, recovery protocols, injury prevention, and periodization guidelines. Use this when the athlete asks about training methodology, when you need to support a recommendation with evidence, or when discussing recovery and injury management.`,
  input_schema: {
    type: 'object' as const,
    properties: {
      query: {
        type: 'string',
        description: 'Natural language search query about exercise science or training',
      },
      match_count: {
        type: 'number',
        description: 'Number of results to return (default: 3, max: 10)',
      },
    },
    required: ['query'],
  },
};
```

### Step 2: Create MCP Tool Handler (`search-knowledge.ts`)

```typescript
export const searchKnowledgeTool: MCPToolEntry = {
  definition: { ...SEARCH_KNOWLEDGE_TOOL },
  handler: async (input, _athleteId, supabase) => {
    const query = input.query;
    if (typeof query !== 'string' || query.trim().length === 0) {
      return { success: false, error: 'Query is required', code: 'INVALID_INPUT' };
    }

    const matchCount = typeof input.match_count === 'number'
      ? Math.min(Math.max(input.match_count, 1), 10)
      : 3;

    // Call semantic-search edge function via Supabase
    const { data, error } = await supabase.functions.invoke('semantic-search', {
      body: {
        query: query.trim(),
        match_count: matchCount,
        match_threshold: 0.7,
        content_type: 'knowledge',
      },
    });

    if (error) {
      return { success: false, error: `Knowledge search failed: ${error.message}`, code: 'SEARCH_ERROR' };
    }

    return {
      success: true,
      data: {
        results: data.results.map((r: SearchResult) => ({
          title: r.title,
          content: r.content,
          similarity: r.similarity,
          category: r.metadata?.category,
          tags: r.metadata?.tags,
        })),
        result_count: data.results.length,
      },
    };
  },
};
```

### Step 3: Register Tool in MCP Gateway

In `tools/index.ts`, add:
```typescript
import { searchKnowledgeTool } from './search-knowledge.js';
registerTool(searchKnowledgeTool);
```

### Step 4: Add to Orchestrator Tool Definitions

In `prompts.ts`, add `search_knowledge` to the `TOOL_DEFINITIONS` array.

Update `BASE_PROMPT` to mention the knowledge base:
```
When making recommendations about training methodology, recovery, or injury management, search the knowledge base first to ground your advice in exercise science principles.
```

### Step 5: Write Tests

**`search-knowledge.test.ts`:**
- Validates query is non-empty string
- Clamps match_count to 1-10 range
- Calls semantic-search with correct parameters
- Returns formatted results (title, content, similarity, metadata)
- Handles search function errors gracefully
- Returns empty results when no matches found

**`knowledge-tools.test.ts`:**
- Tool definition has required fields (name, description, input_schema)
- Schema requires `query` property
- `match_count` is optional

## Testing Requirements

- Unit tests with mocked `supabase.functions.invoke`
- Verify input validation (empty query, invalid match_count)
- Verify response transformation (only expose relevant fields)
- Test error handling for function invocation failures

## Verification

1. `pnpm test` passes
2. In chat, ask "What does exercise science say about recovery after hard workouts?"
3. Claude should call `search_knowledge` tool and cite knowledge base content
4. Verify tool appears in orchestrator's tool list

## Key Considerations

- **MCP pattern**: Follows existing tool registration pattern exactly
- **Content type filter**: Always filters to `content_type: 'knowledge'` (not conversations/activities)
- **Match count**: Default 3 (not 5) to keep context window manageable
- **No athlete_id needed**: Knowledge base is shared (athlete_id = NULL)
- **Depends on P5-B-04**: Tool works mechanically without seeds, but returns empty results

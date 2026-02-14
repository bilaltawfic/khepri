/**
 * Tests for the search_knowledge MCP gateway tool handler.
 *
 * Uses mocked supabase.functions.invoke to test input validation,
 * response transformation, and error handling.
 */

import { jest } from '@jest/globals';
import { searchKnowledgeTool } from '../tools/search-knowledge.ts';

// =============================================================================
// Mock helpers
// =============================================================================

interface MockInvokeResult {
  data: unknown;
  error: { message: string } | null;
}

function createMockSupabase(result: MockInvokeResult) {
  const invoke = jest.fn().mockResolvedValue(result);
  return {
    client: { functions: { invoke } } as unknown as Parameters<
      typeof searchKnowledgeTool.handler
    >[2],
    invoke,
  };
}

const ATHLETE_ID = 'athlete-uuid-123';

// =============================================================================
// Tool definition
// =============================================================================

describe('searchKnowledgeTool.definition', () => {
  it('has name "search_knowledge"', () => {
    expect(searchKnowledgeTool.definition.name).toBe('search_knowledge');
  });

  it('has a description mentioning knowledge base', () => {
    expect(searchKnowledgeTool.definition.description).toContain('knowledge base');
  });

  it('requires the query property', () => {
    expect(searchKnowledgeTool.definition.input_schema.required).toContain('query');
  });

  it('defines query and match_count properties', () => {
    const props = searchKnowledgeTool.definition.input_schema.properties;
    expect(props).toHaveProperty('query');
    expect(props).toHaveProperty('match_count');
  });
});

// =============================================================================
// Input validation
// =============================================================================

describe('searchKnowledgeTool.handler – input validation', () => {
  it('rejects missing query', async () => {
    const { client } = createMockSupabase({ data: null, error: null });
    const result = await searchKnowledgeTool.handler({}, ATHLETE_ID, client);
    expect(result).toEqual({
      success: false,
      error: 'Query is required and must be a non-empty string',
      code: 'INVALID_INPUT',
    });
  });

  it('rejects empty string query', async () => {
    const { client } = createMockSupabase({ data: null, error: null });
    const result = await searchKnowledgeTool.handler({ query: '' }, ATHLETE_ID, client);
    expect(result).toEqual({
      success: false,
      error: 'Query is required and must be a non-empty string',
      code: 'INVALID_INPUT',
    });
  });

  it('rejects whitespace-only query', async () => {
    const { client } = createMockSupabase({ data: null, error: null });
    const result = await searchKnowledgeTool.handler({ query: '   ' }, ATHLETE_ID, client);
    expect(result).toEqual({
      success: false,
      error: 'Query is required and must be a non-empty string',
      code: 'INVALID_INPUT',
    });
  });

  it('rejects non-string query', async () => {
    const { client } = createMockSupabase({ data: null, error: null });
    const result = await searchKnowledgeTool.handler({ query: 123 }, ATHLETE_ID, client);
    expect(result).toEqual({
      success: false,
      error: 'Query is required and must be a non-empty string',
      code: 'INVALID_INPUT',
    });
  });
});

// =============================================================================
// Semantic search invocation
// =============================================================================

describe('searchKnowledgeTool.handler – semantic search call', () => {
  it('calls semantic-search with correct default parameters', async () => {
    const { client, invoke } = createMockSupabase({
      data: { results: [] },
      error: null,
    });

    await searchKnowledgeTool.handler({ query: 'progressive overload' }, ATHLETE_ID, client);

    expect(invoke).toHaveBeenCalledWith('semantic-search', {
      body: {
        query: 'progressive overload',
        match_count: 3,
        match_threshold: 0.7,
        content_type: 'knowledge',
      },
    });
  });

  it('trims whitespace from query before calling', async () => {
    const { client, invoke } = createMockSupabase({
      data: { results: [] },
      error: null,
    });

    await searchKnowledgeTool.handler({ query: '  recovery protocols  ' }, ATHLETE_ID, client);

    expect(invoke).toHaveBeenCalledWith(
      'semantic-search',
      expect.objectContaining({
        body: expect.objectContaining({ query: 'recovery protocols' }),
      })
    );
  });

  it('uses provided match_count when valid', async () => {
    const { client, invoke } = createMockSupabase({
      data: { results: [] },
      error: null,
    });

    await searchKnowledgeTool.handler(
      { query: 'periodization', match_count: 5 },
      ATHLETE_ID,
      client
    );

    expect(invoke).toHaveBeenCalledWith(
      'semantic-search',
      expect.objectContaining({
        body: expect.objectContaining({ match_count: 5 }),
      })
    );
  });

  it('clamps match_count to minimum of 1', async () => {
    const { client, invoke } = createMockSupabase({
      data: { results: [] },
      error: null,
    });

    await searchKnowledgeTool.handler({ query: 'test', match_count: 0 }, ATHLETE_ID, client);

    expect(invoke).toHaveBeenCalledWith(
      'semantic-search',
      expect.objectContaining({
        body: expect.objectContaining({ match_count: 1 }),
      })
    );
  });

  it('clamps match_count to maximum of 10', async () => {
    const { client, invoke } = createMockSupabase({
      data: { results: [] },
      error: null,
    });

    await searchKnowledgeTool.handler({ query: 'test', match_count: 50 }, ATHLETE_ID, client);

    expect(invoke).toHaveBeenCalledWith(
      'semantic-search',
      expect.objectContaining({
        body: expect.objectContaining({ match_count: 10 }),
      })
    );
  });

  it('rounds fractional match_count', async () => {
    const { client, invoke } = createMockSupabase({
      data: { results: [] },
      error: null,
    });

    await searchKnowledgeTool.handler({ query: 'test', match_count: 3.7 }, ATHLETE_ID, client);

    expect(invoke).toHaveBeenCalledWith(
      'semantic-search',
      expect.objectContaining({
        body: expect.objectContaining({ match_count: 4 }),
      })
    );
  });

  it('ignores non-number match_count and uses default', async () => {
    const { client, invoke } = createMockSupabase({
      data: { results: [] },
      error: null,
    });

    await searchKnowledgeTool.handler({ query: 'test', match_count: 'five' }, ATHLETE_ID, client);

    expect(invoke).toHaveBeenCalledWith(
      'semantic-search',
      expect.objectContaining({
        body: expect.objectContaining({ match_count: 3 }),
      })
    );
  });

  it('always filters by content_type "knowledge"', async () => {
    const { client, invoke } = createMockSupabase({
      data: { results: [] },
      error: null,
    });

    await searchKnowledgeTool.handler({ query: 'test' }, ATHLETE_ID, client);

    expect(invoke).toHaveBeenCalledWith(
      'semantic-search',
      expect.objectContaining({
        body: expect.objectContaining({ content_type: 'knowledge' }),
      })
    );
  });
});

// =============================================================================
// Response formatting
// =============================================================================

describe('searchKnowledgeTool.handler – response formatting', () => {
  it('returns formatted results with title, content, similarity, and metadata', async () => {
    const { client } = createMockSupabase({
      data: {
        results: [
          {
            title: 'Progressive Overload',
            content:
              'Progressive overload is the gradual increase of stress placed on the body during training.',
            similarity: 0.92,
            metadata: { category: 'training-principles', tags: ['strength', 'hypertrophy'] },
          },
          {
            title: 'Recovery Windows',
            content:
              'Post-exercise recovery typically requires 24-72 hours depending on intensity.',
            similarity: 0.85,
            metadata: { category: 'recovery', tags: ['rest', 'adaptation'] },
          },
        ],
      },
      error: null,
    });

    const result = await searchKnowledgeTool.handler(
      { query: 'progressive overload' },
      ATHLETE_ID,
      client
    );

    expect(result).toEqual({
      success: true,
      data: {
        results: [
          {
            title: 'Progressive Overload',
            content:
              'Progressive overload is the gradual increase of stress placed on the body during training.',
            similarity: 0.92,
            category: 'training-principles',
            tags: ['strength', 'hypertrophy'],
          },
          {
            title: 'Recovery Windows',
            content:
              'Post-exercise recovery typically requires 24-72 hours depending on intensity.',
            similarity: 0.85,
            category: 'recovery',
            tags: ['rest', 'adaptation'],
          },
        ],
        result_count: 2,
      },
    });
  });

  it('returns empty results when no matches found', async () => {
    const { client } = createMockSupabase({
      data: { results: [] },
      error: null,
    });

    const result = await searchKnowledgeTool.handler(
      { query: 'quantum physics' },
      ATHLETE_ID,
      client
    );

    expect(result).toEqual({
      success: true,
      data: {
        results: [],
        result_count: 0,
      },
    });
  });

  it('handles results without metadata gracefully', async () => {
    const { client } = createMockSupabase({
      data: {
        results: [
          {
            title: 'No Metadata',
            content: 'Some content without metadata fields.',
            similarity: 0.78,
          },
        ],
      },
      error: null,
    });

    const result = await searchKnowledgeTool.handler({ query: 'test' }, ATHLETE_ID, client);

    expect(result).toEqual({
      success: true,
      data: {
        results: [
          {
            title: 'No Metadata',
            content: 'Some content without metadata fields.',
            similarity: 0.78,
            category: undefined,
            tags: undefined,
          },
        ],
        result_count: 1,
      },
    });
  });

  it('handles null data.results as empty array', async () => {
    const { client } = createMockSupabase({
      data: { results: null },
      error: null,
    });

    const result = await searchKnowledgeTool.handler({ query: 'test' }, ATHLETE_ID, client);

    expect(result).toEqual({
      success: true,
      data: {
        results: [],
        result_count: 0,
      },
    });
  });
});

// =============================================================================
// Error handling
// =============================================================================

describe('searchKnowledgeTool.handler – error handling', () => {
  it('returns error when semantic-search invocation fails', async () => {
    const { client } = createMockSupabase({
      data: null,
      error: { message: 'Function not found' },
    });

    const result = await searchKnowledgeTool.handler(
      { query: 'recovery protocols' },
      ATHLETE_ID,
      client
    );

    expect(result).toEqual({
      success: false,
      error: 'Knowledge search failed: Function not found',
      code: 'SEARCH_ERROR',
    });
  });

  it('returns error when invocation returns network error', async () => {
    const { client } = createMockSupabase({
      data: null,
      error: { message: 'Network timeout' },
    });

    const result = await searchKnowledgeTool.handler(
      { query: 'training load' },
      ATHLETE_ID,
      client
    );

    expect(result).toEqual({
      success: false,
      error: 'Knowledge search failed: Network timeout',
      code: 'SEARCH_ERROR',
    });
  });
});

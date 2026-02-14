import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';
import type { MCPToolEntry, MCPToolResult } from '../types.ts';

/**
 * Shape of a single knowledge base search result
 * returned by the semantic-search edge function.
 */
interface SearchResult {
  title: string;
  content: string;
  similarity: number;
  metadata?: {
    category?: string;
    tags?: string[];
  };
}

/**
 * Tool definition for search_knowledge.
 */
const definition = {
  name: 'search_knowledge',
  description:
    'Search the exercise science knowledge base for training principles, recovery protocols, injury prevention, and periodization guidelines. Use this when the athlete asks about training methodology, when you need to support a recommendation with evidence, or when discussing recovery and injury management.',
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
    required: ['query'] as const,
  },
};

/**
 * Validate and parse input for the search_knowledge tool.
 */
function parseInput(input: Record<string, unknown>): {
  query: string;
  matchCount: number;
} | null {
  const { query, match_count } = input;

  if (typeof query !== 'string' || query.trim().length === 0) {
    return null;
  }

  let matchCount = 3;
  if (typeof match_count === 'number') {
    matchCount = Math.min(Math.max(Math.round(match_count), 1), 10);
  }

  return { query: query.trim(), matchCount };
}

/**
 * Handler for the search_knowledge tool.
 * Calls the semantic-search edge function via Supabase.
 */
async function handler(
  input: Record<string, unknown>,
  _athleteId: string,
  supabase: SupabaseClient
): Promise<MCPToolResult> {
  const parsed = parseInput(input);
  if (parsed == null) {
    return {
      success: false,
      error: 'Query is required and must be a non-empty string',
      code: 'INVALID_INPUT',
    };
  }

  const { query, matchCount } = parsed;

  const { data, error } = await supabase.functions.invoke('semantic-search', {
    body: {
      query,
      match_count: matchCount,
      match_threshold: 0.7,
      content_type: 'knowledge',
    },
  });

  if (error != null) {
    return {
      success: false,
      error: `Knowledge search failed: ${error.message}`,
      code: 'SEARCH_ERROR',
    };
  }

  const results: SearchResult[] = Array.isArray(data?.results) ? data.results : [];

  return {
    success: true,
    data: {
      results: results.map((r: SearchResult) => ({
        title: r.title,
        content: r.content,
        similarity: r.similarity,
        category: r.metadata?.category,
        tags: r.metadata?.tags,
      })),
      result_count: results.length,
    },
  };
}

/**
 * MCP tool entry for search_knowledge.
 */
export const searchKnowledgeTool: MCPToolEntry = { definition, handler };

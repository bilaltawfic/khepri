/**
 * Knowledge Base Tool Definitions
 *
 * Tool definitions for Claude to search the exercise science
 * knowledge base via RAG (Retrieval-Augmented Generation).
 */

import type { Tool } from '@anthropic-ai/sdk/resources/messages';

/**
 * Tool definition for searching the exercise science knowledge base.
 * Claude uses this to ground training recommendations in evidence.
 */
export const SEARCH_KNOWLEDGE_TOOL: Tool = {
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
    required: ['query'],
  },
};

/**
 * All knowledge base tools.
 */
export const KNOWLEDGE_TOOLS: Tool[] = [SEARCH_KNOWLEDGE_TOOL];

/**
 * Tests for Knowledge Base Tool Definitions
 *
 * Verifies the tool definitions for the exercise science
 * knowledge base search are correctly structured.
 */

import { describe, expect, it } from '@jest/globals';
import { KNOWLEDGE_TOOLS, SEARCH_KNOWLEDGE_TOOL } from '../tools/knowledge-tools.js';

// =============================================================================
// SEARCH_KNOWLEDGE_TOOL TESTS
// =============================================================================

describe('SEARCH_KNOWLEDGE_TOOL', () => {
  it('has correct name', () => {
    expect(SEARCH_KNOWLEDGE_TOOL.name).toBe('search_knowledge');
  });

  it('has description explaining its purpose', () => {
    expect(SEARCH_KNOWLEDGE_TOOL.description).toContain('knowledge base');
    expect(SEARCH_KNOWLEDGE_TOOL.description).toContain('exercise science');
  });

  it('requires query parameter', () => {
    const schema = SEARCH_KNOWLEDGE_TOOL.input_schema;
    expect(schema.required).toContain('query');
  });

  it('does not require match_count parameter', () => {
    const schema = SEARCH_KNOWLEDGE_TOOL.input_schema;
    expect(schema.required).not.toContain('match_count');
  });

  it('defines query as string type', () => {
    const schema = SEARCH_KNOWLEDGE_TOOL.input_schema;
    expect(schema.properties?.query).toEqual({
      type: 'string',
      description: expect.stringContaining('search query'),
    });
  });

  it('defines match_count as number type', () => {
    const schema = SEARCH_KNOWLEDGE_TOOL.input_schema;
    expect(schema.properties?.match_count).toEqual({
      type: 'number',
      description: expect.stringContaining('default: 3'),
    });
  });

  it('has object type schema', () => {
    expect(SEARCH_KNOWLEDGE_TOOL.input_schema.type).toBe('object');
  });
});

// =============================================================================
// KNOWLEDGE_TOOLS COLLECTION TESTS
// =============================================================================

describe('KNOWLEDGE_TOOLS', () => {
  it('contains 1 tool', () => {
    expect(KNOWLEDGE_TOOLS).toHaveLength(1);
  });

  it('includes SEARCH_KNOWLEDGE_TOOL', () => {
    expect(KNOWLEDGE_TOOLS).toContain(SEARCH_KNOWLEDGE_TOOL);
  });

  it('all tools have unique names', () => {
    const names = KNOWLEDGE_TOOLS.map((tool) => tool.name);
    const uniqueNames = new Set(names);
    expect(uniqueNames.size).toBe(names.length);
  });
});

# RAG Orchestrator Integration

**Date:** 2026-02-14
**Task:** P5-C-01 - Wire RAG Search into AI Orchestrator
**Branch:** feat/p5-c-01-rag-orchestrator-integration

## Goals

Wire the semantic search capability into the AI orchestrator so Claude can search the exercise science knowledge base during conversations. This completes the RAG pipeline: knowledge docs -> embeddings -> semantic search -> available to Claude.

## Key Decisions

1. **Tool definition in ai-client package**: Created `SEARCH_KNOWLEDGE_TOOL` in `packages/ai-client/src/tools/knowledge-tools.ts` following the exact same pattern as `intervals-tools.ts` for consistency.

2. **MCP gateway handler**: Created `search-knowledge.ts` that invokes the existing `semantic-search` edge function with `content_type: 'knowledge'` to filter results to knowledge base content only.

3. **Input validation**: Query must be a non-empty string; `match_count` defaults to 3, clamped to 1-10 range, fractional values rounded.

4. **Response transformation**: Results are mapped to expose only `title`, `content`, `similarity`, `category`, and `tags` - stripping internal metadata.

5. **Orchestrator prompt update**: Added `search_knowledge` to the capabilities list and added guideline #2 "Ground advice in science" to instruct Claude to use the knowledge base proactively.

## Files Changed

### Created
- `packages/ai-client/src/tools/knowledge-tools.ts` - Tool definition for Claude SDK
- `packages/ai-client/src/__tests__/knowledge-tools.test.ts` - Definition tests (7 tests)
- `supabase/functions/mcp-gateway/tools/search-knowledge.ts` - MCP gateway tool handler
- `supabase/functions/mcp-gateway/__tests__/search-knowledge.test.ts` - Handler tests (18 tests)

### Modified
- `packages/ai-client/src/tools/index.ts` - Export knowledge tools
- `packages/ai-client/src/index.ts` - Barrel export for knowledge tools
- `supabase/functions/mcp-gateway/tools/index.ts` - Register searchKnowledgeTool
- `supabase/functions/ai-orchestrator/prompts.ts` - Add tool definition + update system prompt
- `supabase/jest.config.js` - Add coverage for search-knowledge handler

## Learnings

- Supabase edge function tests use ESM and require explicit `import { jest } from '@jest/globals'` - unlike Node CJS where `jest` is global.
- Biome enforces single-quoted strings over template literals when no interpolation is used.
- The tool definition is duplicated across three locations (ai-client, mcp-gateway, ai-orchestrator) - these must be kept in sync manually.

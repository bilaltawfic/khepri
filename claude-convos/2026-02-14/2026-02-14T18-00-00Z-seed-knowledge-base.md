# P5-B-04: Seed Knowledge Base with Embeddings

## Date
2026-02-14

## Goals
- Create a TypeScript seed script that reads knowledge documents from `docs/knowledge/`, chunks them by H2 sections, generates embeddings via the `generate-embedding` edge function, and inserts them into the `embeddings` table
- Implement a markdown chunk parser for front-matter and H2-based splitting
- Make the seed script idempotent (deletes existing embeddings before re-inserting)
- Write comprehensive unit tests for both the parser and seed orchestration

## Key Decisions

1. **Simple YAML front-matter parser**: Instead of adding a `yaml` dependency, wrote a lightweight parser that handles quoted strings and JSON-style arrays — sufficient for the well-defined knowledge document format.

2. **Dependency injection for testability**: Used a `SeedDeps` interface to inject IO operations (readDir, readFile, fetch, delay) rather than mocking Node.js modules. This avoids ESM `jest.mock()` compatibility issues and produces cleaner, more maintainable tests.

3. **Retry with exponential backoff**: The seed script retries failed embedding API calls up to 3 times with exponential backoff (500ms, 1000ms, 2000ms) and continues processing on individual chunk failures.

4. **Rate limiting**: Added a 200ms delay between API calls to respect rate limits on the embedding service.

5. **CLI guard for tests**: Used `import.meta.url` comparison to prevent the CLI entry point from executing when the module is imported by tests.

## Files Changed

| File | Action | Purpose |
|------|--------|---------|
| `supabase/seed/chunk-parser.ts` | Created | Markdown front-matter parsing and H2-based document chunking |
| `supabase/seed/chunk-parser.test.ts` | Created | 18 unit tests for chunk parsing (front-matter, H2 splitting, edge cases) |
| `supabase/seed/seed-knowledge.ts` | Created | Seed script orchestration with retry, rate limiting, and dry run support |
| `supabase/seed/seed-knowledge.test.ts` | Created | 12 unit tests for seed orchestration using dependency injection |
| `supabase/jest.config.js` | Modified | Added seed directory to testMatch and collectCoverageFrom |
| `supabase/package.json` | Modified | Added `seed:knowledge` npm script |

## Learnings

- ESM mode with `node --experimental-vm-modules` doesn't support `jest.mock()` — dependency injection is the cleanest testing approach
- The supabase package relies on ts-jest for type checking (no separate `typecheck` script)
- Biome formatter preferences: single-line function signatures when they fit, no trailing commas in function parameters

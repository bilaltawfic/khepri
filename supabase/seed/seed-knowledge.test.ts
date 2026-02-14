import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  type SeedDeps,
  defaultReadDir,
  defaultReadFile,
  findMarkdownFiles,
  seedKnowledgeBase,
} from './seed-knowledge.ts';

// =============================================================================
// Test fixtures
// =============================================================================

const SAMPLE_DOC = `---
title: "Test Doc"
category: "training-load"
tags: ["test"]
sport: "triathlon"
difficulty: "beginner"
source_id: "training-load/test-doc"
---

# Test Doc

## Section One

First section content about training load.

## Section Two

Second section content about recovery.
`;

// =============================================================================
// Mock helpers
// =============================================================================

function createMockFetch(
  responses: Array<{
    ok: boolean;
    status?: number;
    body?: unknown;
    text?: string;
  }>
): SeedDeps['fetchFn'] & { calls: Array<[string, RequestInit]> } {
  let callIndex = 0;
  const calls: Array<[string, RequestInit]> = [];

  const mockFn = (async (url: string, init: RequestInit) => {
    calls.push([url, init]);
    const response = responses[callIndex++];
    if (response == null) {
      throw new Error(`Unexpected fetch call #${callIndex}: ${url}`);
    }
    return {
      ok: response.ok,
      status: response.status ?? (response.ok ? 200 : 500),
      json: async () => response.body,
      text: async () => response.text ?? '',
    } as Response;
  }) as SeedDeps['fetchFn'] & { calls: Array<[string, RequestInit]> };

  mockFn.calls = calls;
  return mockFn;
}

function createMockDeps(overrides: Partial<SeedDeps> = {}): SeedDeps {
  return {
    readDir: () => [],
    readFile: () => '',
    fetchFn: createMockFetch([]),
    delay: async () => {},
    ...overrides,
  };
}

/** Create a readDir that returns entries for a flat directory of .md files */
function flatReadDir(fileNames: string[]): SeedDeps['readDir'] {
  return () => fileNames.map((name) => ({ name, isFile: true, isDirectory: false }));
}

/** Create a readDir that supports one level of subdirectories */
function nestedReadDir(tree: Record<string, string[]>): SeedDeps['readDir'] {
  return (dir: string) => {
    // Root level: return subdirectory entries + any root-level files
    for (const [subdir, files] of Object.entries(tree)) {
      if (dir.endsWith(subdir)) {
        return files.map((name) => ({
          name,
          isFile: true,
          isDirectory: false,
        }));
      }
    }
    // Root: return subdirectory names
    return Object.keys(tree).map((name) => ({
      name,
      isFile: false,
      isDirectory: true,
    }));
  };
}

// Suppress console output during tests
const originalConsole = { ...console };
beforeEach(() => {
  console.log = () => {};
  console.warn = () => {};
  console.error = () => {};
});
afterEach(() => {
  console.log = originalConsole.log;
  console.warn = originalConsole.warn;
  console.error = originalConsole.error;
});

// =============================================================================
// findMarkdownFiles
// =============================================================================

describe('findMarkdownFiles', () => {
  it('finds .md files recursively, skipping README.md', () => {
    const readDir = nestedReadDir({
      'training-load': ['progressive-overload.md'],
    });
    // Override root to also include README.md
    const readDirWithReadme: SeedDeps['readDir'] = (dir) => {
      if (dir === '/docs/knowledge') {
        return [
          { name: 'README.md', isFile: true, isDirectory: false },
          { name: 'training-load', isFile: false, isDirectory: true },
        ];
      }
      return readDir(dir);
    };

    const files = findMarkdownFiles('/docs/knowledge', readDirWithReadme);
    expect(files).toEqual(['/docs/knowledge/training-load/progressive-overload.md']);
  });

  it('returns sorted file paths', () => {
    const readDir = flatReadDir(['b-file.md', 'a-file.md']);
    const files = findMarkdownFiles('/docs', readDir);
    expect(files).toEqual(['/docs/a-file.md', '/docs/b-file.md']);
  });

  it('returns empty array for empty directory', () => {
    const files = findMarkdownFiles('/empty', () => []);
    expect(files).toEqual([]);
  });
});

// =============================================================================
// seedKnowledgeBase – orchestration
// =============================================================================

describe('seedKnowledgeBase', () => {
  const BASE_CONFIG = {
    supabaseUrl: 'http://localhost:54321',
    supabaseServiceKey: 'test-key',
    knowledgeDir: '/docs/knowledge',
  };

  it('returns correct summary counts', async () => {
    const mockFetch = createMockFetch([
      { ok: true }, // delete
      { ok: true, body: { embedding_id: 'emb-1' } }, // chunk 1
      { ok: true, body: { embedding_id: 'emb-2' } }, // chunk 2
    ]);

    const result = await seedKnowledgeBase(BASE_CONFIG, {
      readDir: flatReadDir(['test-doc.md']),
      readFile: () => SAMPLE_DOC,
      fetchFn: mockFetch,
      delay: async () => {},
    });

    expect(result.documentsFound).toBe(1);
    expect(result.chunksGenerated).toBe(2);
    expect(result.embeddingsCreated).toBe(2);
    expect(result.errors).toHaveLength(0);
  });

  it('calls deleteEmbeddingsBySource before generating embeddings', async () => {
    const mockFetch = createMockFetch([
      { ok: true }, // delete
      { ok: true, body: { embedding_id: 'emb-1' } },
      { ok: true, body: { embedding_id: 'emb-2' } },
    ]);

    await seedKnowledgeBase(BASE_CONFIG, {
      readDir: flatReadDir(['test-doc.md']),
      readFile: () => SAMPLE_DOC,
      fetchFn: mockFetch,
      delay: async () => {},
    });

    const deleteCall = mockFetch.calls[0];
    expect(deleteCall[0]).toContain('/rest/v1/embeddings');
    expect(deleteCall[0]).toContain('source_id=eq.training-load%2Ftest-doc');
    expect(deleteCall[1].method).toBe('DELETE');
  });

  it('calls generate-embedding for each chunk with correct payload', async () => {
    const mockFetch = createMockFetch([
      { ok: true }, // delete
      { ok: true, body: { embedding_id: 'emb-1' } },
      { ok: true, body: { embedding_id: 'emb-2' } },
    ]);

    await seedKnowledgeBase(BASE_CONFIG, {
      readDir: flatReadDir(['test-doc.md']),
      readFile: () => SAMPLE_DOC,
      fetchFn: mockFetch,
      delay: async () => {},
    });

    const embedCall = mockFetch.calls[1];
    expect(embedCall[0]).toBe('http://localhost:54321/functions/v1/generate-embedding');
    expect(embedCall[1].method).toBe('POST');

    const body = JSON.parse(embedCall[1].body as string);
    expect(body.content_type).toBe('knowledge');
    expect(body.source_id).toBe('training-load/test-doc');
    expect(body.chunk_index).toBe(0);
    expect(body.metadata).toEqual({
      category: 'training-load',
      tags: ['test'],
      sport: 'triathlon',
      difficulty: 'beginner',
    });
  });

  it('handles API errors gracefully and continues', async () => {
    const mockFetch = createMockFetch([
      { ok: true }, // delete
      { ok: false, status: 500, text: 'Internal error' }, // chunk 1 attempt 1
      { ok: false, status: 500, text: 'Internal error' }, // chunk 1 attempt 2
      { ok: false, status: 500, text: 'Internal error' }, // chunk 1 attempt 3
      { ok: true, body: { embedding_id: 'emb-2' } }, // chunk 2
    ]);

    const result = await seedKnowledgeBase(BASE_CONFIG, {
      readDir: flatReadDir(['test-doc.md']),
      readFile: () => SAMPLE_DOC,
      fetchFn: mockFetch,
      delay: async () => {},
    });

    expect(result.embeddingsCreated).toBe(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].chunk_index).toBe(0);
  });

  it('does not call API in dry run mode', async () => {
    const mockFetch = createMockFetch([]);

    const result = await seedKnowledgeBase(
      { ...BASE_CONFIG, dryRun: true },
      {
        readDir: flatReadDir(['test-doc.md']),
        readFile: () => SAMPLE_DOC,
        fetchFn: mockFetch,
        delay: async () => {},
      }
    );

    expect(mockFetch.calls).toHaveLength(0);
    expect(result.documentsFound).toBe(1);
    expect(result.chunksGenerated).toBe(2);
    expect(result.embeddingsCreated).toBe(0);
  });

  it('returns zero counts when no files are found', async () => {
    const result = await seedKnowledgeBase(BASE_CONFIG, createMockDeps());

    expect(result.documentsFound).toBe(0);
    expect(result.chunksGenerated).toBe(0);
    expect(result.embeddingsCreated).toBe(0);
    expect(result.errors).toHaveLength(0);
  });

  it('handles parse errors for individual documents', async () => {
    const result = await seedKnowledgeBase(BASE_CONFIG, {
      readDir: flatReadDir(['bad-doc.md']),
      readFile: () => 'No front matter here',
      fetchFn: createMockFetch([]),
      delay: async () => {},
    });

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].chunk_index).toBe(-1);
    expect(result.errors[0].error).toContain('front-matter');
  });

  it('handles delete embeddings failure', async () => {
    const mockFetch = createMockFetch([
      { ok: false, status: 500, text: 'DB error' }, // delete fails
    ]);

    const result = await seedKnowledgeBase(BASE_CONFIG, {
      readDir: flatReadDir(['test-doc.md']),
      readFile: () => SAMPLE_DOC,
      fetchFn: mockFetch,
      delay: async () => {},
    });

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].error).toContain('Failed to delete embeddings');
  });

  it('processes multiple documents', async () => {
    const doc2 = `---
title: "Doc Two"
category: "recovery"
tags: ["sleep"]
sport: "general"
difficulty: "beginner"
source_id: "recovery/doc-two"
---

# Doc Two

## One Section

Content here.
`;

    let fileIndex = 0;
    const mockFetch = createMockFetch([
      { ok: true }, // delete doc 1
      { ok: true, body: { embedding_id: 'emb-1' } },
      { ok: true, body: { embedding_id: 'emb-2' } },
      { ok: true }, // delete doc 2
      { ok: true, body: { embedding_id: 'emb-3' } },
    ]);

    const result = await seedKnowledgeBase(BASE_CONFIG, {
      readDir: flatReadDir(['doc-one.md', 'doc-two.md']),
      readFile: () => {
        const docs = [SAMPLE_DOC, doc2];
        return docs[fileIndex++];
      },
      fetchFn: mockFetch,
      delay: async () => {},
    });

    expect(result.documentsFound).toBe(2);
    expect(result.chunksGenerated).toBe(3);
    expect(result.embeddingsCreated).toBe(3);
    expect(result.errors).toHaveLength(0);
  });

  it('fails fast on non-transient 4xx errors without retrying', async () => {
    const mockFetch = createMockFetch([
      { ok: true }, // delete
      { ok: false, status: 400, text: 'Bad Request' }, // chunk 1 fails immediately
      { ok: true, body: { embedding_id: 'emb-2' } }, // chunk 2
    ]);

    const result = await seedKnowledgeBase(BASE_CONFIG, {
      readDir: flatReadDir(['test-doc.md']),
      readFile: () => SAMPLE_DOC,
      fetchFn: mockFetch,
      delay: async () => {},
    });

    expect(result.embeddingsCreated).toBe(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].error).toContain('400');
    // 1 delete + 1 attempt for chunk 1 (no retries) + 1 for chunk 2 = 3
    expect(mockFetch.calls).toHaveLength(3);
  });

  it('retries on transient failure then succeeds', async () => {
    const mockFetch = createMockFetch([
      { ok: true }, // delete
      { ok: false, status: 503, text: 'Service Unavailable' }, // chunk 1 attempt 1
      { ok: true, body: { embedding_id: 'emb-1' } }, // chunk 1 attempt 2 succeeds
      { ok: true, body: { embedding_id: 'emb-2' } }, // chunk 2
    ]);

    const result = await seedKnowledgeBase(BASE_CONFIG, {
      readDir: flatReadDir(['test-doc.md']),
      readFile: () => SAMPLE_DOC,
      fetchFn: mockFetch,
      delay: async () => {},
    });

    expect(result.embeddingsCreated).toBe(2);
    expect(result.errors).toHaveLength(0);
    // 1 delete + 2 embed attempts for chunk 1 + 1 for chunk 2 = 4
    expect(mockFetch.calls).toHaveLength(4);
  });
});

// =============================================================================
// Default dependencies (real file system)
// =============================================================================

describe('defaultReadDir', () => {
  it('reads the actual knowledge directory', () => {
    const knowledgeDir = path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      '../../docs/knowledge'
    );
    const entries = defaultReadDir(knowledgeDir);
    expect(entries.length).toBeGreaterThan(0);

    const readmeEntry = entries.find((e) => e.name === 'README.md');
    expect(readmeEntry).toBeDefined();
    expect(readmeEntry?.isFile).toBe(true);
    expect(readmeEntry?.isDirectory).toBe(false);

    const dirEntry = entries.find((e) => e.name === 'training-load');
    expect(dirEntry).toBeDefined();
    expect(dirEntry?.isFile).toBe(false);
    expect(dirEntry?.isDirectory).toBe(true);
  });
});

describe('defaultReadFile', () => {
  it('reads a real knowledge document', () => {
    const filePath = path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      '../../docs/knowledge/training-load/progressive-overload.md'
    );
    const content = defaultReadFile(filePath);
    expect(content).toContain('Progressive Overload');
    expect(content).toContain('source_id:');
  });
});

describe('findMarkdownFiles with real file system', () => {
  it('finds markdown knowledge documents (excluding README)', () => {
    const knowledgeDir = path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      '../../docs/knowledge'
    );
    const files = findMarkdownFiles(knowledgeDir, defaultReadDir);
    expect(files.length).toBeGreaterThan(0);
    expect(files.every((f) => f.endsWith('.md'))).toBe(true);
    expect(files.every((f) => !f.endsWith('README.md'))).toBe(true);
    // Verify a known document is included
    expect(files.some((f) => f.includes('progressive-overload.md'))).toBe(true);
  });
});

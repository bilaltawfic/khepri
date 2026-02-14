import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

import { type DocumentChunk, parseBodyChunks, parseFrontMatter } from './chunk-parser.ts';

// =============================================================================
// Types
// =============================================================================

export interface SeedConfig {
  readonly supabaseUrl: string;
  readonly supabaseServiceKey: string;
  /** User JWT for edge function auth (falls back to service key if not provided) */
  readonly edgeFunctionToken?: string;
  readonly knowledgeDir: string;
  readonly dryRun?: boolean;
}

export interface SeedError {
  readonly file: string;
  readonly chunk_index: number;
  readonly error: string;
}

export interface SeedResult {
  readonly documentsFound: number;
  readonly chunksGenerated: number;
  readonly embeddingsCreated: number;
  readonly errors: readonly SeedError[];
}

/** Injectable IO dependencies for testing */
export interface SeedDeps {
  readonly readDir: (dir: string) => Array<{ name: string; isFile: boolean; isDirectory: boolean }>;
  readonly readFile: (filePath: string) => string;
  readonly fetchFn: typeof fetch;
  readonly delay: (ms: number) => Promise<void>;
}

// =============================================================================
// Constants
// =============================================================================

const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 500;
const INTER_REQUEST_DELAY_MS = 200;

// =============================================================================
// Default dependencies (real IO)
// =============================================================================

export function defaultReadDir(
  dir: string
): Array<{ name: string; isFile: boolean; isDirectory: boolean }> {
  return fs.readdirSync(dir, { withFileTypes: true }).map((entry) => ({
    name: entry.name,
    isFile: entry.isFile(),
    isDirectory: entry.isDirectory(),
  }));
}

export function defaultReadFile(filePath: string): string {
  return fs.readFileSync(filePath, 'utf-8');
}

function defaultDelay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const DEFAULT_DEPS: SeedDeps = {
  readDir: defaultReadDir,
  readFile: defaultReadFile,
  fetchFn: globalThis.fetch,
  delay: defaultDelay,
};

// =============================================================================
// Helpers
// =============================================================================

/** Recursively find all .md files in a directory, skipping README.md */
export function findMarkdownFiles(dir: string, readDir: SeedDeps['readDir']): string[] {
  const files: string[] = [];

  function walk(current: string): void {
    const entries = readDir(current);
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory) {
        walk(fullPath);
      } else if (entry.isFile && entry.name.endsWith('.md') && entry.name !== 'README.md') {
        files.push(fullPath);
      }
    }
  }

  walk(dir);
  return files.sort((a, b) => a.localeCompare(b));
}

/** Extract a human-readable error message from an unknown caught value */
function extractErrorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

/** Delete existing embeddings for a source_id to ensure idempotent re-runs */
async function deleteEmbeddingsBySource(
  supabaseUrl: string,
  serviceKey: string,
  sourceId: string,
  fetchFn: typeof fetch
): Promise<void> {
  const url = `${supabaseUrl}/rest/v1/embeddings?source_id=eq.${encodeURIComponent(sourceId)}&content_type=eq.knowledge`;
  const response = await fetchFn(url, {
    method: 'DELETE',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Failed to delete embeddings for ${sourceId}: ${response.status} ${body}`);
  }
}

/** Call the generate-embedding edge function with retries */
async function generateEmbedding(
  supabaseUrl: string,
  authToken: string,
  chunk: DocumentChunk,
  fetchFn: typeof fetch,
  delayFn: SeedDeps['delay']
): Promise<string> {
  const url = `${supabaseUrl}/functions/v1/generate-embedding`;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const response = await fetchFn(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: chunk.content,
        title: chunk.title,
        content_type: 'knowledge',
        source_id: chunk.metadata.source_id,
        chunk_index: chunk.chunk_index,
        metadata: {
          category: chunk.metadata.category,
          tags: chunk.metadata.tags,
          sport: chunk.metadata.sport,
          difficulty: chunk.metadata.difficulty,
        },
      }),
    });

    if (response.ok) {
      const data = (await response.json()) as { embedding_id: string };
      return data.embedding_id;
    }

    const errorBody = await response.text();
    const isTransient = response.status === 429 || response.status >= 500;

    if (isTransient && attempt < MAX_RETRIES) {
      const retryDelay = INITIAL_RETRY_DELAY_MS * 2 ** (attempt - 1);
      console.warn(
        `  Retry ${attempt}/${MAX_RETRIES} for chunk ${chunk.chunk_index}: ${response.status} – waiting ${retryDelay}ms`
      );
      await delayFn(retryDelay);
    } else {
      throw new Error(`generate-embedding failed (${response.status}): ${errorBody}`);
    }
  }

  /* istanbul ignore next -- unreachable, satisfies TypeScript */
  throw new Error('Exhausted retries');
}

/** Embed all chunks for a single document, collecting errors along the way */
async function embedChunks(
  chunks: readonly DocumentChunk[],
  relativePath: string,
  supabaseUrl: string,
  authToken: string,
  fetchFn: typeof fetch,
  delayFn: SeedDeps['delay'],
  errors: SeedError[]
): Promise<number> {
  let count = 0;
  for (const chunk of chunks) {
    try {
      await generateEmbedding(supabaseUrl, authToken, chunk, fetchFn, delayFn);
      count++;
    } catch (err) {
      const message = extractErrorMessage(err, 'Failed to generate embedding');
      console.error(`  ERROR embedding chunk ${chunk.chunk_index} of ${relativePath}: ${message}`);
      errors.push({ file: relativePath, chunk_index: chunk.chunk_index, error: message });
    }
    await delayFn(INTER_REQUEST_DELAY_MS);
  }
  return count;
}

// =============================================================================
// Main seed function
// =============================================================================

export async function seedKnowledgeBase(
  config: SeedConfig,
  deps: SeedDeps = DEFAULT_DEPS
): Promise<SeedResult> {
  const { supabaseUrl, supabaseServiceKey, edgeFunctionToken, knowledgeDir, dryRun } = config;
  const { readDir, readFile, fetchFn, delay: delayFn } = deps;
  const authToken = edgeFunctionToken ?? supabaseServiceKey;

  const files = findMarkdownFiles(knowledgeDir, readDir);
  console.log(`Found ${files.length} knowledge documents in ${knowledgeDir}`);

  if (files.length === 0) {
    return { documentsFound: 0, chunksGenerated: 0, embeddingsCreated: 0, errors: [] };
  }

  let totalChunks = 0;
  let totalEmbeddings = 0;
  const errors: SeedError[] = [];

  for (let i = 0; i < files.length; i++) {
    const filePath = files[i];
    const relativePath = path.relative(knowledgeDir, filePath);
    const rawContent = readFile(filePath);

    // Parse front-matter once; reuse metadata for both sourceId and chunking
    let metadata;
    try {
      metadata = parseFrontMatter(rawContent);
    } catch (err) {
      const message = extractErrorMessage(err, 'Failed to parse front-matter');
      console.error(`  ERROR parsing ${relativePath}: ${message}`);
      errors.push({ file: relativePath, chunk_index: -1, error: message });
      continue;
    }

    const sourceId = metadata.source_id;
    const chunks = parseBodyChunks(metadata, rawContent);

    totalChunks += chunks.length;

    if (dryRun) {
      console.log(`[${i + 1}/${files.length}] ${relativePath}: ${chunks.length} chunks (dry run)`);
      continue;
    }

    try {
      await deleteEmbeddingsBySource(supabaseUrl, supabaseServiceKey, sourceId, fetchFn);
    } catch (err) {
      const message = extractErrorMessage(err, 'Failed to delete embeddings');
      console.error(`  ERROR deleting embeddings for ${relativePath}: ${message}`);
      errors.push({ file: relativePath, chunk_index: -1, error: message });
      continue;
    }

    const docEmbeddings = await embedChunks(
      chunks,
      relativePath,
      supabaseUrl,
      authToken,
      fetchFn,
      delayFn,
      errors
    );
    totalEmbeddings += docEmbeddings;
    console.log(`[${i + 1}/${files.length}] ${relativePath}: ${docEmbeddings} chunks embedded`);
  }

  return {
    documentsFound: files.length,
    chunksGenerated: totalChunks,
    embeddingsCreated: totalEmbeddings,
    errors,
  };
}

// =============================================================================
// CLI entry point
// =============================================================================

/* istanbul ignore next -- CLI wrapper, tested via integration */
async function main(): Promise<void> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const edgeFunctionToken = process.env.SUPABASE_SEED_USER_JWT;
  const dryRun = process.argv.includes('--dry-run');

  if (supabaseUrl == null || supabaseUrl === '') {
    console.error('SUPABASE_URL environment variable is required');
    process.exit(1);
  }

  if (supabaseServiceKey == null || supabaseServiceKey === '') {
    console.error('SUPABASE_SERVICE_ROLE_KEY environment variable is required');
    process.exit(1);
  }

  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const knowledgeDir = path.resolve(scriptDir, '../../docs/knowledge');

  if (!fs.existsSync(knowledgeDir)) {
    console.error(`Knowledge directory not found: ${knowledgeDir}`);
    process.exit(1);
  }

  console.log(dryRun ? '=== DRY RUN ===' : '=== Seeding Knowledge Base ===');
  console.log(`Supabase URL: ${supabaseUrl}`);
  console.log(`Knowledge dir: ${knowledgeDir}`);
  console.log('');

  const result = await seedKnowledgeBase({
    supabaseUrl,
    supabaseServiceKey,
    edgeFunctionToken,
    knowledgeDir,
    dryRun,
  });

  console.log('');
  console.log('=== Summary ===');
  console.log(`Documents processed: ${result.documentsFound}`);
  console.log(`Chunks generated: ${result.chunksGenerated}`);
  console.log(`Embeddings created: ${result.embeddingsCreated}`);

  if (result.errors.length > 0) {
    console.error(`Errors: ${result.errors.length}`);
    for (const err of result.errors) {
      console.error(`  - ${err.file} [chunk ${err.chunk_index}]: ${err.error}`);
    }
    process.exit(1);
  }
}

/* istanbul ignore next -- CLI guard */
const scriptPath = fileURLToPath(import.meta.url);
const isDirectExecution =
  typeof process.argv[1] === 'string' && path.resolve(process.argv[1]) === scriptPath;

if (isDirectExecution) {
  try {
    await main();
  } catch (err) {
    console.error('Fatal error:', err);
    process.exit(1);
  }
}

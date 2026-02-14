/** Metadata extracted from a knowledge document's YAML front-matter */
export interface DocumentMetadata {
  readonly title: string;
  readonly category: string;
  readonly tags: readonly string[];
  readonly sport: string;
  readonly difficulty: string;
  readonly source_id: string;
}

/** A single chunk produced by splitting a knowledge document at H2 boundaries */
export interface DocumentChunk {
  /** Composite title: "Document Title > Section Title" */
  readonly title: string;
  /** Section text content (typically 200-500 words) */
  readonly content: string;
  /** 0-based position within the document */
  readonly chunk_index: number;
  /** Metadata from the document's front-matter */
  readonly metadata: DocumentMetadata;
}

const REQUIRED_FIELDS = ['title', 'category', 'tags', 'sport', 'difficulty', 'source_id'] as const;

const FRONT_MATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---/;
const BODY_RE = /^---\r?\n[\s\S]*?\r?\n---(?:\r?\n([\s\S]*))?$/;
const H2_RE = /^## (.+)/;
const H1_LINE_RE = /^# .+\n/;

/** Parse a single front-matter field value (quoted string, JSON array, or plain value) */
function parseFieldValue(key: string, rawValue: string): unknown {
  if (rawValue.startsWith('"') && rawValue.endsWith('"')) {
    return rawValue.slice(1, -1);
  }
  if (rawValue.startsWith('[')) {
    try {
      return JSON.parse(rawValue);
    } catch {
      throw new Error(`Invalid array value for front-matter field "${key}"`);
    }
  }
  return rawValue;
}

/** Validate that all required fields are present and tags is an array */
function validateMetadata(result: Record<string, unknown>): void {
  for (const field of REQUIRED_FIELDS) {
    if (result[field] == null || result[field] === '') {
      throw new Error(`Missing required front-matter field: ${field}`);
    }
  }
  if (!Array.isArray(result.tags)) {
    throw new TypeError('Front-matter field "tags" must be an array');
  }
}

/**
 * Parse YAML front-matter from a knowledge document.
 * Supports quoted strings and JSON-style arrays.
 */
export function parseFrontMatter(raw: string): DocumentMetadata {
  const match = FRONT_MATTER_RE.exec(raw);
  if (!match) {
    throw new Error('No YAML front-matter found (expected --- delimiters)');
  }

  const result: Record<string, unknown> = {};
  for (const line of match[1].split('\n')) {
    const trimmed = line.trim();
    if (trimmed === '' || trimmed.startsWith('#')) continue;

    const colonIdx = trimmed.indexOf(':');
    if (colonIdx === -1) continue;

    const key = trimmed.slice(0, colonIdx).trim();
    const rawValue = trimmed.slice(colonIdx + 1).trim();
    result[key] = parseFieldValue(key, rawValue);
  }

  validateMetadata(result);

  return {
    title: result.title as string,
    category: result.category as string,
    tags: result.tags as string[],
    sport: result.sport as string,
    difficulty: result.difficulty as string,
    source_id: result.source_id as string,
  };
}

/**
 * Extract the body content (everything after the front-matter block).
 */
function extractBody(raw: string): string {
  const match = BODY_RE.exec(raw);
  if (!match) {
    return raw.trim();
  }
  return match[1] ? match[1].trim() : '';
}

/** Check if a section is an H1-only block with no additional content */
function isEmptyH1Section(trimmed: string): boolean {
  if (!trimmed.startsWith('# ') || trimmed.startsWith('## ')) return false;
  const lines = trimmed.split('\n');
  return lines.slice(1).join('\n').trim() === '';
}

/** Extract title and content from a single section block */
function extractSectionContent(trimmed: string): { title: string; content: string } | null {
  const h2Match = H2_RE.exec(trimmed);
  if (h2Match) {
    const content = trimmed.slice(h2Match[0].length).trim();
    return content === '' ? null : { title: h2Match[1].trim(), content };
  }
  const h1Match = H1_LINE_RE.exec(trimmed);
  const content = h1Match ? trimmed.slice(h1Match[0].length).trim() : trimmed;
  return content === '' ? null : { title: 'Introduction', content };
}

/**
 * Parse a knowledge document into chunks split at H2 (`##`) boundaries.
 *
 * @param filePath - File path (used for error messages only)
 * @param rawContent - Raw markdown content including front-matter
 * @returns Array of DocumentChunk objects
 */
export function parseKnowledgeDocument(filePath: string, rawContent: string): DocumentChunk[] {
  let metadata: DocumentMetadata;
  try {
    metadata = parseFrontMatter(rawContent);
  } catch (err) {
    throw new Error(
      `Failed to parse front-matter in ${filePath}: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  const body = extractBody(rawContent);
  if (body === '') {
    return [];
  }

  const sections = body.split(/^(?=## )/m);
  const chunks: DocumentChunk[] = [];
  let chunkIndex = 0;

  for (const section of sections) {
    const trimmed = section.trim();
    if (trimmed === '' || isEmptyH1Section(trimmed)) continue;

    const sectionInfo = extractSectionContent(trimmed);
    if (!sectionInfo) continue;

    chunks.push({
      title: `${metadata.title} > ${sectionInfo.title}`,
      content: sectionInfo.content,
      chunk_index: chunkIndex,
      metadata,
    });
    chunkIndex++;
  }

  return chunks;
}

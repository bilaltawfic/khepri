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

/**
 * Parse YAML front-matter from a knowledge document.
 * Supports quoted strings and JSON-style arrays.
 */
export function parseFrontMatter(raw: string): DocumentMetadata {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
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

    if (rawValue.startsWith('"') && rawValue.endsWith('"')) {
      result[key] = rawValue.slice(1, -1);
    } else if (rawValue.startsWith('[')) {
      try {
        result[key] = JSON.parse(rawValue);
      } catch {
        throw new Error(`Invalid array value for front-matter field "${key}"`);
      }
    } else {
      result[key] = rawValue;
    }
  }

  for (const field of REQUIRED_FIELDS) {
    if (result[field] == null || result[field] === '') {
      throw new Error(`Missing required front-matter field: ${field}`);
    }
  }

  if (!Array.isArray(result.tags)) {
    throw new Error('Front-matter field "tags" must be an array');
  }

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
  const match = raw.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n([\s\S]*)$/);
  return match ? match[1].trim() : raw.trim();
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

  // Split at H2 boundaries. The regex captures the header line.
  const sections = body.split(/^(?=## )/m);

  const chunks: DocumentChunk[] = [];
  let chunkIndex = 0;

  for (const section of sections) {
    const trimmed = section.trim();
    if (trimmed === '') continue;

    // Skip the H1 title line if it's the first section (before any H2)
    const isH1Only = trimmed.startsWith('# ') && !trimmed.startsWith('## ');
    if (isH1Only) {
      // Check if there's content beyond the H1 line
      const lines = trimmed.split('\n');
      const contentAfterH1 = lines.slice(1).join('\n').trim();
      if (contentAfterH1 === '') continue;
    }

    // Extract H2 section header if present
    let sectionTitle: string;
    let sectionContent: string;

    const h2Match = trimmed.match(/^## (.+)/);
    if (h2Match) {
      sectionTitle = h2Match[1].trim();
      sectionContent = trimmed.slice(h2Match[0].length).trim();
    } else {
      // Content before the first H2 (intro section)
      sectionTitle = 'Introduction';
      // Strip H1 title if present
      const h1Match = trimmed.match(/^# .+\n/);
      sectionContent = h1Match ? trimmed.slice(h1Match[0].length).trim() : trimmed;
    }

    if (sectionContent === '') continue;

    chunks.push({
      title: `${metadata.title} > ${sectionTitle}`,
      content: sectionContent,
      chunk_index: chunkIndex,
      metadata,
    });
    chunkIndex++;
  }

  return chunks;
}

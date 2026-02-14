import { type DocumentMetadata, parseFrontMatter, parseKnowledgeDocument } from './chunk-parser.ts';

// =============================================================================
// Test fixtures
// =============================================================================

const VALID_FRONT_MATTER = `---
title: "Progressive Overload Principles"
category: "training-load"
tags: ["volume", "intensity", "progression"]
sport: "triathlon"
difficulty: "beginner"
source_id: "training-load/progressive-overload"
---`;

const FULL_DOCUMENT = `${VALID_FRONT_MATTER}

# Progressive Overload Principles

## What Is Progressive Overload

Progressive overload is the gradual increase of training stress. The body adapts over 2-6 weeks.

## The 10% Rule

Increase weekly volume by no more than 10%. This is a guideline, not absolute law.

## Key Takeaways

- Increase volume by no more than 10%
- Monitor for overtraining signs
`;

// =============================================================================
// parseFrontMatter
// =============================================================================

describe('parseFrontMatter', () => {
  it('parses valid front-matter with all required fields', () => {
    const result = parseFrontMatter(VALID_FRONT_MATTER);
    expect(result).toEqual({
      title: 'Progressive Overload Principles',
      category: 'training-load',
      tags: ['volume', 'intensity', 'progression'],
      sport: 'triathlon',
      difficulty: 'beginner',
      source_id: 'training-load/progressive-overload',
    } satisfies DocumentMetadata);
  });

  it('throws when no front-matter delimiters are found', () => {
    expect(() => parseFrontMatter('No front matter here')).toThrow('No YAML front-matter found');
  });

  it('throws when a required field is missing', () => {
    const incomplete = `---
title: "Test"
category: "training-load"
tags: ["a"]
sport: "triathlon"
difficulty: "beginner"
---`;
    expect(() => parseFrontMatter(incomplete)).toThrow(
      'Missing required front-matter field: source_id'
    );
  });

  it('throws when tags is not an array', () => {
    const badTags = `---
title: "Test"
category: "training-load"
tags: "not-an-array"
sport: "triathlon"
difficulty: "beginner"
source_id: "test/doc"
---`;
    expect(() => parseFrontMatter(badTags)).toThrow('Front-matter field "tags" must be an array');
  });

  it('throws on invalid array syntax', () => {
    const badArray = `---
title: "Test"
category: "training-load"
tags: [invalid json
sport: "triathlon"
difficulty: "beginner"
source_id: "test/doc"
---`;
    expect(() => parseFrontMatter(badArray)).toThrow(
      'Invalid array value for front-matter field "tags"'
    );
  });

  it('handles unquoted string values', () => {
    const unquoted = `---
title: "Test Title"
category: training-load
tags: ["a"]
sport: triathlon
difficulty: beginner
source_id: test/doc
---`;
    const result = parseFrontMatter(unquoted);
    expect(result.category).toBe('training-load');
    expect(result.sport).toBe('triathlon');
  });

  it('skips empty lines and comments in front-matter', () => {
    const withBlanks = `---
title: "Test"

# this is a comment
category: "cat"
tags: ["a"]
sport: "triathlon"
difficulty: "beginner"
source_id: "test/doc"
---`;
    const result = parseFrontMatter(withBlanks);
    expect(result.title).toBe('Test');
  });
});

// =============================================================================
// parseKnowledgeDocument – H2 splitting
// =============================================================================

describe('parseKnowledgeDocument – H2 splitting', () => {
  it('splits a document at H2 boundaries', () => {
    const chunks = parseKnowledgeDocument('test.md', FULL_DOCUMENT);
    expect(chunks).toHaveLength(3);
  });

  it('generates correct chunk titles (document > section)', () => {
    const chunks = parseKnowledgeDocument('test.md', FULL_DOCUMENT);
    expect(chunks[0].title).toBe('Progressive Overload Principles > What Is Progressive Overload');
    expect(chunks[1].title).toBe('Progressive Overload Principles > The 10% Rule');
    expect(chunks[2].title).toBe('Progressive Overload Principles > Key Takeaways');
  });

  it('sets correct 0-based chunk_index', () => {
    const chunks = parseKnowledgeDocument('test.md', FULL_DOCUMENT);
    expect(chunks[0].chunk_index).toBe(0);
    expect(chunks[1].chunk_index).toBe(1);
    expect(chunks[2].chunk_index).toBe(2);
  });

  it('attaches metadata to every chunk', () => {
    const chunks = parseKnowledgeDocument('test.md', FULL_DOCUMENT);
    for (const chunk of chunks) {
      expect(chunk.metadata.source_id).toBe('training-load/progressive-overload');
      expect(chunk.metadata.category).toBe('training-load');
    }
  });

  it('preserves section content without the H2 header line', () => {
    const chunks = parseKnowledgeDocument('test.md', FULL_DOCUMENT);
    expect(chunks[0].content).toContain('Progressive overload is the gradual increase');
    expect(chunks[0].content).not.toContain('## What Is');
  });
});

// =============================================================================
// parseKnowledgeDocument – edge cases
// =============================================================================

describe('parseKnowledgeDocument – edge cases', () => {
  it('returns empty array for a document with no body content', () => {
    const emptyBody = `${VALID_FRONT_MATTER}\n`;
    const chunks = parseKnowledgeDocument('test.md', emptyBody);
    expect(chunks).toHaveLength(0);
  });

  it('handles document with no H2 sections (intro content only)', () => {
    const noH2 = `${VALID_FRONT_MATTER}

Some introductory content without any H2 headers. This is still useful content.
`;
    const chunks = parseKnowledgeDocument('test.md', noH2);
    expect(chunks).toHaveLength(1);
    expect(chunks[0].title).toBe('Progressive Overload Principles > Introduction');
    expect(chunks[0].content).toContain('introductory content');
  });

  it('skips empty sections', () => {
    const emptySection = `${VALID_FRONT_MATTER}

# Title

## Non-Empty Section

This section has content.

## Empty Section

## Another Non-Empty Section

This also has content.
`;
    const chunks = parseKnowledgeDocument('test.md', emptySection);
    expect(chunks).toHaveLength(2);
    expect(chunks[0].title).toContain('Non-Empty Section');
    expect(chunks[1].title).toContain('Another Non-Empty Section');
  });

  it('preserves H3+ sub-headers within sections', () => {
    const withH3 = `${VALID_FRONT_MATTER}

## Main Section

Some intro text.

### Sub-Section A

Sub-section content here.

### Sub-Section B

More sub-section content.
`;
    const chunks = parseKnowledgeDocument('test.md', withH3);
    expect(chunks).toHaveLength(1);
    expect(chunks[0].content).toContain('### Sub-Section A');
    expect(chunks[0].content).toContain('### Sub-Section B');
  });

  it('throws with descriptive error when front-matter is invalid', () => {
    const bad = 'No front matter at all\n\n## Section\n\nContent';
    expect(() => parseKnowledgeDocument('bad-file.md', bad)).toThrow(
      'Failed to parse front-matter in bad-file.md'
    );
  });

  it('handles a real knowledge document structure', () => {
    const realDoc = `---
title: "Sleep and Recovery"
category: "recovery"
tags: ["sleep", "recovery", "adaptation"]
sport: "general"
difficulty: "beginner"
source_id: "recovery/sleep-and-recovery"
---

# Sleep and Recovery

## Sleep as the Primary Recovery Mechanism

Sleep is the single most important recovery tool for endurance athletes.

## Minimum Sleep Recommendations

Endurance athletes should aim for 8-10 hours per night.

## Key Takeaways

- Sleep is non-negotiable: 8-10 hours per night
- Heavy training blocks require more sleep
`;
    const chunks = parseKnowledgeDocument('sleep.md', realDoc);
    expect(chunks).toHaveLength(3);
    expect(chunks[0].metadata.source_id).toBe('recovery/sleep-and-recovery');
    expect(chunks[0].title).toBe('Sleep and Recovery > Sleep as the Primary Recovery Mechanism');
    expect(chunks[2].chunk_index).toBe(2);
  });
});

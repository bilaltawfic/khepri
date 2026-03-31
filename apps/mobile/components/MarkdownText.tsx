import React, { useMemo } from 'react';
import { StyleSheet, Text, View, useColorScheme } from 'react-native';

import { Colors } from '@/constants/Colors';

type MarkdownTextProps = {
  readonly children: string;
};

type InlineSegment = {
  readonly key: string;
  readonly type: 'text' | 'bold' | 'italic';
  readonly text: string;
};

type ParsedLine = {
  readonly key: string;
  readonly segments: readonly InlineSegment[];
};

type ParsedBlock =
  | { readonly key: string; readonly kind: 'hr' }
  | {
      readonly key: string;
      readonly kind: 'header';
      readonly level: number;
      readonly segments: readonly InlineSegment[];
    }
  | { readonly key: string; readonly kind: 'list'; readonly items: readonly ParsedLine[] }
  | { readonly key: string; readonly kind: 'paragraph'; readonly lines: readonly ParsedLine[] };

/** Parse **bold** and *italic* within a line of text, assigning stable keys. */
function parseInline(text: string, keyPrefix: string): InlineSegment[] {
  const segments: InlineSegment[] = [];
  // Match **bold** or *italic* — [^*]+ avoids backtracking on nested asterisks
  const regex = /\*\*([^*]+)\*\*|\*([^*]+)\*/g;
  let lastIndex = 0;
  let segIdx = 0;

  for (let match = regex.exec(text); match != null; match = regex.exec(text)) {
    if (match.index > lastIndex) {
      segments.push({
        key: `${keyPrefix}-t${segIdx++}`,
        type: 'text',
        text: text.slice(lastIndex, match.index),
      });
    }
    if (match[1] != null) {
      segments.push({ key: `${keyPrefix}-b${segIdx++}`, type: 'bold', text: match[1] });
    } else if (match[2] != null) {
      segments.push({ key: `${keyPrefix}-i${segIdx++}`, type: 'italic', text: match[2] });
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    segments.push({ key: `${keyPrefix}-t${segIdx}`, type: 'text', text: text.slice(lastIndex) });
  }

  return segments;
}

/** Parse markdown string into a keyed block structure (pure, no React). */
function parseMarkdown(input: string): ParsedBlock[] {
  const rawBlocks = input.split(/\n{2,}/);
  const blocks: ParsedBlock[] = [];

  for (let bi = 0; bi < rawBlocks.length; bi++) {
    const trimmed = rawBlocks[bi].trim();
    if (trimmed === '') continue;

    const lines = trimmed.split('\n');

    // Horizontal rule (--- or ***)
    if (/^[-*_]{3,}$/.test(trimmed)) {
      blocks.push({ key: `hr-${bi}`, kind: 'hr' });
      continue;
    }

    // Header (# to ####)
    const headerMatch = /^(#{1,4}) (.+)$/.exec(trimmed);
    if (headerMatch) {
      blocks.push({
        key: `h-${bi}`,
        kind: 'header',
        level: headerMatch[1].length,
        segments: parseInline(headerMatch[2], `h-${bi}`),
      });
      continue;
    }

    // Bullet list (lines starting with - or *)
    if (lines.every((l) => /^\s*[-*]\s/.test(l))) {
      blocks.push({
        key: `ul-${bi}`,
        kind: 'list',
        items: lines.map((line, li) => {
          const content = line.replace(/^\s*[-*]\s+/, '');
          return { key: `li-${bi}-${li}`, segments: parseInline(content, `li-${bi}-${li}`) };
        }),
      });
      continue;
    }

    // Regular paragraph
    blocks.push({
      key: `p-${bi}`,
      kind: 'paragraph',
      lines: lines.map((line, li) => ({
        key: `ln-${bi}-${li}`,
        segments: parseInline(line.trim(), `ln-${bi}-${li}`),
      })),
    });
  }

  return blocks;
}

function InlineText({
  segments,
  textColor,
  secondaryColor,
}: {
  readonly segments: readonly InlineSegment[];
  readonly textColor: string;
  readonly secondaryColor: string;
}) {
  return (
    <Text style={{ color: textColor }}>
      {segments.map((seg) => {
        if (seg.type === 'bold') {
          return (
            <Text key={seg.key} style={styles.bold}>
              {seg.text}
            </Text>
          );
        }
        if (seg.type === 'italic') {
          return (
            <Text key={seg.key} style={[styles.italic, { color: secondaryColor }]}>
              {seg.text}
            </Text>
          );
        }
        return <Text key={seg.key}>{seg.text}</Text>;
      })}
    </Text>
  );
}

export function MarkdownText({ children }: MarkdownTextProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const blocks = useMemo(() => parseMarkdown(children), [children]);

  return (
    <View>
      {blocks.map((block) => {
        if (block.kind === 'hr') {
          return <View key={block.key} style={[styles.hr, { backgroundColor: colors.border }]} />;
        }

        if (block.kind === 'header') {
          const headerStyleMap: Record<number, typeof styles.h1> = {
            1: styles.h1,
            2: styles.h2,
          };
          const headerStyle = headerStyleMap[block.level] ?? styles.h3;
          return (
            <View key={block.key} style={styles.paragraph}>
              <Text style={[headerStyle, { color: colors.text }]}>
                <InlineText
                  segments={block.segments}
                  textColor={colors.text}
                  secondaryColor={colors.textSecondary}
                />
              </Text>
            </View>
          );
        }

        if (block.kind === 'list') {
          return (
            <View key={block.key} style={styles.list}>
              {block.items.map((item) => (
                <View key={item.key} style={styles.listItem}>
                  <Text style={[styles.bullet, { color: colors.text }]}>{'\u2022'}</Text>
                  <Text style={[styles.body, { color: colors.text, flex: 1 }]}>
                    <InlineText
                      segments={item.segments}
                      textColor={colors.text}
                      secondaryColor={colors.textSecondary}
                    />
                  </Text>
                </View>
              ))}
            </View>
          );
        }

        // paragraph
        return (
          <View key={block.key} style={styles.paragraph}>
            <Text style={[styles.body, { color: colors.text }]}>
              {block.lines.map((line, lineIdx) => (
                <React.Fragment key={line.key}>
                  {lineIdx > 0 && '\n'}
                  <InlineText
                    segments={line.segments}
                    textColor={colors.text}
                    secondaryColor={colors.textSecondary}
                  />
                </React.Fragment>
              ))}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    fontSize: 15,
    lineHeight: 22,
  },
  bold: {
    fontWeight: '700',
  },
  italic: {
    fontStyle: 'italic',
  },
  paragraph: {
    marginVertical: 4,
  },
  list: {
    marginVertical: 4,
  },
  listItem: {
    flexDirection: 'row',
    marginVertical: 2,
    paddingLeft: 4,
  },
  bullet: {
    fontSize: 15,
    lineHeight: 22,
    marginRight: 8,
  },
  hr: {
    height: 1,
    marginVertical: 8,
  },
  h1: {
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 28,
  },
  h2: {
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
  },
  h3: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
  },
});

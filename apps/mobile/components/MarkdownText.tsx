import React from 'react';
import { StyleSheet, Text, View, useColorScheme } from 'react-native';

import { Colors } from '@/constants/Colors';

type MarkdownTextProps = {
  readonly children: string;
};

type InlineSegment =
  | { readonly type: 'text'; readonly text: string }
  | { readonly type: 'bold'; readonly text: string }
  | { readonly type: 'italic'; readonly text: string };

/** Parse **bold** and *italic* within a line of text. */
function parseInline(text: string): InlineSegment[] {
  const segments: InlineSegment[] = [];
  // Match **bold** or *italic* (non-greedy)
  const regex = /\*\*(.+?)\*\*|\*(.+?)\*/g;
  let lastIndex = 0;

  for (let match = regex.exec(text); match != null; match = regex.exec(text)) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', text: text.slice(lastIndex, match.index) });
    }
    if (match[1] != null) {
      segments.push({ type: 'bold', text: match[1] });
    } else if (match[2] != null) {
      segments.push({ type: 'italic', text: match[2] });
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    segments.push({ type: 'text', text: text.slice(lastIndex) });
  }

  return segments;
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
        const key = `${seg.type}-${seg.text}`;
        if (seg.type === 'bold') {
          return (
            <Text key={key} style={styles.bold}>
              {seg.text}
            </Text>
          );
        }
        if (seg.type === 'italic') {
          return (
            <Text key={key} style={[styles.italic, { color: secondaryColor }]}>
              {seg.text}
            </Text>
          );
        }
        return <Text key={key}>{seg.text}</Text>;
      })}
    </Text>
  );
}

export function MarkdownText({ children }: MarkdownTextProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  // Split into paragraphs by double newlines, then process each
  const blocks = children.split(/\n{2,}/);

  return (
    <View>
      {blocks.map((block) => {
        const trimmed = block.trim();
        if (trimmed === '') return null;

        const lines = trimmed.split('\n');

        // Horizontal rule (--- or ***)
        if (/^[-*_]{3,}$/.test(trimmed)) {
          return (
            <View
              key={`hr-${trimmed.slice(0, 40)}`}
              style={[styles.hr, { backgroundColor: colors.border }]}
            />
          );
        }

        // Header (# to ####)
        const headerMatch = /^(#{1,4})\s+(.+)$/.exec(trimmed);
        if (headerMatch) {
          const level = headerMatch[1].length;
          const headerText = headerMatch[2];
          const headerStyleMap: Record<number, typeof styles.h1> = {
            1: styles.h1,
            2: styles.h2,
          };
          const headerStyle = headerStyleMap[level] ?? styles.h3;
          return (
            <View key={trimmed.slice(0, 40)} style={styles.paragraph}>
              <Text style={[headerStyle, { color: colors.text }]}>
                <InlineText
                  segments={parseInline(headerText)}
                  textColor={colors.text}
                  secondaryColor={colors.textSecondary}
                />
              </Text>
            </View>
          );
        }

        // Bullet list (lines starting with - or *)
        const isList = lines.every((l) => /^\s*[-*]\s/.test(l));

        if (isList) {
          return (
            <View key={trimmed.slice(0, 40)} style={styles.list}>
              {lines.map((line) => {
                const content = line.replace(/^\s*[-*]\s+/, '');
                return (
                  <View key={content.slice(0, 40)} style={styles.listItem}>
                    <Text style={[styles.bullet, { color: colors.text }]}>{'\u2022'}</Text>
                    <Text style={[styles.body, { color: colors.text, flex: 1 }]}>
                      <InlineText
                        segments={parseInline(content)}
                        textColor={colors.text}
                        secondaryColor={colors.textSecondary}
                      />
                    </Text>
                  </View>
                );
              })}
            </View>
          );
        }

        // Regular paragraph — handle single newlines as line breaks
        const paragraphLines = lines.map((line) => parseInline(line.trim()));
        return (
          <View key={trimmed.slice(0, 40)} style={styles.paragraph}>
            <Text style={[styles.body, { color: colors.text }]}>
              {paragraphLines.map((segments, lineIdx) => (
                <React.Fragment key={segments.map((s) => s.text).join('')}>
                  {lineIdx > 0 && '\n'}
                  <InlineText
                    segments={segments}
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

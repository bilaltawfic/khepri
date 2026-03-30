import { render } from '@testing-library/react-native';

import { MarkdownText } from '../MarkdownText';

function renderMarkdown(text: string) {
  const { toJSON } = render(<MarkdownText>{text}</MarkdownText>);
  return JSON.stringify(toJSON());
}

describe('MarkdownText', () => {
  it('renders plain text', () => {
    const json = renderMarkdown('Hello world');
    expect(json).toContain('Hello world');
  });

  it('renders bold text without asterisks', () => {
    const json = renderMarkdown('This is **bold** text');
    expect(json).toContain('bold');
    expect(json).not.toContain('**bold**');
  });

  it('renders italic text without asterisks', () => {
    const json = renderMarkdown('This is *italic* text');
    expect(json).toContain('italic');
    expect(json).not.toContain('*italic*');
  });

  it('renders multiple bold segments', () => {
    const json = renderMarkdown('**first** and **second**');
    expect(json).toContain('first');
    expect(json).toContain('second');
    expect(json).not.toContain('**');
  });

  it('renders bullet lists with dash prefix', () => {
    const json = renderMarkdown('- Item one\n- Item two\n- Item three');
    expect(json).toContain('Item one');
    expect(json).toContain('Item two');
    expect(json).toContain('Item three');
    // Should render bullet characters
    expect(json).toContain('\u2022');
  });

  it('renders bullet lists with asterisk prefix', () => {
    const json = renderMarkdown('* Alpha\n* Beta');
    expect(json).toContain('Alpha');
    expect(json).toContain('Beta');
    expect(json).toContain('\u2022');
  });

  it('renders headers (h1)', () => {
    const json = renderMarkdown('# Main Title');
    expect(json).toContain('Main Title');
    expect(json).not.toContain('# ');
  });

  it('renders headers (h2)', () => {
    const json = renderMarkdown('## Section Title');
    expect(json).toContain('Section Title');
    expect(json).not.toContain('## ');
  });

  it('renders headers (h3)', () => {
    const json = renderMarkdown('### Sub Section');
    expect(json).toContain('Sub Section');
    expect(json).not.toContain('### ');
  });

  it('renders horizontal rules', () => {
    const json = renderMarkdown('Above\n\n---\n\nBelow');
    expect(json).toContain('Above');
    expect(json).toContain('Below');
  });

  it('separates paragraphs on double newlines', () => {
    const json = renderMarkdown('First paragraph.\n\nSecond paragraph.');
    expect(json).toContain('First paragraph.');
    expect(json).toContain('Second paragraph.');
  });

  it('handles bold inside bullet lists', () => {
    const json = renderMarkdown('- **Bold item** with text\n- Normal item');
    expect(json).toContain('Bold item');
    expect(json).toContain('Normal item');
    expect(json).not.toContain('**');
  });

  it('handles bold inside headers', () => {
    const json = renderMarkdown('## **Important** heading');
    expect(json).toContain('Important');
    expect(json).not.toContain('**');
  });

  it('renders empty string without crashing', () => {
    const { toJSON } = render(<MarkdownText>{''}</MarkdownText>);
    expect(toJSON()).toBeTruthy();
  });

  it('handles mixed content blocks', () => {
    const content = [
      '## Recommendation',
      '',
      'You should do an **easy swim** today.',
      '',
      '- 200m warm-up',
      '- 20 min steady',
      '- 5 min cool-down',
    ].join('\n');

    const json = renderMarkdown(content);
    expect(json).toContain('Recommendation');
    expect(json).toContain('easy swim');
    expect(json).toContain('200m warm-up');
    expect(json).toContain('\u2022');
    expect(json).not.toContain('**');
    expect(json).not.toContain('## ');
  });
});

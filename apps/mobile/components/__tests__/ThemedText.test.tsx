import { render } from '@testing-library/react-native';
import { ThemedText } from '../ThemedText';

describe('ThemedText', () => {
  it('renders children text correctly', () => {
    const { toJSON } = render(<ThemedText>Hello World</ThemedText>);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Hello World');
  });

  it('renders title type text', () => {
    const { toJSON } = render(<ThemedText type="title">Title text</ThemedText>);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Title text');
  });

  it('renders subtitle type text', () => {
    const { toJSON } = render(
      <ThemedText type="subtitle">Subtitle text</ThemedText>
    );
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Subtitle text');
  });

  it('renders caption type text', () => {
    const { toJSON } = render(
      <ThemedText type="caption">Caption text</ThemedText>
    );
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Caption text');
  });

  it('renders defaultSemiBold type text', () => {
    const { toJSON } = render(
      <ThemedText type="defaultSemiBold">Semi bold text</ThemedText>
    );
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Semi bold text');
  });

  it('renders link type text', () => {
    const { toJSON } = render(<ThemedText type="link">Link text</ThemedText>);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Link text');
  });

  it('handles custom light and dark colors', () => {
    const { toJSON } = render(
      <ThemedText lightColor="#ff0000" darkColor="#00ff00">
        Custom colors
      </ThemedText>
    );
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Custom colors');
  });

  it('renders without crashing with all props', () => {
    const { toJSON } = render(
      <ThemedText
        type="default"
        lightColor="#ff0000"
        darkColor="#00ff00"
        numberOfLines={2}
      >
        Full props text
      </ThemedText>
    );
    expect(toJSON()).toBeTruthy();
  });
});

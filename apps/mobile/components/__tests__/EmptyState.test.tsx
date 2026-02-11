import { render } from '@testing-library/react-native';
import { EmptyState } from '../EmptyState';

describe('EmptyState', () => {
  it('renders icon and message', () => {
    const { toJSON } = render(<EmptyState icon="flag-outline" message="No active goals yet" />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('flag-outline');
    expect(json).toContain('No active goals yet');
  });

  it('renders title when provided', () => {
    const { toJSON } = render(
      <EmptyState icon="flag-outline" title="Empty" message="Nothing here" />
    );
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Empty');
    expect(json).toContain('Nothing here');
  });

  it('does not render title when not provided', () => {
    const { toJSON, rerender } = render(
      <EmptyState icon="flag-outline" title="Sentinel Title" message="Just a message" />
    );
    const withTitle = JSON.stringify(toJSON());
    expect(withTitle).toContain('Sentinel Title');

    rerender(<EmptyState icon="flag-outline" message="Just a message" />);
    const withoutTitle = JSON.stringify(toJSON());
    expect(withoutTitle).not.toContain('Sentinel Title');
    expect(withoutTitle).toContain('Just a message');
  });

  it('uses custom icon size when provided', () => {
    const { toJSON } = render(
      <EmptyState icon="flag-outline" iconSize={37} message="Small icon" />
    );
    const json = JSON.stringify(toJSON());
    expect(json).toContain('37');
  });
});

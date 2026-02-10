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
    const { toJSON } = render(<EmptyState icon="flag-outline" message="Just a message" />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Just a message');
    expect(json).not.toContain('defaultSemiBold');
  });

  it('uses custom icon size when provided', () => {
    const { toJSON } = render(
      <EmptyState icon="flag-outline" iconSize={32} message="Small icon" />
    );
    const json = JSON.stringify(toJSON());
    // Icon renders with size prop
    expect(json).toContain('32');
  });
});

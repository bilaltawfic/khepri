import { render } from '@testing-library/react-native';
import { TipCard } from '../TipCard';

describe('TipCard', () => {
  it('renders message text', () => {
    const { toJSON } = render(<TipCard message="Set priorities to help focus." />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Set priorities to help focus.');
  });

  it('renders with default bulb-outline icon', () => {
    const { toJSON } = render(<TipCard message="A tip" />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('bulb-outline');
  });

  it('renders with custom icon when provided', () => {
    const { toJSON } = render(<TipCard icon="sync-outline" message="Sync tip" />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('sync-outline');
    expect(json).not.toContain('bulb-outline');
  });
});

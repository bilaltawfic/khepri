import { render } from '@testing-library/react-native';
import { LoadingState } from '../LoadingState';

describe('LoadingState', () => {
  it('renders the provided message', () => {
    const { toJSON } = render(<LoadingState message="Loading goals..." />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Loading goals...');
  });

  it('renders a loading spinner', () => {
    const { toJSON } = render(<LoadingState message="Loading..." />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('progressbar');
  });

  it('uses message as default accessibilityLabel', () => {
    const { getByLabelText } = render(<LoadingState message="Loading profile..." />);
    expect(getByLabelText('Loading profile...')).toBeTruthy();
  });

  it('uses custom accessibilityLabel when provided', () => {
    const { getByLabelText, queryByLabelText } = render(
      <LoadingState message="Loading profile..." accessibilityLabel="Loading profile" />
    );
    expect(getByLabelText('Loading profile')).toBeTruthy();
    expect(queryByLabelText('Loading profile...')).toBeNull();
  });
});

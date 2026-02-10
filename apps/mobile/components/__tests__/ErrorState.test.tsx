import { fireEvent, render } from '@testing-library/react-native';
import { ErrorState } from '../ErrorState';

describe('ErrorState', () => {
  it('renders with default icon and message', () => {
    const { toJSON } = render(<ErrorState message="Something went wrong" />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Something went wrong');
    expect(json).toContain('alert-circle-outline');
  });

  it('renders with custom icon', () => {
    const { toJSON } = render(<ErrorState message="Offline" icon="cloud-offline-outline" />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('cloud-offline-outline');
  });

  it('renders without icon when icon is null', () => {
    const { toJSON } = render(<ErrorState message="Error" icon={null} />);
    const json = JSON.stringify(toJSON());
    expect(json).not.toContain('alert-circle-outline');
  });

  it('renders title when provided', () => {
    const { toJSON } = render(<ErrorState message="Details here" title="Failed to load" />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Failed to load');
    expect(json).toContain('Details here');
  });

  it('does not render title when not provided', () => {
    const { toJSON } = render(<ErrorState message="Just a message" />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Just a message');
    // Only one text node (message), no title
    expect(json).not.toContain('defaultSemiBold');
  });

  it('renders action button when provided', () => {
    const onPress = jest.fn();
    const { getByLabelText } = render(
      <ErrorState
        message="Error"
        action={{ title: 'Retry', onPress, accessibilityLabel: 'Retry loading' }}
      />
    );
    expect(getByLabelText('Retry loading')).toBeTruthy();
  });

  it('does not render action button when not provided', () => {
    const { queryByLabelText } = render(<ErrorState message="Error" />);
    expect(queryByLabelText('Retry')).toBeNull();
  });

  it('calls action.onPress when button is pressed', () => {
    const onPress = jest.fn();
    const { getByLabelText } = render(
      <ErrorState
        message="Error"
        action={{ title: 'Retry', onPress, accessibilityLabel: 'Retry loading' }}
      />
    );
    fireEvent.press(getByLabelText('Retry loading'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('uses title as default accessibilityLabel for action', () => {
    const onPress = jest.fn();
    const { getByLabelText } = render(
      <ErrorState message="Error" action={{ title: 'Go Back', onPress }} />
    );
    expect(getByLabelText('Go Back')).toBeTruthy();
  });
});

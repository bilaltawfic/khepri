import { fireEvent, render } from '@testing-library/react-native';
import { Button } from '../Button';

describe('Button', () => {
  it('renders with title', () => {
    const { toJSON } = render(<Button title="Test Button" />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Test Button');
  });

  it('renders primary variant by default', () => {
    const { toJSON } = render(<Button title="Primary" />);
    expect(toJSON()).toBeTruthy();
  });

  it('renders secondary variant', () => {
    const { toJSON } = render(<Button title="Secondary" variant="secondary" />);
    expect(toJSON()).toBeTruthy();
  });

  it('renders text variant', () => {
    const { toJSON } = render(<Button title="Text" variant="text" />);
    expect(toJSON()).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const onPress = jest.fn();
    const { getByLabelText } = render(<Button title="Click me" onPress={onPress} />);
    const button = getByLabelText('Click me');
    fireEvent.press(button);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('renders with disabled state', () => {
    const { toJSON } = render(<Button title="Disabled" disabled />);
    expect(toJSON()).toBeTruthy();
  });

  it('uses title as accessibility label by default', () => {
    const { getByLabelText } = render(<Button title="My Button" />);
    expect(getByLabelText('My Button')).toBeTruthy();
  });

  it('uses custom accessibility label when provided', () => {
    const { getByLabelText } = render(<Button title="Submit" accessibilityLabel="Submit form" />);
    expect(getByLabelText('Submit form')).toBeTruthy();
  });
});

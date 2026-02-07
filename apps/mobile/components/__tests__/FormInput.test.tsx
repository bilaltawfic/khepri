import { render } from '@testing-library/react-native';
import { FormInput } from '../FormInput';

describe('FormInput', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(<FormInput label="Test Label" />);
    expect(toJSON()).toBeTruthy();
  });

  it('renders the label', () => {
    const { toJSON } = render(<FormInput label="Email Address" />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Email Address');
  });

  it('renders placeholder text', () => {
    const { toJSON } = render(<FormInput label="Name" placeholder="Enter your name" />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Enter your name');
  });

  it('displays error message when error prop is provided', () => {
    const { toJSON } = render(<FormInput label="Email" error="Invalid email address" />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Invalid email address');
  });

  it('displays help text when helpText prop is provided', () => {
    const { toJSON } = render(
      <FormInput label="Password" helpText="Must be at least 8 characters" />
    );
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Must be at least 8 characters');
  });

  it('displays unit when unit prop is provided', () => {
    const { toJSON } = render(<FormInput label="Weight" unit="kg" />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('kg');
  });

  it('hides help text when error is shown', () => {
    const { toJSON } = render(
      <FormInput label="Email" helpText="Enter a valid email" error="Invalid email" />
    );
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Invalid email');
    expect(json).not.toContain('Enter a valid email');
  });
});

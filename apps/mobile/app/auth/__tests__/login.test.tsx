import { fireEvent, render, waitFor } from '@testing-library/react-native';
import LoginScreen from '../login';

const mockSignIn = jest.fn();
const mockReplace = jest.fn();

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    signIn: mockSignIn,
    signUp: jest.fn(),
    signOut: jest.fn(),
    session: null,
    user: null,
    isLoading: false,
    isConfigured: true,
  }),
}));

// Override the global expo-router mock to track replace calls
jest.spyOn(require('expo-router'), 'useRouter').mockReturnValue({
  push: jest.fn(),
  replace: mockReplace,
  back: jest.fn(),
});

describe('LoginScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSignIn.mockResolvedValue({ error: null });
  });

  it('renders the login form', () => {
    const { getByLabelText, toJSON } = render(<LoginScreen />);

    // getByText is unreliable with jest-expo/web; use toJSON for text content
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Welcome Back');
    expect(json).toContain('Sign In');
    // Form inputs are reliably matched via accessibilityLabel
    expect(getByLabelText('Email')).toBeTruthy();
    expect(getByLabelText('Password')).toBeTruthy();
  });

  it('renders sign up link', () => {
    const { toJSON } = render(<LoginScreen />);
    // Link text is nested inside expo-router Link child; use toJSON for reliable matching
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Sign Up');
  });

  it('disables sign in button when fields are empty', () => {
    const { getByLabelText } = render(<LoginScreen />);

    const button = getByLabelText('Sign in');
    expect(
      button.props.accessibilityState?.disabled ?? button.props['aria-disabled']
    ).toBe(true);
  });

  it('disables sign in button when password is empty', () => {
    const { getByLabelText } = render(<LoginScreen />);

    fireEvent.changeText(getByLabelText('Email'), 'test@example.com');

    const button = getByLabelText('Sign in');
    expect(
      button.props.accessibilityState?.disabled ?? button.props['aria-disabled']
    ).toBe(true);
  });

  it('calls signIn with email and password', async () => {
    const { getByLabelText } = render(<LoginScreen />);

    fireEvent.changeText(getByLabelText('Email'), 'test@example.com');
    fireEvent.changeText(getByLabelText('Password'), 'password123');
    fireEvent.press(getByLabelText('Sign in'));

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'password123');
    });
  });

  it('redirects to tabs on success', async () => {
    const { getByLabelText } = render(<LoginScreen />);

    fireEvent.changeText(getByLabelText('Email'), 'test@example.com');
    fireEvent.changeText(getByLabelText('Password'), 'password123');
    fireEvent.press(getByLabelText('Sign in'));

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/(tabs)');
    });
  });

  it('trims email before signing in', async () => {
    const { getByLabelText } = render(<LoginScreen />);

    fireEvent.changeText(getByLabelText('Email'), '  test@example.com  ');
    fireEvent.changeText(getByLabelText('Password'), 'password123');
    fireEvent.press(getByLabelText('Sign in'));

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'password123');
    });
  });

  it('shows error from sign in failure', async () => {
    mockSignIn.mockResolvedValue({ error: new Error('Invalid credentials') });

    const { getByLabelText, toJSON } = render(<LoginScreen />);

    fireEvent.changeText(getByLabelText('Email'), 'test@example.com');
    fireEvent.changeText(getByLabelText('Password'), 'wrong');
    fireEvent.press(getByLabelText('Sign in'));

    await waitFor(() => {
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Invalid credentials');
    });

    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('disables button while submitting', async () => {
    let resolveSignIn: (value: { error: null }) => void = () => {};
    mockSignIn.mockImplementation(
      () =>
        new Promise<{ error: null }>((resolve) => {
          resolveSignIn = resolve;
        })
    );

    const { getByLabelText, toJSON } = render(<LoginScreen />);

    fireEvent.changeText(getByLabelText('Email'), 'test@example.com');
    fireEvent.changeText(getByLabelText('Password'), 'password123');
    fireEvent.press(getByLabelText('Sign in'));

    await waitFor(() => {
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Signing in...');
    });

    // Verify button is disabled while submitting (jest-expo/web uses aria-disabled)
    const disabledButton = getByLabelText('Sign in');
    expect(
      disabledButton.props.accessibilityState?.disabled ?? disabledButton.props['aria-disabled']
    ).toBe(true);

    resolveSignIn?.({ error: null });

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/(tabs)');
    });
  });
});

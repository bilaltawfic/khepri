import { fireEvent, render, waitFor } from '@testing-library/react-native';
import SignupScreen from '../signup';

const mockSignUp = jest.fn();
const mockReplace = jest.fn();

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    signIn: jest.fn(),
    signUp: mockSignUp,
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

describe('SignupScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSignUp.mockResolvedValue({ error: null, emailConfirmationRequired: false });
  });

  it('renders the signup form', () => {
    const { toJSON } = render(<SignupScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Create Account');
    expect(json).toContain('Email');
    expect(json).toContain('Password');
    expect(json).toContain('Confirm Password');
    expect(json).toContain('Sign Up');
  });

  it('renders sign in link', () => {
    const { toJSON } = render(<SignupScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Sign In');
  });

  it('disables sign up button when fields are empty', () => {
    const { getByLabelText } = render(<SignupScreen />);

    const button = getByLabelText('Sign up');
    expect(button.props.accessibilityState?.disabled ?? button.props['aria-disabled']).toBe(true);
  });

  it('validates email format', async () => {
    const { getByLabelText, toJSON } = render(<SignupScreen />);

    fireEvent.changeText(getByLabelText('Email'), 'not-an-email');
    fireEvent.changeText(getByLabelText('Password'), 'password123');
    fireEvent.changeText(getByLabelText('Confirm password'), 'password123');
    fireEvent.press(getByLabelText('Sign up'));

    await waitFor(() => {
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Please enter a valid email address');
    });

    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it('validates password length', async () => {
    const { getByLabelText, toJSON } = render(<SignupScreen />);

    fireEvent.changeText(getByLabelText('Email'), 'test@example.com');
    fireEvent.changeText(getByLabelText('Password'), 'short');
    fireEvent.changeText(getByLabelText('Confirm password'), 'short');
    fireEvent.press(getByLabelText('Sign up'));

    await waitFor(() => {
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Password must be at least 8 characters');
    });

    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it('disables sign up button when confirm password is empty', () => {
    const { getByLabelText } = render(<SignupScreen />);

    fireEvent.changeText(getByLabelText('Email'), 'test@example.com');
    fireEvent.changeText(getByLabelText('Password'), 'password123');

    const button = getByLabelText('Sign up');
    expect(button.props.accessibilityState?.disabled ?? button.props['aria-disabled']).toBe(true);
  });

  it('validates password match', async () => {
    const { getByLabelText, toJSON } = render(<SignupScreen />);

    fireEvent.changeText(getByLabelText('Email'), 'test@example.com');
    fireEvent.changeText(getByLabelText('Password'), 'password123');
    fireEvent.changeText(getByLabelText('Confirm password'), 'different123');
    fireEvent.press(getByLabelText('Sign up'));

    await waitFor(() => {
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Passwords do not match');
    });

    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it('calls signUp with valid credentials', async () => {
    const { getByLabelText } = render(<SignupScreen />);

    fireEvent.changeText(getByLabelText('Email'), 'test@example.com');
    fireEvent.changeText(getByLabelText('Password'), 'password123');
    fireEvent.changeText(getByLabelText('Confirm password'), 'password123');
    fireEvent.press(getByLabelText('Sign up'));

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith('test@example.com', 'password123');
    });
  });

  it('redirects to onboarding on success', async () => {
    const { getByLabelText } = render(<SignupScreen />);

    fireEvent.changeText(getByLabelText('Email'), 'test@example.com');
    fireEvent.changeText(getByLabelText('Password'), 'password123');
    fireEvent.changeText(getByLabelText('Confirm password'), 'password123');
    fireEvent.press(getByLabelText('Sign up'));

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/onboarding');
    });
  });

  it('shows email confirmation screen when confirmation required', async () => {
    mockSignUp.mockResolvedValue({ error: null, emailConfirmationRequired: true });

    const { getByLabelText, toJSON } = render(<SignupScreen />);

    fireEvent.changeText(getByLabelText('Email'), 'test@example.com');
    fireEvent.changeText(getByLabelText('Password'), 'password123');
    fireEvent.changeText(getByLabelText('Confirm password'), 'password123');
    fireEvent.press(getByLabelText('Sign up'));

    await waitFor(() => {
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Check Your Email');
      expect(json).toContain('test@example.com');
    });

    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('shows error from sign up failure', async () => {
    mockSignUp.mockResolvedValue({
      error: new Error('User already exists'),
      emailConfirmationRequired: false,
    });

    const { getByLabelText, toJSON } = render(<SignupScreen />);

    fireEvent.changeText(getByLabelText('Email'), 'test@example.com');
    fireEvent.changeText(getByLabelText('Password'), 'password123');
    fireEvent.changeText(getByLabelText('Confirm password'), 'password123');
    fireEvent.press(getByLabelText('Sign up'));

    await waitFor(() => {
      const json = JSON.stringify(toJSON());
      expect(json).toContain('User already exists');
    });

    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('trims email before signing up', async () => {
    const { getByLabelText } = render(<SignupScreen />);

    fireEvent.changeText(getByLabelText('Email'), '  test@example.com  ');
    fireEvent.changeText(getByLabelText('Password'), 'password123');
    fireEvent.changeText(getByLabelText('Confirm password'), 'password123');
    fireEvent.press(getByLabelText('Sign up'));

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith('test@example.com', 'password123');
    });
  });

  it('disables button while submitting', async () => {
    let resolveSignUp: (value: { error: null; emailConfirmationRequired: false }) => void =
      () => {};
    mockSignUp.mockImplementation(
      () =>
        new Promise<{ error: null; emailConfirmationRequired: false }>((resolve) => {
          resolveSignUp = resolve;
        })
    );

    const { getByLabelText, toJSON } = render(<SignupScreen />);

    fireEvent.changeText(getByLabelText('Email'), 'test@example.com');
    fireEvent.changeText(getByLabelText('Password'), 'password123');
    fireEvent.changeText(getByLabelText('Confirm password'), 'password123');
    fireEvent.press(getByLabelText('Sign up'));

    await waitFor(() => {
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Creating account...');
    });

    // Verify button is disabled while submitting (jest-expo/web uses aria-disabled)
    const disabledButton = getByLabelText('Sign up');
    expect(
      disabledButton.props.accessibilityState?.disabled ?? disabledButton.props['aria-disabled']
    ).toBe(true);

    resolveSignUp?.({ error: null, emailConfirmationRequired: false });

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/onboarding');
    });
  });
});

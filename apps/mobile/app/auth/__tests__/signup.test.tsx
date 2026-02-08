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
const expoRouter = require('expo-router');
expoRouter.useRouter = () => ({
  push: jest.fn(),
  replace: mockReplace,
  back: jest.fn(),
});

describe('SignupScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSignUp.mockResolvedValue({ error: null });
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

  it('shows error when email is empty', async () => {
    const { getByLabelText, toJSON } = render(<SignupScreen />);

    fireEvent.press(getByLabelText('Sign up'));

    await waitFor(() => {
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Email is required');
    });

    expect(mockSignUp).not.toHaveBeenCalled();
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

  it('shows error from sign up failure', async () => {
    mockSignUp.mockResolvedValue({ error: new Error('User already exists') });

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
});

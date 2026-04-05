import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import WelcomeScreen from '../index';

jest.mock('expo-router', () => ({
  router: {
    replace: jest.fn(),
    push: jest.fn(),
  },
}));

const { router: mockRouter } = jest.requireMock<{
  router: { replace: jest.Mock; push: jest.Mock };
}>('expo-router');

const mockUser = { id: 'user-1' };
let mockAuthUser: { id: string } | null = mockUser;

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: mockAuthUser,
    session: null,
    isLoading: false,
    isConfigured: true,
    signIn: jest.fn(),
    signUp: jest.fn(),
    signOut: jest.fn(),
  }),
}));

let mockSupabase: unknown = {};
jest.mock('@/lib/supabase', () => ({
  get supabase() {
    return mockSupabase;
  },
}));

const mockGetAthleteByAuthUser = jest.fn();
const mockCreateAthlete = jest.fn();

jest.mock('@khepri/supabase-client', () => ({
  getAthleteByAuthUser: (...args: unknown[]) => mockGetAthleteByAuthUser(...args),
  createAthlete: (...args: unknown[]) => mockCreateAthlete(...args),
}));

jest.spyOn(Alert, 'alert');

beforeEach(() => {
  jest.clearAllMocks();
  mockAuthUser = mockUser;
  mockSupabase = {};
  mockGetAthleteByAuthUser.mockResolvedValue({ data: null, error: null });
  mockCreateAthlete.mockResolvedValue({ data: { id: 'athlete-1' }, error: null });
});

describe('WelcomeScreen', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(<WelcomeScreen />);
    expect(toJSON()).toBeTruthy();
  });

  it('renders the app title', () => {
    const { toJSON } = render(<WelcomeScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Khepri');
  });

  it('renders the tagline', () => {
    const { toJSON } = render(<WelcomeScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Your AI Triathlon Coach');
  });

  it('renders the welcome message', () => {
    const { toJSON } = render(<WelcomeScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Welcome to smarter training');
  });

  it('renders the description', () => {
    const { toJSON } = render(<WelcomeScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('personal AI coach powered by Claude');
  });

  it('renders all feature highlights', () => {
    const { toJSON } = render(<WelcomeScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Daily check-ins for personalized workouts');
    expect(json).toContain('Syncs with Intervals.icu for your data');
    expect(json).toContain('Recommendations backed by science');
    expect(json).toContain('Safety guardrails to prevent overtraining');
  });

  it('renders the Get Started button', () => {
    const { toJSON } = render(<WelcomeScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Get Started');
  });

  it('renders the Skip button', () => {
    const { toJSON } = render(<WelcomeScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Skip for now');
  });

  describe('Get Started', () => {
    it('creates athlete and navigates to connect when athlete does not exist', async () => {
      mockGetAthleteByAuthUser.mockResolvedValue({
        data: null,
        error: new Error('no rows', { cause: { code: 'PGRST116' } }),
      });
      mockCreateAthlete.mockResolvedValue({ data: { id: 'athlete-1' }, error: null });

      const { getByLabelText } = render(<WelcomeScreen />);
      await act(async () => {
        fireEvent.press(getByLabelText('Get started with onboarding'));
      });

      expect(mockGetAthleteByAuthUser).toHaveBeenCalled();
      expect(mockCreateAthlete).toHaveBeenCalled();
      expect(mockRouter.push).toHaveBeenCalledWith('/onboarding/connect');
    });

    it('navigates to connect without creating when athlete already exists', async () => {
      mockGetAthleteByAuthUser.mockResolvedValue({
        data: { id: 'existing-athlete' },
        error: null,
      });

      const { getByLabelText } = render(<WelcomeScreen />);
      await act(async () => {
        fireEvent.press(getByLabelText('Get started with onboarding'));
      });

      expect(mockRouter.push).toHaveBeenCalledWith('/onboarding/connect');
      expect(mockCreateAthlete).not.toHaveBeenCalled();
    });

    it('shows alert when create athlete fails', async () => {
      mockGetAthleteByAuthUser.mockResolvedValue({
        data: null,
        error: new Error('no rows', { cause: { code: 'PGRST116' } }),
      });
      mockCreateAthlete.mockResolvedValue({ data: null, error: new Error('insert failed') });

      const { getByLabelText } = render(<WelcomeScreen />);
      fireEvent.press(getByLabelText('Get started with onboarding'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Error',
          'Failed to set up your profile. Please try again.'
        );
        expect(mockRouter.push).not.toHaveBeenCalled();
      });
    });

    it('shows alert for non-PGRST116 lookup errors', async () => {
      mockGetAthleteByAuthUser.mockResolvedValue({
        data: null,
        error: new Error('network error', { cause: { code: 'NETWORK_ERROR' } }),
      });

      const { getByLabelText } = render(<WelcomeScreen />);
      fireEvent.press(getByLabelText('Get started with onboarding'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Error',
          'Failed to check your profile. Please try again.'
        );
        expect(mockCreateAthlete).not.toHaveBeenCalled();
        expect(mockRouter.push).not.toHaveBeenCalled();
      });
    });

    it('shows alert when user is not authenticated', async () => {
      mockAuthUser = null;

      const { getByLabelText } = render(<WelcomeScreen />);
      fireEvent.press(getByLabelText('Get started with onboarding'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Email Not Confirmed',
          expect.any(String),
          expect.any(Array)
        );
        expect(mockRouter.push).not.toHaveBeenCalled();
      });
    });

    it('shows alert when supabase is not configured', async () => {
      mockSupabase = null;

      const { getByLabelText } = render(<WelcomeScreen />);
      fireEvent.press(getByLabelText('Get started with onboarding'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Configuration Error',
          'The app is not configured correctly. Please try again later.'
        );
        expect(mockRouter.push).not.toHaveBeenCalled();
      });
    });

    it('handles unexpected exceptions gracefully', async () => {
      mockGetAthleteByAuthUser.mockRejectedValue(new Error('unexpected'));

      const { getByLabelText } = render(<WelcomeScreen />);
      fireEvent.press(getByLabelText('Get started with onboarding'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Error',
          'Failed to set up your profile. Please try again.'
        );
        expect(mockRouter.push).not.toHaveBeenCalled();
      });
    });
  });

  describe('Skip', () => {
    it('creates athlete and navigates to dashboard', async () => {
      mockGetAthleteByAuthUser.mockResolvedValue({
        data: null,
        error: new Error('no rows', { cause: { code: 'PGRST116' } }),
      });
      mockCreateAthlete.mockResolvedValue({ data: { id: 'athlete-1' }, error: null });

      const { getByLabelText } = render(<WelcomeScreen />);
      await act(async () => {
        fireEvent.press(getByLabelText('Skip onboarding'));
      });

      expect(mockRouter.replace).toHaveBeenCalledWith('/(tabs)');
      expect(mockCreateAthlete).toHaveBeenCalled();
    });

    it('navigates to dashboard without creating when athlete exists', async () => {
      mockGetAthleteByAuthUser.mockResolvedValue({
        data: { id: 'existing-athlete' },
        error: null,
      });

      const { getByLabelText } = render(<WelcomeScreen />);
      await act(async () => {
        fireEvent.press(getByLabelText('Skip onboarding'));
      });

      expect(mockRouter.replace).toHaveBeenCalledWith('/(tabs)');
      expect(mockCreateAthlete).not.toHaveBeenCalled();
    });
  });
});

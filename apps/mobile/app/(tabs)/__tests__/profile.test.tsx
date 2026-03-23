import { render } from '@testing-library/react-native';
import ProfileScreen from '../profile';

// Mock expo-router
jest.mock('expo-router', () => ({
  Link: ({ children }: { children: React.ReactNode }) => children,
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
}));

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    signOut: jest.fn(),
  }),
}));

const mockUseIntervalsConnection = jest.fn();
jest.mock('@/hooks/useIntervalsConnection', () => ({
  useIntervalsConnection: () => mockUseIntervalsConnection(),
}));

function setIntervalsConnection(
  connected: boolean,
  isLoading = false,
  error: string | null = null
) {
  mockUseIntervalsConnection.mockReturnValue({
    status: { connected },
    isLoading,
    error,
    connect: jest.fn(),
    disconnect: jest.fn(),
    refresh: jest.fn(),
  });
}

describe('ProfileScreen', () => {
  beforeEach(() => {
    setIntervalsConnection(false);
  });

  it('renders without crashing', () => {
    const { toJSON } = render(<ProfileScreen />);
    expect(toJSON()).toBeTruthy();
  });

  it('renders the profile header', () => {
    const { toJSON } = render(<ProfileScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Athlete');
  });

  it('renders the Profile section', () => {
    const { toJSON } = render(<ProfileScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('PROFILE');
    expect(json).toContain('Personal Info');
    expect(json).toContain('Fitness Numbers');
    expect(json).toContain('Goals');
    expect(json).toContain('Constraints');
  });

  it('renders the Connections section', () => {
    const { toJSON } = render(<ProfileScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('CONNECTIONS');
    expect(json).toContain('Intervals.icu');
    expect(json).toContain('Not connected');
  });

  it('renders the Preferences section', () => {
    const { toJSON } = render(<ProfileScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('PREFERENCES');
    expect(json).toContain('Notifications');
    expect(json).toContain('Appearance');
    expect(json).toContain('Training Plan');
  });

  it('renders the Support section', () => {
    const { toJSON } = render(<ProfileScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('SUPPORT');
    expect(json).toContain('Help & FAQ');
    expect(json).toContain('Privacy Policy');
    expect(json).toContain('About');
  });

  it('renders the sign out button', () => {
    const { toJSON } = render(<ProfileScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Sign Out');
  });

  it('renders the onboarding button', () => {
    const { toJSON } = render(<ProfileScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Run Onboarding Flow');
  });

  it('renders the footer with GitHub link', () => {
    const { toJSON } = render(<ProfileScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('github.com/bilaltawfic/khepri');
  });

  it('renders user preferences in the header', () => {
    const { toJSON } = render(<ProfileScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Metric');
    expect(json).toContain('UTC');
  });

  describe('Intervals.icu connection status', () => {
    it('shows "Connected" when credentials exist', () => {
      setIntervalsConnection(true);
      const { toJSON } = render(<ProfileScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Connected');
      expect(json).not.toContain('Not connected');
    });

    it('shows "Not connected" when no credentials', () => {
      setIntervalsConnection(false);
      const { toJSON } = render(<ProfileScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Not connected');
    });

    it('shows "Checking..." while loading', () => {
      setIntervalsConnection(false, true);
      const { toJSON } = render(<ProfileScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Checking...');
      expect(json).not.toContain('Not connected');
    });

    it('renders Intervals.icu menu item with correct accessibility label when connected', () => {
      setIntervalsConnection(true);
      const { getByLabelText } = render(<ProfileScreen />);
      expect(getByLabelText('Intervals.icu: Connected')).toBeTruthy();
    });

    it('renders Intervals.icu menu item with correct accessibility label when not connected', () => {
      setIntervalsConnection(false);
      const { getByLabelText } = render(<ProfileScreen />);
      expect(getByLabelText('Intervals.icu: Not connected')).toBeTruthy();
    });
  });
});

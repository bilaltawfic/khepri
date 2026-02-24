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

describe('ProfileScreen', () => {
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
});

import { render } from '@testing-library/react-native';
import WelcomeScreen from '../index';

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
});

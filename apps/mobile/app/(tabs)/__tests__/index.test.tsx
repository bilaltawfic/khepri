import { render } from '@testing-library/react-native';
import DashboardScreen from '../index';

describe('DashboardScreen', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(<DashboardScreen />);
    expect(toJSON()).toBeTruthy();
  });

  it('renders the greeting text', () => {
    const { toJSON } = render(<DashboardScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Good morning!');
  });

  it('renders the subtitle text', () => {
    const { toJSON } = render(<DashboardScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain("Here's your training overview");
  });

  it("renders Today's Workout card", () => {
    const { toJSON } = render(<DashboardScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain("Today's Workout");
    expect(json).toContain('Your personalized workout for today will appear here');
  });

  it('renders Training Load card with metrics', () => {
    const { toJSON } = render(<DashboardScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Training Load');
    expect(json).toContain('CTL (Fitness)');
    expect(json).toContain('ATL (Fatigue)');
    expect(json).toContain('TSB (Form)');
  });

  it('renders Upcoming Events card', () => {
    const { toJSON } = render(<DashboardScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Upcoming Events');
    expect(json).toContain('No upcoming events');
  });

  it('shows check-in prompt when no workout is configured', () => {
    const { toJSON } = render(<DashboardScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Complete your daily check-in to get started');
  });

  it('renders all three main dashboard cards', () => {
    const { toJSON } = render(<DashboardScreen />);
    const json = JSON.stringify(toJSON());
    // Check that all three card titles are present
    expect(json).toContain("Today's Workout");
    expect(json).toContain('Training Load');
    expect(json).toContain('Upcoming Events');
  });

  it('displays placeholder values for training metrics', () => {
    const { toJSON } = render(<DashboardScreen />);
    const json = JSON.stringify(toJSON());
    // The -- placeholder is shown when not connected to Intervals.icu
    expect(json).toContain('--');
  });
});

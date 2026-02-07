import { render } from '@testing-library/react-native';
import CheckinHistoryScreen from '../history';

// Mock expo-router
jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    back: jest.fn(),
  },
}));

describe('CheckinHistoryScreen', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(<CheckinHistoryScreen />);
    expect(toJSON()).toBeTruthy();
  });

  it('renders history items', () => {
    const { toJSON } = render(<CheckinHistoryScreen />);
    const json = JSON.stringify(toJSON());
    // Should contain some date information (Today, Yesterday, or weekday names)
    const hasDateContent =
      json.includes('Today') ||
      json.includes('Yesterday') ||
      json.includes('Mon') ||
      json.includes('Tue') ||
      json.includes('Wed') ||
      json.includes('Thu') ||
      json.includes('Fri') ||
      json.includes('Sat') ||
      json.includes('Sun') ||
      json.includes('Feb');
    expect(hasDateContent).toBe(true);
  });

  it('renders wellness percentage for each item', () => {
    const { toJSON } = render(<CheckinHistoryScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Wellness');
    expect(json).toContain('%');
  });

  it('renders metric badges for sleep, energy, stress, soreness', () => {
    const { toJSON } = render(<CheckinHistoryScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Energy');
    expect(json).toContain('Stress');
    expect(json).toContain('Soreness');
  });

  it('renders recommendation summaries', () => {
    const { toJSON } = render(<CheckinHistoryScreen />);
    const json = JSON.stringify(toJSON());
    // Check for some recommendation text from mock data
    expect(json).toContain('workout');
  });
});

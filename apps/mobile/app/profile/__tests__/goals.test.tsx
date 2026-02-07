import { render } from '@testing-library/react-native';
import GoalsScreen from '../goals';

// Mock expo-router
jest.mock('expo-router', () => ({
  Link: 'Link',
  router: {
    back: jest.fn(),
    push: jest.fn(),
  },
}));

describe('GoalsScreen', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(<GoalsScreen />);
    expect(toJSON()).toBeTruthy();
  });

  it('renders the Add Goal section', () => {
    const { toJSON } = render(<GoalsScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('ADD A GOAL');
  });

  it('renders all goal type cards', () => {
    const { toJSON } = render(<GoalsScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Race Goal');
    expect(json).toContain('Performance Goal');
    expect(json).toContain('Fitness Goal');
    expect(json).toContain('Health Goal');
  });

  it('renders goal type descriptions', () => {
    const { toJSON } = render(<GoalsScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain("A specific event you're training for");
    expect(json).toContain('A fitness metric you want to improve');
    expect(json).toContain('Volume or consistency targets');
    expect(json).toContain('Weight, wellness, or lifestyle targets');
  });

  it('renders the empty state when no goals exist', () => {
    const { toJSON } = render(<GoalsScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('No active goals yet');
    expect(json).toContain('Add a goal to help Khepri personalize your training');
  });

  it('renders the priority tip', () => {
    const { toJSON } = render(<GoalsScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Set priorities');
    expect(json).toContain('A/B/C');
  });
});

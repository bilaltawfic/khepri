import { render } from '@testing-library/react-native';
import GoalFormScreen from '../goal-form';

// Mock expo-router
jest.mock('expo-router', () => ({
  router: {
    back: jest.fn(),
    push: jest.fn(),
  },
  useLocalSearchParams: () => ({ type: 'race' }),
}));

describe('GoalFormScreen', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(<GoalFormScreen />);
    expect(toJSON()).toBeTruthy();
  });

  it('renders the goal type header', () => {
    const { toJSON } = render(<GoalFormScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Race Goal');
    expect(json).toContain('A specific event you are training for');
  });

  it('renders Goal Information section', () => {
    const { toJSON } = render(<GoalFormScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Goal Information');
    expect(json).toContain('Title');
    expect(json).toContain('Description');
    expect(json).toContain('Priority');
  });

  it('renders Race Details section for race goal type', () => {
    const { toJSON } = render(<GoalFormScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Race Details');
    expect(json).toContain('Event Name');
    expect(json).toContain('Distance');
    expect(json).toContain('Location');
    expect(json).toContain('Target Time');
  });

  it('renders Add Goal button', () => {
    const { toJSON } = render(<GoalFormScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Add Goal');
  });

  it('renders Cancel button', () => {
    const { toJSON } = render(<GoalFormScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Cancel');
  });

  it('renders priority field', () => {
    const { toJSON } = render(<GoalFormScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Priority');
  });

  it('renders date picker for race date', () => {
    const { toJSON } = render(<GoalFormScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Race Date');
  });
});

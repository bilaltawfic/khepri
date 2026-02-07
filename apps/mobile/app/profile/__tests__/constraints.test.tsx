import { render } from '@testing-library/react-native';
import ConstraintsScreen from '../constraints';

// Mock expo-router
jest.mock('expo-router', () => ({
  router: {
    back: jest.fn(),
    push: jest.fn(),
  },
}));

describe('ConstraintsScreen', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(<ConstraintsScreen />);
    expect(toJSON()).toBeTruthy();
  });

  it('renders the description', () => {
    const { toJSON } = render(<ConstraintsScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Tell Khepri about things that affect your training');
  });

  it('renders the Add Constraint section', () => {
    const { toJSON } = render(<ConstraintsScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('ADD A CONSTRAINT');
  });

  it('renders all constraint type cards', () => {
    const { toJSON } = render(<ConstraintsScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Injury');
    expect(json).toContain('Travel');
    expect(json).toContain('Availability Change');
  });

  it('renders constraint type descriptions', () => {
    const { toJSON } = render(<ConstraintsScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Log an injury to adjust training');
    expect(json).toContain('Traveling with limited equipment');
    expect(json).toContain('Temporary schedule changes');
  });

  it('renders the empty state when no constraints exist', () => {
    const { toJSON } = render(<ConstraintsScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('No active constraints');
    expect(json).toContain('Add constraints when something affects your ability to train');
  });

  it('renders the tip about automatic adjustments', () => {
    const { toJSON } = render(<ConstraintsScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Khepri will automatically adjust');
  });
});

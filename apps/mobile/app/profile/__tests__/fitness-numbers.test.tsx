import { render } from '@testing-library/react-native';
import FitnessNumbersScreen from '../fitness-numbers';

// Mock expo-router
jest.mock('expo-router', () => ({
  router: {
    back: jest.fn(),
    push: jest.fn(),
  },
}));

describe('FitnessNumbersScreen', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(<FitnessNumbersScreen />);
    expect(toJSON()).toBeTruthy();
  });

  it('renders the description', () => {
    const { toJSON } = render(<FitnessNumbersScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Your fitness numbers help Khepri calculate training zones');
  });

  it('renders the Intervals.icu sync tip', () => {
    const { toJSON } = render(<FitnessNumbersScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Connect Intervals.icu');
  });

  it('renders Cycling section', () => {
    const { toJSON } = render(<FitnessNumbersScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Cycling');
    expect(json).toContain('Functional Threshold Power');
    expect(json).toContain('FTP');
  });

  it('renders Running section', () => {
    const { toJSON } = render(<FitnessNumbersScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Running');
    expect(json).toContain('Threshold Pace');
  });

  it('renders Swimming section', () => {
    const { toJSON } = render(<FitnessNumbersScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Swimming');
    expect(json).toContain('Critical Swim Speed');
  });

  it('renders Heart Rate section', () => {
    const { toJSON } = render(<FitnessNumbersScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Heart Rate');
    expect(json).toContain('Resting Heart Rate');
    expect(json).toContain('Max Heart Rate');
    expect(json).toContain('Lactate Threshold Heart Rate');
  });

  it('renders Save and Cancel buttons', () => {
    const { toJSON } = render(<FitnessNumbersScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Save Changes');
    expect(json).toContain('Cancel');
  });
});

import { render } from '@testing-library/react-native';
import FitnessScreen from '../fitness';

describe('FitnessScreen', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(<FitnessScreen />);
    expect(toJSON()).toBeTruthy();
  });

  it('renders the title', () => {
    const { toJSON } = render(<FitnessScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Your Fitness Numbers');
  });

  it('renders the description', () => {
    const { toJSON } = render(<FitnessScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Share your current fitness metrics');
  });

  it('renders the info card about Intervals.icu sync', () => {
    const { toJSON } = render(<FitnessScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('connect Intervals.icu');
  });

  it('renders the Cycling section', () => {
    const { toJSON } = render(<FitnessScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Cycling');
    expect(json).toContain('FTP (Functional Threshold Power)');
    expect(json).toContain('LTHR (Lactate Threshold Heart Rate)');
  });

  it('renders the Running section', () => {
    const { toJSON } = render(<FitnessScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Running');
    expect(json).toContain('Threshold Pace');
  });

  it('renders the Swimming section', () => {
    const { toJSON } = render(<FitnessScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Swimming');
    expect(json).toContain('CSS (Critical Swim Speed)');
  });

  it('renders the Heart Rate section', () => {
    const { toJSON } = render(<FitnessScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Heart Rate');
    expect(json).toContain('Resting Heart Rate');
    expect(json).toContain('Max Heart Rate');
  });

  it('renders the Continue button', () => {
    const { toJSON } = render(<FitnessScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Continue');
  });

  it('renders the Skip button', () => {
    const { toJSON } = render(<FitnessScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain("Skip - I'll add these later");
  });
});

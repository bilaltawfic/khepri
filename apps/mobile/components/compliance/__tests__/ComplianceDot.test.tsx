import { render } from '@testing-library/react-native';
import { ComplianceDot } from '../ComplianceDot';

describe('ComplianceDot', () => {
  it('renders without crashing for each score value', () => {
    const scores = ['green', 'amber', 'red', 'missed', 'unplanned'] as const;
    for (const score of scores) {
      const { toJSON } = render(<ComplianceDot score={score} />);
      expect(toJSON()).toBeTruthy();
    }
  });

  it('renders without crashing for null score (future workout)', () => {
    const { toJSON } = render(<ComplianceDot score={null} />);
    expect(toJSON()).toBeTruthy();
  });

  it('renders correct accessibility label for green score', () => {
    const { toJSON } = render(<ComplianceDot score="green" />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Compliance: green');
  });

  it('renders correct accessibility label for null score', () => {
    const { toJSON } = render(<ComplianceDot score={null} />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Not yet completed');
  });

  it('renders correct accessibility label for missed score', () => {
    const { toJSON } = render(<ComplianceDot score="missed" />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Compliance: missed');
  });

  it('accepts custom size', () => {
    const { toJSON } = render(<ComplianceDot score="green" size={16} />);
    expect(toJSON()).toBeTruthy();
  });
});

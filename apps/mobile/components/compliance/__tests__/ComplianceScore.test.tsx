import { render } from '@testing-library/react-native';
import { ComplianceScore } from '../ComplianceScore';

describe('ComplianceScore', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(<ComplianceScore value={0.91} />);
    expect(toJSON()).toBeTruthy();
  });

  it('displays the correct percentage for value 0.91', () => {
    const { toJSON } = render(<ComplianceScore value={0.91} />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('91%');
  });

  it('displays the correct percentage for value 0.65', () => {
    const { toJSON } = render(<ComplianceScore value={0.65} />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('65%');
  });

  it('displays 0% for value 0', () => {
    const { toJSON } = render(<ComplianceScore value={0} />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('0%');
  });

  it('displays 100% for value 1.0', () => {
    const { toJSON } = render(<ComplianceScore value={1.0} />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('100%');
  });

  it('renders correct accessibility label', () => {
    const { toJSON } = render(<ComplianceScore value={0.75} />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Compliance score: 75%');
  });

  it('accepts custom font size', () => {
    const { toJSON } = render(<ComplianceScore value={0.9} fontSize={18} />);
    expect(toJSON()).toBeTruthy();
  });
});

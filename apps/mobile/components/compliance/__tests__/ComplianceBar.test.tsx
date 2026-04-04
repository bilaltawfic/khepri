import { render } from '@testing-library/react-native';
import { ComplianceBar } from '../ComplianceBar';

describe('ComplianceBar', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(<ComplianceBar green={3} amber={1} red={1} missed={0} total={5} />);
    expect(toJSON()).toBeTruthy();
  });

  it('renders with all zeros gracefully', () => {
    const { toJSON } = render(<ComplianceBar green={0} amber={0} red={0} missed={0} total={0} />);
    expect(toJSON()).toBeTruthy();
  });

  it('renders correct accessibility label', () => {
    const { toJSON } = render(<ComplianceBar green={3} amber={1} red={1} missed={1} total={6} />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('3 green');
    expect(json).toContain('1 amber');
  });

  it('renders remaining (future) sessions as a segment', () => {
    // green=2, amber=1, red=0, missed=0, total=5 → 2 remaining
    const { toJSON } = render(<ComplianceBar green={2} amber={1} red={0} missed={0} total={5} />);
    expect(toJSON()).toBeTruthy();
  });

  it('accepts custom height', () => {
    const { toJSON } = render(
      <ComplianceBar green={5} amber={0} red={0} missed={0} total={5} height={12} />
    );
    expect(toJSON()).toBeTruthy();
  });
});

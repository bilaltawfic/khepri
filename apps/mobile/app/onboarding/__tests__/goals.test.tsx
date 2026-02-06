import { render } from '@testing-library/react-native';
import GoalsScreen from '../goals';

describe('GoalsScreen', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(<GoalsScreen />);
    expect(toJSON()).toBeTruthy();
  });

  it('renders the title', () => {
    const { toJSON } = render(<GoalsScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('What are you working toward?');
  });

  it('renders the description', () => {
    const { toJSON } = render(<GoalsScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Add your goals so Khepri can tailor your training');
  });

  it('renders the Race Goal card', () => {
    const { toJSON } = render(<GoalsScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Race Goal');
    expect(json).toContain("A specific event you're training for");
    expect(json).toContain('Complete Ironman 70.3 on June 15');
  });

  it('renders the Performance Goal card', () => {
    const { toJSON } = render(<GoalsScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Performance Goal');
    expect(json).toContain('A fitness metric you want to improve');
    expect(json).toContain('Increase FTP from 250W to 280W');
  });

  it('renders the Fitness Goal card', () => {
    const { toJSON } = render(<GoalsScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Fitness Goal');
    expect(json).toContain('Volume or consistency targets');
    expect(json).toContain('Build to 40km running per week');
  });

  it('renders the Health Goal card', () => {
    const { toJSON } = render(<GoalsScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Health Goal');
    expect(json).toContain('Weight, wellness, or lifestyle targets');
    expect(json).toContain('Lose 5kg before race season');
  });

  it('renders the empty state', () => {
    const { toJSON } = render(<GoalsScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('No goals added yet');
  });

  it('renders the tip', () => {
    const { toJSON } = render(<GoalsScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Start with your most important goal');
  });

  it('renders the Continue button', () => {
    const { toJSON } = render(<GoalsScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Continue');
  });

  it('renders the Skip button', () => {
    const { toJSON } = render(<GoalsScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain("Skip - I'll set goals later");
  });
});

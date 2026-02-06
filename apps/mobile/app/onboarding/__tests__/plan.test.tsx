import { render, fireEvent } from '@testing-library/react-native';
import PlanScreen from '../plan';

describe('PlanScreen', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(<PlanScreen />);
    expect(toJSON()).toBeTruthy();
  });

  it('renders the title', () => {
    const { toJSON } = render(<PlanScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('How would you like to train?');
  });

  it('renders the description', () => {
    const { toJSON } = render(<PlanScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Choose how Khepri should guide your training');
  });

  it('renders the Structured Training Plan option', () => {
    const { toJSON } = render(<PlanScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Structured Training Plan');
    expect(json).toContain('Periodized training blocks');
    expect(json).toContain('Progressive overload built-in');
  });

  it('renders the Daily Suggestions option', () => {
    const { toJSON } = render(<PlanScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Daily Suggestions');
    expect(json).toContain('Flexible day-to-day training');
    expect(json).toContain('Adapts to your schedule');
  });

  it('renders the info card', () => {
    const { toJSON } = render(<PlanScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Both options use AI to personalize workouts');
  });

  it('renders the Start Training button', () => {
    const { toJSON } = render(<PlanScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Start Training');
  });

  it('renders the Decide later button', () => {
    const { toJSON } = render(<PlanScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Decide later');
  });

  it('can select the structured plan option', () => {
    const { getByLabelText } = render(<PlanScreen />);
    const structuredButton = getByLabelText('Select Structured Training Plan');
    expect(() => fireEvent.press(structuredButton)).not.toThrow();
  });

  it('can select the daily suggestions option', () => {
    const { getByLabelText } = render(<PlanScreen />);
    const dailyButton = getByLabelText('Select Daily Suggestions');
    expect(() => fireEvent.press(dailyButton)).not.toThrow();
  });
});

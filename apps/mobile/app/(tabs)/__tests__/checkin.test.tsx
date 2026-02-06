import { render } from '@testing-library/react-native';
import CheckinScreen from '../checkin';

describe('CheckinScreen', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(<CheckinScreen />);
    expect(toJSON()).toBeTruthy();
  });

  it('renders the title', () => {
    const { toJSON } = render(<CheckinScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Daily Check-in');
  });

  it('renders the subtitle', () => {
    const { toJSON } = render(<CheckinScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain("Tell me how you're feeling today");
  });

  it('renders the Sleep Quality card', () => {
    const { toJSON } = render(<CheckinScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Sleep Quality');
    expect(json).toContain('Rate your sleep quality from 1-10');
  });

  it('renders the Energy Level card', () => {
    const { toJSON } = render(<CheckinScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Energy Level');
    expect(json).toContain('How energized do you feel');
  });

  it('renders the Muscle Soreness card', () => {
    const { toJSON } = render(<CheckinScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Muscle Soreness');
    expect(json).toContain('Body map selector');
  });

  it('renders the Availability card', () => {
    const { toJSON } = render(<CheckinScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain("Today's Availability");
    expect(json).toContain('How much time do you have for training');
  });

  it('renders the submit button', () => {
    const { toJSON } = render(<CheckinScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain("Get Today's Recommendation");
  });

  it('renders the footer text', () => {
    const { toJSON } = render(<CheckinScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('personalized workout recommendation');
  });
});

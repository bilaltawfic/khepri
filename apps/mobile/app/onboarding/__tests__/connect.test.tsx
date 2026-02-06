import { render } from '@testing-library/react-native';
import ConnectScreen from '../connect';

describe('ConnectScreen', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(<ConnectScreen />);
    expect(toJSON()).toBeTruthy();
  });

  it('renders the title', () => {
    const { toJSON } = render(<ConnectScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Connect Intervals.icu');
  });

  it('renders the description', () => {
    const { toJSON } = render(<ConnectScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Connect your Intervals.icu account');
  });

  it('renders the benefits list', () => {
    const { toJSON } = render(<ConnectScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain("What you'll get:");
    expect(json).toContain('Automatic workout sync');
    expect(json).toContain('Real-time CTL/ATL/TSB metrics');
    expect(json).toContain('Training plan integration');
    expect(json).toContain('Workout push to calendar');
  });

  it('renders the Athlete ID input', () => {
    const { toJSON } = render(<ConnectScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Athlete ID');
    expect(json).toContain('Found in your Intervals.icu URL');
  });

  it('renders the API Key input', () => {
    const { toJSON } = render(<ConnectScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('API Key');
    expect(json).toContain('From Settings > API in Intervals.icu');
  });

  it('renders the Connect Account button', () => {
    const { toJSON } = render(<ConnectScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Connect Account');
  });

  it('renders the Skip button', () => {
    const { toJSON } = render(<ConnectScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Skip for now');
  });
});

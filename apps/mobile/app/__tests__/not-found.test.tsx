import { render } from '@testing-library/react-native';
import NotFoundScreen from '../+not-found';

// Link is globally mocked as jest.fn() in jest.setup.ts
const { Link: MockLink } = jest.requireMock<{ Link: jest.Mock }>('expo-router');

describe('NotFoundScreen', () => {
  beforeEach(() => {
    MockLink.mockClear();
  });

  it('renders without crashing', () => {
    const { toJSON } = render(<NotFoundScreen />);
    expect(toJSON()).toBeTruthy();
  });

  it('renders the title', () => {
    const { toJSON } = render(<NotFoundScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Page Not Found');
  });

  it('renders the description', () => {
    const { toJSON } = render(<NotFoundScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain("This screen doesn't exist");
  });

  it('renders the home link', () => {
    const { toJSON } = render(<NotFoundScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Go to home screen');
  });

  it('uses replace navigation to prevent back to not-found', () => {
    render(<NotFoundScreen />);
    const callArgs = MockLink.mock.calls[0][0];
    expect(callArgs.href).toBe('/(tabs)');
    expect(callArgs.replace).toBe(true);
  });
});

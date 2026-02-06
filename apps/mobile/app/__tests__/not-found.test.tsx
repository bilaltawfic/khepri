import { render } from '@testing-library/react-native';
import NotFoundScreen from '../+not-found';

describe('NotFoundScreen', () => {
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
});

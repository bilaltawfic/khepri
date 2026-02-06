import { render } from '@testing-library/react-native';
import OnboardingLayout from '../_layout';

describe('OnboardingLayout', () => {
  it('renders without throwing', () => {
    expect(() => render(<OnboardingLayout />)).not.toThrow();
  });
});

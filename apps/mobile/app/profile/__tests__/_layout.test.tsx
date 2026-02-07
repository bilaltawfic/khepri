import { render } from '@testing-library/react-native';

// Mock expo-router
jest.mock('expo-router', () => ({
  Stack: jest.fn(({ children }) => children),
}));

import ProfileLayout from '../_layout';

describe('ProfileLayout', () => {
  it('renders without crashing', () => {
    // Note: This is a basic smoke test for the layout component
    // The Stack component is mocked, so we're just testing that the component
    // doesn't throw when rendered
    expect(() => render(<ProfileLayout />)).not.toThrow();
  });
});

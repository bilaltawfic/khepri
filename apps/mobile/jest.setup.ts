// Built-in matchers from @testing-library/react-native v12.4+
import '@testing-library/react-native';
import React from 'react';

// Mock expo-font
jest.mock('expo-font', () => ({
  loadAsync: jest.fn(),
  isLoaded: jest.fn(() => true),
  useFonts: jest.fn(() => [true, null]),
}));

// Mock expo-splash-screen
jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn(),
  hideAsync: jest.fn(),
}));

// Mock expo-router
jest.mock('expo-router', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  })),
  useLocalSearchParams: jest.fn(() => ({})),
  useSegments: jest.fn(() => []),
  Link: ({ children }: { children: React.ReactNode }) => children,
  Tabs: {
    Screen: ({ children }: { children: React.ReactNode }) => children,
  },
  Stack: {
    Screen: ({ children }: { children: React.ReactNode }) => children,
  },
  Slot: () => null,
}));

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => {
  const insets = { top: 0, right: 0, bottom: 0, left: 0 };
  const frame = { x: 0, y: 0, width: 390, height: 844 };

  return {
    SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
    SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
    useSafeAreaInsets: () => insets,
    useSafeAreaFrame: () => frame,
    initialWindowMetrics: {
      insets,
      frame,
    },
  };
});

// Silence the warning about act
global.console = {
  ...console,
  // Uncomment to ignore specific warnings during tests
  // warn: jest.fn(),
};

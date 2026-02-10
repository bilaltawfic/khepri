// Built-in matchers from @testing-library/react-native v12.4+
import '@testing-library/react-native';
import type React from 'react';

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
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  },
  useLocalSearchParams: jest.fn(() => ({})),
  useSegments: jest.fn(() => []),
  Link: ({ children }: { children: React.ReactNode }) => children,
  Redirect: ({ href }: { href: string }) =>
    require('react').createElement(require('react-native').Text, null, `Redirect:${href}`),
  Tabs: ({ children }: { children: React.ReactNode }) => children,
  Stack: ({ children }: { children: React.ReactNode }) => children,
  Slot: () => null,
}));

// Add Screen as a property of Tabs and Stack after the mock
const mockTabs = require('expo-router').Tabs;
mockTabs.Screen = ({ children }: { children: React.ReactNode }) => children;
const mockStack = require('expo-router').Stack;
mockStack.Screen = ({ children }: { children: React.ReactNode }) => children;

// Mock @expo/vector-icons
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => ({
  default: {
    addWhitelistedNativeProps: jest.fn(),
    createAnimatedComponent: (component: unknown) => component,
  },
}));

// Mock @react-navigation/native
jest.mock('@react-navigation/native', () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
  DarkTheme: { dark: true, colors: {} },
  DefaultTheme: { dark: false, colors: {} },
  useNavigation: jest.fn(() => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
  })),
  useRoute: jest.fn(() => ({ params: {} })),
}));

// Mock expo-constants
jest.mock('expo-constants', () => {
  const expoConstantsMock = { expoConfig: { extra: {} } };
  return {
    __esModule: true,
    ...expoConstantsMock,
    default: expoConstantsMock,
  };
});

// Mock @react-native-async-storage/async-storage
jest.mock('@react-native-async-storage/async-storage', () => {
  const storageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
    multiGet: jest.fn(),
    multiSet: jest.fn(),
    multiRemove: jest.fn(),
  };
  return {
    __esModule: true,
    ...storageMock,
    default: storageMock,
  };
});

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

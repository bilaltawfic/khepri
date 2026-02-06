import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import 'react-native-reanimated';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync().catch(() => {
  // Ignore errors from calling preventAutoHideAsync multiple times
});

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    // Hide splash screen after layout is ready
    const hideSplash = async () => {
      try {
        await SplashScreen.hideAsync();
      } catch {
        // Ignore errors from calling hideAsync when splash is already hidden
      }
    };
    hideSplash();
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false, presentation: 'modal' }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

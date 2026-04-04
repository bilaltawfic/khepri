import { Stack } from 'expo-router';
import { useColorScheme } from 'react-native';

import { Colors } from '@/constants/Colors';
import { SeasonSetupProvider } from '@/contexts';

export default function SeasonLayout() {
  const colorScheme = useColorScheme() ?? 'light';

  return (
    <SeasonSetupProvider>
      <Stack
        screenOptions={{
          headerShown: true,
          headerStyle: {
            backgroundColor: Colors[colorScheme].background,
          },
          headerTintColor: Colors[colorScheme].text,
          headerBackTitle: 'Back',
          contentStyle: {
            backgroundColor: Colors[colorScheme].background,
          },
        }}
      >
        <Stack.Screen
          name="races"
          options={{
            title: 'Race Calendar',
          }}
        />
        <Stack.Screen
          name="goals"
          options={{
            title: 'Goals',
          }}
        />
        <Stack.Screen
          name="preferences"
          options={{
            title: 'Preferences',
          }}
        />
        <Stack.Screen
          name="overview"
          options={{
            title: 'Season Overview',
          }}
        />
      </Stack>
    </SeasonSetupProvider>
  );
}

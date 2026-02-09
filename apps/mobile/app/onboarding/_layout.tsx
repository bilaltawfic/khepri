import { Stack } from 'expo-router';
import { useColorScheme } from 'react-native';

import { Colors } from '@/constants/Colors';
import { OnboardingProvider } from '@/contexts';

export default function OnboardingLayout() {
  const colorScheme = useColorScheme() ?? 'light';

  return (
    <OnboardingProvider>
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
          name="index"
          options={{
            title: 'Welcome',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="connect"
          options={{
            title: 'Connect',
          }}
        />
        <Stack.Screen
          name="fitness"
          options={{
            title: 'Fitness Numbers',
          }}
        />
        <Stack.Screen
          name="goals"
          options={{
            title: 'Goals',
          }}
        />
        <Stack.Screen
          name="plan"
          options={{
            title: 'Training Plan',
          }}
        />
      </Stack>
    </OnboardingProvider>
  );
}

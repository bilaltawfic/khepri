import { Stack } from 'expo-router';
import { useColorScheme } from 'react-native';

import { Colors } from '@/constants/Colors';

export default function AnalysisLayout() {
  const colorScheme = useColorScheme() ?? 'light';

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: Colors[colorScheme].surface,
        },
        headerTintColor: Colors[colorScheme].text,
      }}
    >
      <Stack.Screen
        name="race-countdown"
        options={{
          title: 'Race Countdown',
        }}
      />
    </Stack>
  );
}

import { Stack } from 'expo-router';
import { useColorScheme } from 'react-native';

import { Colors } from '@/constants/Colors';

export default function CheckinLayout() {
  const colorScheme = useColorScheme() ?? 'light';

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: Colors[colorScheme].background,
        },
        headerTintColor: Colors[colorScheme].text,
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen
        name="history"
        options={{
          title: 'Check-in History',
          presentation: 'card',
        }}
      />
    </Stack>
  );
}

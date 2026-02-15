import { Stack } from 'expo-router';
import { useColorScheme } from 'react-native';

import { Colors } from '@/constants/Colors';

export default function WorkoutsLayout() {
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
      <Stack.Screen name="index" options={{ title: 'Workouts' }} />
      <Stack.Screen name="[id]" options={{ title: 'Workout Detail' }} />
    </Stack>
  );
}

import { Stack } from 'expo-router';
import { useColorScheme } from 'react-native';

import { Colors } from '@/constants/Colors';

export default function PlanLayout() {
  const colorScheme = useColorScheme() ?? 'light';

  return (
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
        name="block-setup"
        options={{
          title: 'Block Setup',
        }}
      />
      <Stack.Screen
        name="block-review"
        options={{
          title: 'Review Workouts',
        }}
      />
      <Stack.Screen
        name="block-lock"
        options={{
          title: 'Lock In',
        }}
      />
    </Stack>
  );
}

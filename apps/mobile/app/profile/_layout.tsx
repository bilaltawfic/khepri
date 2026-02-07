import { Stack } from 'expo-router';
import { useColorScheme } from 'react-native';

import { Colors } from '@/constants/Colors';

export default function ProfileLayout() {
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
        name="personal-info"
        options={{
          title: 'Personal Info',
        }}
      />
      <Stack.Screen
        name="fitness-numbers"
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
        name="goal-form"
        options={{
          title: 'Add Goal',
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="constraints"
        options={{
          title: 'Constraints',
        }}
      />
      <Stack.Screen
        name="constraint-form"
        options={{
          title: 'Add Constraint',
          presentation: 'modal',
        }}
      />
    </Stack>
  );
}

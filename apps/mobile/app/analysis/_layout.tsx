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
        name="training-review"
        options={{
          title: 'Training Review',
        }}
      />
    </Stack>
  );
}

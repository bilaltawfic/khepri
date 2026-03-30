import { Ionicons } from '@expo/vector-icons';
import { Stack, router } from 'expo-router';
import { Pressable, useColorScheme } from 'react-native';

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
          headerLeft: () => (
            <Pressable
              onPress={() => router.back()}
              accessibilityLabel="Go back"
              accessibilityRole="button"
              style={{ marginRight: 8 }}
            >
              <Ionicons
                name="chevron-back"
                size={24}
                color={Colors[colorScheme].text}
              />
            </Pressable>
          ),
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          title: 'Check-in Detail',
          presentation: 'card',
        }}
      />
    </Stack>
  );
}

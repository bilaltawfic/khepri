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
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityLabel="Go back"
              accessibilityRole="button"
              style={{ padding: 4, marginRight: 8 }}
            >
              <Ionicons
                name="chevron-back"
                size={28}
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

import { Ionicons } from '@expo/vector-icons';
import { Tabs, useRouter } from 'expo-router';
import { Pressable, useColorScheme } from 'react-native';

import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Colors } from '@/constants/Colors';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

function TabBarIcon(props: {
  name: IconName;
  color: string;
}) {
  return <Ionicons size={28} style={{ marginBottom: -3 }} {...props} />;
}

export default function TabLayout() {
  const colorScheme = useColorScheme() ?? 'light';
  const router = useRouter();

  return (
    <ProtectedRoute>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: Colors[colorScheme].tabIconSelected,
          tabBarInactiveTintColor: Colors[colorScheme].tabIconDefault,
          headerShown: true,
          headerStyle: {
            backgroundColor: Colors[colorScheme].surface,
          },
          headerTintColor: Colors[colorScheme].text,
          tabBarStyle: {
            backgroundColor: Colors[colorScheme].surface,
            borderTopColor: Colors[colorScheme].border,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Dashboard',
            tabBarIcon: ({ color }) => <TabBarIcon name="home" color={color} />,
          }}
        />
        <Tabs.Screen
          name="checkin"
          options={{
            title: 'Check-in',
            tabBarIcon: ({ color }) => <TabBarIcon name="checkmark-circle" color={color} />,
          }}
        />
        <Tabs.Screen
          name="calendar"
          options={{
            title: 'Calendar',
            tabBarIcon: ({ color }) => <TabBarIcon name="calendar" color={color} />,
          }}
        />
        <Tabs.Screen
          name="chat"
          options={{
            title: 'Coach',
            tabBarIcon: ({ color }) => <TabBarIcon name="chatbubbles" color={color} />,
            headerRight: () => (
              <Pressable
                onPress={() => router.push('/chat/history')}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="View conversation history"
                style={{ marginRight: 16 }}
              >
                <Ionicons name="time-outline" size={24} color={Colors[colorScheme].icon} />
              </Pressable>
            ),
          }}
        />
        <Tabs.Screen
          name="plan"
          options={{
            title: 'Plan',
            tabBarIcon: ({ color }) => <TabBarIcon name="clipboard" color={color} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color }) => <TabBarIcon name="person" color={color} />,
          }}
        />
      </Tabs>
    </ProtectedRoute>
  );
}

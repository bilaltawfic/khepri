import { Stack, router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <View style={styles.container}>
        <ThemedText type="title">Page Not Found</ThemedText>
        <ThemedText style={styles.description}>This screen doesn't exist.</ThemedText>
        <Pressable
          onPress={() => router.replace('/(tabs)')}
          style={styles.link}
          accessibilityRole="link"
        >
          <ThemedText type="link">Go to home screen</ThemedText>
        </Pressable>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  description: {
    marginTop: 8,
    marginBottom: 20,
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
});

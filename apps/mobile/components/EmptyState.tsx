import { Ionicons } from '@expo/vector-icons';
import { type StyleProp, StyleSheet, type ViewStyle, useColorScheme } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';

type EmptyStateProps = {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  message: string;
  iconSize?: number;
  iconColor?: string;
  title?: string;
  style?: StyleProp<ViewStyle>;
};

export function EmptyState({ icon, message, iconSize, iconColor, title, style }: EmptyStateProps) {
  const colorScheme = useColorScheme() ?? 'light';

  return (
    <ThemedView
      style={[styles.container, { backgroundColor: Colors[colorScheme].surfaceVariant }, style]}
    >
      <Ionicons
        name={icon}
        size={iconSize ?? 40}
        color={iconColor ?? Colors[colorScheme].iconSecondary}
      />
      {title != null && (
        <ThemedText type="defaultSemiBold" style={styles.title}>
          {title}
        </ThemedText>
      )}
      <ThemedText type="caption" style={styles.message}>
        {message}
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },
  title: {
    marginTop: 4,
  },
  message: {
    textAlign: 'center',
    lineHeight: 20,
  },
});

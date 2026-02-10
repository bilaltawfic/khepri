import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View, useColorScheme } from 'react-native';

import { Button } from '@/components/Button';
import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';

type ErrorStateAction = {
  title: string;
  onPress: () => void;
  accessibilityLabel?: string;
};

type ErrorStateProps = {
  message: string;
  icon?: React.ComponentProps<typeof Ionicons>['name'] | null;
  iconColor?: string;
  title?: string;
  action?: ErrorStateAction;
};

export function ErrorState({ message, icon, iconColor, title, action }: ErrorStateProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const resolvedIcon = icon === undefined ? 'alert-circle-outline' : icon;

  return (
    <View style={styles.container}>
      {resolvedIcon != null && (
        <Ionicons name={resolvedIcon} size={48} color={iconColor ?? Colors[colorScheme].error} />
      )}
      {title != null && (
        <ThemedText type="defaultSemiBold" style={styles.title}>
          {title}
        </ThemedText>
      )}
      <ThemedText type="caption" style={styles.message}>
        {message}
      </ThemedText>
      {action != null && (
        <Button
          title={action.title}
          onPress={action.onPress}
          accessibilityLabel={action.accessibilityLabel ?? action.title}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 12,
  },
  title: {
    marginTop: 4,
  },
  message: {
    textAlign: 'center',
    opacity: 0.7,
  },
});

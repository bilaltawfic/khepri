import { StyleSheet, ScrollView, View, Pressable } from 'react-native';
import { useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';

import { ScreenContainer } from '@/components/ScreenContainer';
import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';

type MenuItemProps = {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  subtitle?: string;
  colorScheme: 'light' | 'dark';
  onPress?: () => void;
};

function MenuItem({
  icon,
  title,
  subtitle,
  colorScheme,
  onPress,
}: MenuItemProps) {
  return (
    <Pressable
      style={[styles.menuItem, { backgroundColor: Colors[colorScheme].surface }]}
      onPress={onPress}
    >
      <View
        style={[
          styles.menuIcon,
          { backgroundColor: Colors[colorScheme].surfaceVariant },
        ]}
      >
        <Ionicons name={icon} size={22} color={Colors[colorScheme].primary} />
      </View>
      <View style={styles.menuContent}>
        <ThemedText type="defaultSemiBold">{title}</ThemedText>
        {subtitle && (
          <ThemedText type="caption" style={styles.menuSubtitle}>
            {subtitle}
          </ThemedText>
        )}
      </View>
      <Ionicons
        name="chevron-forward"
        size={20}
        color={Colors[colorScheme].iconSecondary}
      />
    </Pressable>
  );
}

export default function ProfileScreen() {
  const colorScheme = useColorScheme() ?? 'light';

  return (
    <ScreenContainer>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View
            style={[
              styles.avatar,
              { backgroundColor: Colors[colorScheme].primary },
            ]}
          >
            <ThemedText
              style={[styles.avatarText, { color: Colors[colorScheme].textInverse }]}
            >
              K
            </ThemedText>
          </View>
          <ThemedText type="title" style={styles.userName}>
            Athlete
          </ThemedText>
          <ThemedText type="caption">Set up your profile to personalize training</ThemedText>
        </View>

        {/* Profile Settings Section */}
        <View style={styles.section}>
          <ThemedText type="caption" style={styles.sectionTitle}>
            PROFILE
          </ThemedText>
          <View style={styles.menuGroup}>
            <MenuItem
              icon="person-outline"
              title="Personal Info"
              subtitle="Name, weight, age, units"
              colorScheme={colorScheme}
            />
            <MenuItem
              icon="fitness-outline"
              title="Fitness Numbers"
              subtitle="FTP, threshold pace, zones"
              colorScheme={colorScheme}
            />
            <MenuItem
              icon="flag-outline"
              title="Goals"
              subtitle="Races and performance targets"
              colorScheme={colorScheme}
            />
          </View>
        </View>

        {/* Connections Section */}
        <View style={styles.section}>
          <ThemedText type="caption" style={styles.sectionTitle}>
            CONNECTIONS
          </ThemedText>
          <View style={styles.menuGroup}>
            <MenuItem
              icon="link-outline"
              title="Intervals.icu"
              subtitle="Not connected"
              colorScheme={colorScheme}
            />
          </View>
        </View>

        {/* Preferences Section */}
        <View style={styles.section}>
          <ThemedText type="caption" style={styles.sectionTitle}>
            PREFERENCES
          </ThemedText>
          <View style={styles.menuGroup}>
            <MenuItem
              icon="notifications-outline"
              title="Notifications"
              subtitle="Daily check-in reminders"
              colorScheme={colorScheme}
            />
            <MenuItem
              icon="moon-outline"
              title="Appearance"
              subtitle="System default"
              colorScheme={colorScheme}
            />
            <MenuItem
              icon="calendar-outline"
              title="Training Plan"
              subtitle="No active plan"
              colorScheme={colorScheme}
            />
          </View>
        </View>

        {/* Support Section */}
        <View style={styles.section}>
          <ThemedText type="caption" style={styles.sectionTitle}>
            SUPPORT
          </ThemedText>
          <View style={styles.menuGroup}>
            <MenuItem
              icon="help-circle-outline"
              title="Help & FAQ"
              colorScheme={colorScheme}
            />
            <MenuItem
              icon="document-text-outline"
              title="Privacy Policy"
              colorScheme={colorScheme}
            />
            <MenuItem
              icon="information-circle-outline"
              title="About"
              subtitle="Khepri v0.1.0"
              colorScheme={colorScheme}
            />
          </View>
        </View>

        {/* Onboarding Button (for testing) */}
        <Link href="/onboarding" asChild>
          <Pressable
            style={[
              styles.onboardingButton,
              { borderColor: Colors[colorScheme].primary },
            ]}
          >
            <ThemedText
              style={[
                styles.onboardingButtonText,
                { color: Colors[colorScheme].primary },
              ]}
            >
              Run Onboarding Flow
            </ThemedText>
          </Pressable>
        </Link>

        <ThemedText type="caption" style={styles.footerText}>
          Built with AI transparency - view the source at github.com/bilaltawfic/khepri
        </ThemedText>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 16,
    paddingBottom: 32,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  userName: {
    marginBottom: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    marginBottom: 8,
    paddingLeft: 4,
    fontWeight: '600',
  },
  menuGroup: {
    gap: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuContent: {
    flex: 1,
  },
  menuSubtitle: {
    marginTop: 2,
  },
  onboardingButton: {
    borderWidth: 2,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  onboardingButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  footerText: {
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});
